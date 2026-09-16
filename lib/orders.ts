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
  kvDel,
  kvGet,
  kvGetJSON,
  kvPersist,
  kvSet,
  kvSetJSON,
  kvZAdd,
  kvZRem,
  kvZRevRange,
} from "./kv-store"
import type { StoredOrder } from "./order-store"
import { getTxGateway } from "./gateways/active"
import {
  abandonManualKey,
  abandonSentKey,
  confirmacaoAutoKey,
  getEmailManualEm,
  getEmailsPagoEm,
  pagoManualKey,
} from "./manual-email"
import { recordOrderCreated, recordOrderPaid } from "./order-stats"

export { kvConfigured }

// O que o painel exibe — o pedido salvo pelo checkout + status calculado.
export type AdminOrder = StoredOrder & {
  status: "pago" | "aguardando" | "abandonado"
  gateway?: string
  proofUrl?: string
  // Último envio manual pelo painel: "pedido pendente" se não pago,
  // "pagamento confirmado" se pago.
  emailManualEm?: string | null
  // Só pedido pago: hora do e-mail automático de confirmação (webhook).
  emailConfirmacaoEm?: string | null
}

// Sem confirmação por esse tempo (min) = consideramos abandonado.
const ABANDONED_AFTER_MIN = 30
// Pedidos são PERMANENTES: pedido, marca de pago e índice não têm prazo de
// validade. Só saem quando alguém apaga pelo painel (deleteOrder).

const orderKey = (txid: string) => `order:${txid}`
const paidKey = (txid: string) => `paid:${txid}`
const ORDERS_INDEX = "orders:index"

// Tudo que pertence a um pedido no KV — usado pra tornar permanente e pra apagar.
const chavesDoPedido = (txid: string) => [
  orderKey(txid),
  paidKey(txid),
  confirmacaoAutoKey(txid),
  abandonManualKey(txid),
  pagoManualKey(txid),
]

// --- Escrita (chamada pelo CHECKOUT, não pelo painel) ----------------------

// Indexa o pedido por data pro painel listá-lo. O snapshot em si já foi gravado
// pelo checkout via lib/order-store → saveOrder.
export async function indexOrder(txid: string, createdAtMs: number): Promise<void> {
  if (!kvConfigured() || !txid) return
  await kvZAdd(ORDERS_INDEX, createdAtMs, txid)
  // Série diária pro gráfico de 45 dias: 1 comando por evento, sem precisar
  // ler todos os pedidos do período.
  await recordOrderCreated(createdAtMs).catch(() => {})
}

export async function markOrderPaid(txid: string): Promise<void> {
  if (!kvConfigured() || !txid) return
  await kvSetJSON(paidKey(txid), 1)
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
  await kvSetJSON(orderKey(txid), order)
}

// --- Permanência e exclusão ------------------------------------------------

// Pedidos gravados antes desta mudança ainda carregam o prazo antigo (48h). Na
// primeira leitura do painel depois do deploy, tira o prazo de todos os que
// estão no índice. Roda uma vez (marca abaixo); se falhar no meio, a próxima
// leitura tenta de novo.
const MARCA_PERMANENTE = "orders:permanente:v1"

async function tornarPedidosPermanentes(): Promise<void> {
  if (await kvGet(MARCA_PERMANENTE)) return
  const txids = await kvZRevRange(ORDERS_INDEX, 0, -1)
  for (const txid of txids) {
    await Promise.all(chavesDoPedido(txid).map((k) => kvPersist(k)))
  }
  await kvSet(MARCA_PERMANENTE, new Date().toISOString())
}

// Apaga o pedido de vez — só pelo painel, por escolha do dono. As séries
// diárias do gráfico (lib/order-stats.ts) não mudam: a venda do dia continua contada.
export async function deleteOrder(txid: string): Promise<boolean> {
  if (!kvConfigured() || !txid) return false
  const existia = (await kvGet(orderKey(txid))) != null
  await Promise.all([...chavesDoPedido(txid), abandonSentKey(txid), `status:${txid}`].map((k) => kvDel(k)))
  await kvZRem(ORDERS_INDEX, txid)
  return existia
}

// --- Leitura (chamada pelo PAINEL) -----------------------------------------

// Sem poda: o índice guarda todos os pedidos. O painel lista os `limit` mais
// recentes; os mais antigos continuam guardados no KV.
export async function listRecentOrders(limit = 100): Promise<AdminOrder[]> {
  if (!kvConfigured()) return []

  await tornarPedidosPermanentes().catch((e) => console.error("[ORDERS] falha ao tornar pedidos permanentes:", e))

  const txids = await kvZRevRange(ORDERS_INDEX, 0, limit - 1)
  const out: AdminOrder[] = []
  for (const txid of txids) {
    const order = await kvGetJSON<StoredOrder>(orderKey(txid))
    if (!order) continue // gravado antes de virar permanente e já tinha expirado
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
    // deixar claro pra onde cada pagamento foi de fato. A marca por txid expira
    // em 3 dias; na primeira leitura ela é copiada pro pedido, que é permanente.
    let gateway = order.gateway
    if (!gateway) {
      gateway = (await getTxGateway(txid)) ?? undefined
      if (gateway) await kvSetJSON(orderKey(txid), { ...order, gateway }).catch(() => {})
    }
    let emailManualEm: string | null = null
    let emailConfirmacaoEm: string | null = null
    if (paid) {
      const emails = await getEmailsPagoEm(txid)
      emailManualEm = emails.manualEm
      emailConfirmacaoEm = emails.automaticoEm
    } else {
      emailManualEm = await getEmailManualEm(txid)
    }
    out.push({ ...order, txid, status, gateway, emailManualEm, emailConfirmacaoEm })
  }
  return out
}
