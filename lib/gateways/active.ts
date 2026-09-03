// Qual gateway de pagamento está ativo agora (escolhido no /admin).
// Guardado no KV (Upstash) pra valer pra todos na hora, sem novo deploy.
// Sem KV configurado, cai no padrão (Pagou.ai) — o fluxo atual nunca quebra.

import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv-store"

export type GatewayId = "pagou" | "medusa" | "centurion"

export const GATEWAYS: { id: GatewayId; label: string }[] = [
  { id: "pagou", label: "Pagou.ai" },
  { id: "medusa", label: "MedusaPay" },
  { id: "centurion", label: "CenturionPay" },
]

const KEY = "active-gateway"
const DEFAULT: GatewayId = "pagou"
// ~1 ano: na prática permanente; só muda quando o admin troca.
const TTL = 60 * 60 * 24 * 365

export function isGatewayId(v: unknown): v is GatewayId {
  return v === "pagou" || v === "medusa" || v === "centurion"
}

export async function getActiveGateway(): Promise<GatewayId> {
  if (!kvConfigured()) return DEFAULT
  try {
    const v = await kvGetJSON<GatewayId>(KEY)
    return isGatewayId(v) ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

export async function setActiveGateway(id: GatewayId): Promise<void> {
  await kvSetJSON(KEY, id, TTL)
}

// Qual gateway criou uma transação específica (txid) — pra consultar status /
// processar webhook no provider certo mesmo se o admin trocar de gateway depois.
const txKey = (txid: string) => `gw:${txid}`
const TX_TTL = 60 * 60 * 24 * 3 // 3 dias

export async function markTxGateway(txid: string, id: GatewayId): Promise<void> {
  if (!kvConfigured()) return
  try {
    await kvSetJSON(txKey(txid), id, TX_TTL)
  } catch {
    // best effort
  }
}

export async function getTxGateway(txid: string): Promise<GatewayId | null> {
  if (!kvConfigured()) return null
  try {
    const v = await kvGetJSON<GatewayId>(txKey(txid))
    return isGatewayId(v) ? v : null
  } catch {
    return null
  }
}
