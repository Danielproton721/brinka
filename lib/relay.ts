// ============================================================================
//  RELAY HUB — esta loja serve de FACHADA pra outras lojas.
//
//  Cada loja conectada tem uma CHAVE própria. O gateway chama
//  /api/webhooks/payment/<chave> (domínio desta loja) e o hub repassa pro
//  webhook real daquela loja, que fica oculta. Cada evento que passa é logado
//  pra o painel /admin mostrar o que está indo e voltando.
//
//  Guardado no KV:
//   • relay:targets  → { [chave]: RelayTarget }   (as lojas conectadas)
//   • relay:log      → sorted set de eventos por timestamp (histórico recente)
// ============================================================================

import { randomBytes } from "crypto"
// KV do relay: usa um banco Upstash SEPARADO quando RELAY_KV_* está definido,
// senão cai no KV principal (ver lib/relay-kv.ts). Isola o consumo do relay do
// Upstash do e-mail/PIX.
import {
  kvConfigured,
  kvDel,
  kvGetJSON,
  kvSetJSON,
  kvSetNx,
  kvZAdd,
  kvZRevRange,
  kvZRemRangeByScore,
} from "./relay-kv"

export { kvConfigured }

const TARGETS_KEY = "relay:targets"
const LOG_KEY = "relay:log"
const GLOBAL_SECRET_KEY = "relay:global-secret"
const LOG_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7 // guarda 7 dias de histórico

// Segredo único do relay: definido no PAINEL (guardado no KV), sem env. Se
// existir, é o x-relay-secret usado pra TODAS as lojas. A env
// RELAY_FORWARD_SECRET continua funcionando como override, mas é opcional.
export async function getGlobalSecret(): Promise<string> {
  const fromEnv = (process.env.RELAY_FORWARD_SECRET || "").trim()
  if (fromEnv) return fromEnv
  if (!kvConfigured()) return ""
  return ((await kvGetJSON<string>(GLOBAL_SECRET_KEY)) ?? "").trim()
}

export async function setGlobalSecret(value: string): Promise<void> {
  if (!kvConfigured()) throw new Error("KV (Upstash) não configurado.")
  await kvSetJSON(GLOBAL_SECRET_KEY, (value || "").trim())
}

export type RelayTarget = {
  key: string
  name: string
  url: string // webhook de destino da loja de trás
  secret: string // enviado no header x-relay-secret pra loja validar
  createdAt: string
}

export type RelayEvent = {
  id: string
  ts: number
  key: string
  name: string
  event?: string
  status?: string
  txid?: string
  amount?: number
  forwarded: boolean
  forwardStatus?: number
  error?: string
  payload?: string // corpo cru recebido do gateway (truncado)
  response?: string // resposta da loja de trás (truncada)
}

// --- Lojas conectadas (targets) --------------------------------------------
export async function getTargets(): Promise<Record<string, RelayTarget>> {
  if (!kvConfigured()) return {}
  return (await kvGetJSON<Record<string, RelayTarget>>(TARGETS_KEY)) ?? {}
}

export async function getTarget(key: string): Promise<RelayTarget | null> {
  if (!key) return null
  const targets = await getTargets()
  return targets[key] ?? null
}

// url/key/secret são opcionais:
//  • sem key/secret → gera novos (loja nova).
//  • com key/secret → "restaura" uma loja com a MESMA chave/segredo que a loja
//    de trás já usa (ex.: depois de trocar de banco KV). Assim não precisa
//    reconfigurar a loja de trás.
export async function addTarget(
  name: string,
  url = "",
  key?: string,
  secret?: string,
): Promise<RelayTarget> {
  if (!kvConfigured()) throw new Error("KV (Upstash) não configurado.")
  const targets = await getTargets()
  const cleanKey = (key || "").trim().replace(/[^a-zA-Z0-9_-]/g, "")
  const finalKey = cleanKey || randomBytes(6).toString("hex") // identificador na URL
  const finalSecret = (secret || "").trim() || randomBytes(24).toString("base64url")
  const target: RelayTarget = {
    key: finalKey,
    name: (name || "").trim() || finalKey,
    url: (url || "").trim(),
    secret: finalSecret,
    createdAt: new Date().toISOString(),
  }
  targets[finalKey] = target
  await kvSetJSON(TARGETS_KEY, targets)
  return target
}

// Edita apelido e/ou webhook de destino de uma loja já conectada.
export async function updateTarget(
  key: string,
  patch: { name?: string; url?: string },
): Promise<RelayTarget | null> {
  if (!kvConfigured() || !key) return null
  const targets = await getTargets()
  const current = targets[key]
  if (!current) return null
  if (patch.name !== undefined) current.name = patch.name.trim() || current.key
  if (patch.url !== undefined) current.url = patch.url.trim()
  targets[key] = current
  await kvSetJSON(TARGETS_KEY, targets)
  return current
}

export async function removeTarget(key: string): Promise<void> {
  if (!kvConfigured() || !key) return
  const targets = await getTargets()
  if (targets[key]) {
    delete targets[key]
    await kvSetJSON(TARGETS_KEY, targets)
  }
}

// --- Log de eventos ---------------------------------------------------------
export async function logEvent(entry: Omit<RelayEvent, "id" | "ts"> & { ts?: number }): Promise<void> {
  if (!kvConfigured()) return
  const ts = entry.ts ?? Date.now()
  try {
    // De-DUP: o gateway re-tenta o mesmo webhook várias vezes (ainda mais quando
    // dá erro tipo 401), e sem isso cada re-tentativa gravava na KV e queimava
    // comandos. Só grava o PRIMEIRO evento com essa combinação (loja+txid+status
    // +resultado); repetições dentro de 1h são ignoradas.
    const dedupKey = `relaylog:seen:${entry.key}:${entry.txid ?? "?"}:${entry.status ?? "?"}:${entry.forwardStatus ?? (entry.forwarded ? "ok" : "err")}`
    const fresh = await kvSetNx(dedupKey, "1", 3600)
    if (!fresh) return // re-tentativa idêntica — não gasta a KV

    const id = `${ts}-${randomBytes(4).toString("hex")}`
    await kvZAdd(LOG_KEY, ts, JSON.stringify({ ...entry, id, ts }))
    // Poda só de vez em quando (não a cada evento) pra economizar comandos.
    if (ts % 20 === 0) await kvZRemRangeByScore(LOG_KEY, 0, ts - LOG_MAX_AGE_MS)
  } catch {
    // log é best-effort — nunca derruba o repasse do webhook.
  }
}

export async function clearLog(): Promise<void> {
  if (!kvConfigured()) return
  await kvDel(LOG_KEY)
}

export async function getLog(limit = 60): Promise<RelayEvent[]> {
  if (!kvConfigured()) return []
  const raw = await kvZRevRange(LOG_KEY, 0, limit - 1)
  const out: RelayEvent[] = []
  for (const r of raw) {
    try {
      out.push(JSON.parse(r) as RelayEvent)
    } catch {
      // ignora entradas corrompidas
    }
  }
  return out
}

// Extrai infos úteis do payload do gateway pra exibir no log (tolerante a formato).
export function summarizePayload(body: string): Pick<RelayEvent, "event" | "status" | "txid" | "amount"> {
  try {
    const p = JSON.parse(body)
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = k.split(".").reduce((c: any, part) => c?.[part], p)
        if (v !== undefined && v !== null && v !== "") return v
      }
      return undefined
    }
    return {
      event: pick("event", "type", "action"),
      status: pick("status", "data.status", "transaction.status"),
      txid: pick("transactionId", "data.transactionId", "data.id", "transaction.id", "id"),
      amount: Number(pick("amount", "data.amount", "transaction.amount")) || undefined,
    }
  } catch {
    return {}
  }
}
