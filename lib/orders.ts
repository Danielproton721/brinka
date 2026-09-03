// Leitura de pedidos pro painel /admin.
//
// CONTRATO: o checkout desta loja já persiste o pedido completo em
// `order:${txid}` (lib/order-store.ts → saveOrder) no momento em que o PIX é
// criado. O painel apenas:
//   • LÊ esses pedidos (mesma chave `order:${txid}`);
//   • mantém um índice por data (`orders:index`) pra listar os mais recentes;
//   • marca quais txids foram pagos (`paid:${txid}`).
//
// Por isso NÃO existe um `saveOrderSnapshot` aqui — quem grava o snapshot é o
// checkout. O painel só precisa de `indexOrder` (no pix/create) e
// `markOrderPaid` (no webhook). Tudo degrada gracioso sem KV.

import {
  kvConfigured,
  kvGetJSON,
  kvSetJSON,
  kvZAdd,
  kvZRevRange,
  kvZRemRangeByScore,
} from "./kv-store"
import type { StoredOrder } from "./order-store"
import { getTxGateway } from "./gateways/active"
import { recordOrderCreated, recordOrderPaid } from "./order-stats"

export { kvConfigured }

// O que o painel exibe — o pedido salvo pelo checkout + status calculado.
export type AdminOrder = StoredOrder & {
  status: "pago" | "aguardando" | "abandonado"
  gateway?: string
  proofUrl?: string
}

// Sem confirmação por esse tempo (min) = consideramos abandonado.
const ABANDONED_AFTER_MIN = 30
// TTL da marca de "pago" — alinhado com a janela do pedido (48h) no order-store.
const PAID_TTL_SECONDS = 60 * 60 * 48
// Poda do índice: ignora/limpa pedidos com mais de 7 dias.
const INDEX_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

const orderKey = (txid: string) => `order:${txid}`
const paidKey = (txid: string) => `paid:${txid}`
const ORDERS_INDEX = "orders:index"

// --- Escrita (chamada pelo CHECKOUT, não pelo painel) ----------------------

// Indexa o pedido por data pro painel listá-lo. O snapshot em si já foi gravado
// pelo checkout via lib/order-store → saveOrder.
export async function indexOrder(txid: string, createdAtMs: number): Promise<void> {
  if (!kvConfigured() || !txid) return
  await kvZAdd(ORDERS_INDEX, createdAtMs, txid)
  // Série diária pro painel: sobrevive à poda do índice (7d) e ao TTL do
  // snapshot (48h), então o gráfico de 45 dias não fica com buraco.
  await recordOrderCreated(createdAtMs).catch(() => {})
}

export async function markOrderPaid(txid: string): Promise<void> {
  if (!kvConfigured() || !txid) return
  await kvSetJSON(paidKey(txid), 1, PAID_TTL_SECONDS)
  // Conta a venda do dia. O `total` do pedido está em REAIS → centavos.
  // recordOrderPaid é idempotente por txid: webhook e polling chamam esta
  // função pro mesmo pedido e a venda não pode contar duas vezes.
  try {
    const order = await kvGetJSON<StoredOrder>(orderKey(txid))
    const reais = Number(order?.total) || 0
    await recordOrderPaid(txid, Date.now(), Math.round(reais * 100))
  } catch {
    // estatística nunca derruba a confirmação de pagamento
  }
}

export async function isOrderPaid(txid: string): Promise<boolean> {
  if (!kvConfigured()) return false
  return (await kvGetJSON(paidKey(txid))) != null
}

// Comprovante (opcional) — anexa uma URL ao pedido já salvo.
export async function setOrderProofUrl(txid: string, proofUrl: string): Promise<void> {
  if (!kvConfigured()) return
  const order = await kvGetJSON<StoredOrder & { proofUrl?: string }>(orderKey(txid))
  if (!order) return
  order.proofUrl = proofUrl
  await kvSetJSON(orderKey(txid), order, PAID_TTL_SECONDS)
}

// --- Leitura (chamada pelo PAINEL) -----------------------------------------

export async function listRecentOrders(limit = 100): Promise<AdminOrder[]> {
  if (!kvConfigured()) return []

  // Limpa entradas antigas do índice (mantém a listagem enxuta).
  await kvZRemRangeByScore(ORDERS_INDEX, 0, Date.now() - INDEX_MAX_AGE_MS)

  const txids = await kvZRevRange(ORDERS_INDEX, 0, limit - 1)
  const out: AdminOrder[] = []
  for (const txid of txids) {
    const order = await kvGetJSON<StoredOrder>(orderKey(txid))
    if (!order) continue // expirou (TTL 48h) — ignora a entrada órfã do índice
    const paid = await isOrderPaid(txid)
    let status: AdminOrder["status"]
    if (paid) {
      status = "pago"
    } else {
      const createdMs = order.createdAt ? Date.parse(order.createdAt) : 0
      const ageMin = createdMs ? (Date.now() - createdMs) / 60000 : Infinity
      status = ageMin >= ABANDONED_AFTER_MIN ? "abandonado" : "aguardando"
    }
    // Qual gateway processou este pedido (pagou/medusa/centurion) — pro painel
    // deixar claro pra onde cada pagamento foi de fato.
    const gateway = (await getTxGateway(txid)) ?? undefined
    out.push({ ...order, txid, status, gateway })
  }
  return out
}
