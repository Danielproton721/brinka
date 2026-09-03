// ============================================================================
//  KV DO RELAY — banco separado (opcional).
//
//  O relay (lojas conectadas + log de tráfego) pode usar um Upstash Redis
//  PRÓPRIO, isolado do KV do e-mail/PIX, pra não consumir o mesmo plano.
//
//   • Se RELAY_KV_REST_API_URL + RELAY_KV_REST_API_TOKEN estiverem definidos,
//     o relay usa ESSE banco (a conta nova).
//   • Senão, cai no KV principal (lib/kv-store) — comportamento atual, sem
//     precisar configurar nada.
//
//  Pra migrar: crie um Redis na conta nova do Upstash, copie a REST URL e o
//  REST TOKEN dele, e cole na Vercel da loja como RELAY_KV_REST_API_URL e
//  RELAY_KV_REST_API_TOKEN. Pronto — o relay passa a gravar lá.
// ============================================================================

import * as mainKv from "./kv-store"

// Limpa espaços e aspas acidentais (o Upstash mostra os valores entre aspas —
// se copiar com elas, a env fica com aspas literais e quebra).
const clean = (v?: string) => (v || "").trim().replace(/^["']+|["']+$/g, "")

const REST_URL = clean(process.env.RELAY_KV_REST_API_URL || process.env.RELAY_UPSTASH_REDIS_REST_URL)
const REST_TOKEN = clean(process.env.RELAY_KV_REST_API_TOKEN || process.env.RELAY_UPSTASH_REDIS_REST_TOKEN)

// Usa o banco separado só quando as duas envs do relay estão presentes.
const useSeparate = Boolean(REST_URL && REST_TOKEN)

// Diagnóstico pro painel: quais das duas envs chegaram (sem revelar valores).
export function relayKvDiag(): { urlSet: boolean; tokenSet: boolean } {
  return { urlSet: Boolean(REST_URL), tokenSet: Boolean(REST_TOKEN) }
}

async function command(args: (string | number)[]): Promise<any> {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`[relay-kv] comando falhou (${res.status}): ${text}`)
  }
  const data = await res.json().catch(() => null)
  return data?.result ?? null
}

export function kvConfigured(): boolean {
  return useSeparate ? true : mainKv.kvConfigured()
}

// true = relay usando o banco Upstash SEPARADO (RELAY_KV_*); false = caiu no
// KV principal (o mesmo do e-mail). Serve pro painel confirmar a migração.
export function usingSeparateKv(): boolean {
  return useSeparate
}

export async function kvGetJSON<T = unknown>(key: string): Promise<T | null> {
  if (!useSeparate) return mainKv.kvGetJSON<T>(key)
  const result = await command(["GET", key])
  if (result === null || result === undefined) return null
  try {
    return JSON.parse(typeof result === "string" ? result : String(result)) as T
  } catch {
    return null
  }
}

export async function kvSetJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!useSeparate) return mainKv.kvSetJSON(key, value, ttlSeconds)
  const args: (string | number)[] = ["SET", key, JSON.stringify(value)]
  if (ttlSeconds) args.push("EX", ttlSeconds)
  await command(args)
}

export async function kvZAdd(key: string, score: number, member: string): Promise<void> {
  if (!useSeparate) return mainKv.kvZAdd(key, score, member)
  await command(["ZADD", key, score, member])
}

export async function kvZRevRange(key: string, start: number, stop: number): Promise<string[]> {
  if (!useSeparate) return mainKv.kvZRevRange(key, start, stop)
  const res = await command(["ZREVRANGE", key, start, stop])
  return Array.isArray(res) ? res.map(String) : []
}

export async function kvZRemRangeByScore(key: string, min: number, max: number): Promise<number> {
  if (!useSeparate) return mainKv.kvZRemRangeByScore(key, min, max)
  const res = await command(["ZREMRANGEBYSCORE", key, min, max])
  return typeof res === "number" ? res : Number(res) || 0
}

export async function kvDel(key: string): Promise<void> {
  if (!useSeparate) return mainKv.kvDel(key)
  await command(["DEL", key])
}

// SET NX — grava só se a chave não existia. Retorna true se gravou (evento novo)
// ou false se já existia (duplicado). Usado pra de-duplicar o log.
export async function kvSetNx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  if (!useSeparate) return mainKv.kvSetNx(key, value, ttlSeconds)
  const args: (string | number)[] = ["SET", key, value, "NX"]
  if (ttlSeconds) args.push("EX", ttlSeconds)
  const res = await command(args)
  return res === "OK"
}
