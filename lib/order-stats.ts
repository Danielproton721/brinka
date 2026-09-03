// Séries diárias de pedidos, pro painel cruzar VENDA com ACESSO.
//
// Por que contadores separados em vez de contar `orders:index` na hora:
// o índice de pedidos é podado em 7 dias e o snapshot de cada pedido expira em
// 48h (lib/orders.ts). O gráfico de visitantes vai a 45 dias. Sem uma série
// própria, qualquer período acima de uma semana mostraria visitantes sem as
// vendas correspondentes — pior que não mostrar nada, porque parece queda real.
//
// Desenho igual ao de presence.ts: 1 comando por evento (INCRBY), chave por dia
// no fuso BR, EXPIRE de 45 dias pra não acumular lixo, e degradação graciosa
// sem KV (tudo zero, nada quebra).

import { kvConfigured, kvIncrBy, kvExpire, kvMGetNumbers, kvSetNx } from "./kv-store"
import { dayKey, MAX_HISTORY_DAYS } from "./presence"

const DAILY_TTL_S = MAX_HISTORY_DAYS * 24 * 60 * 60

const createdKey = (dia: string) => `orders:created:${dia}`
const paidKey = (dia: string) => `orders:paid:${dia}`
const revenueKey = (dia: string) => `orders:revenue:${dia}` // em centavos
// Trava por txid: webhook e polling chamam markOrderPaid mais de uma vez pro
// mesmo pedido. Sem isto, uma venda contaria 2x ou 3x no gráfico.
const countedKey = (txid: string) => `orders:counted:${txid}`

export type OrdersDay = {
  date: string
  created: number
  paid: number
  revenueCents: number
}

// --- Escrita ---------------------------------------------------------------

// Um PIX/cartão foi gerado — pedido entra como pendente.
export async function recordOrderCreated(nowMs: number): Promise<void> {
  if (!kvConfigured()) return
  const k = createdKey(dayKey(nowMs))
  await kvIncrBy(k, 1)
  await kvExpire(k, DAILY_TTL_S)
}

// Pagamento confirmado. Idempotente: só conta na PRIMEIRA confirmação do txid.
// `amountCents` entra na receita do dia; 0/ausente só incrementa a contagem.
export async function recordOrderPaid(
  txid: string,
  nowMs: number,
  amountCents = 0,
): Promise<void> {
  if (!kvConfigured() || !txid) return
  const primeira = await kvSetNx(countedKey(txid), "1", DAILY_TTL_S)
  if (!primeira) return

  const dia = dayKey(nowMs)
  const kp = paidKey(dia)
  await kvIncrBy(kp, 1)
  await kvExpire(kp, DAILY_TTL_S)

  if (amountCents > 0) {
    const kr = revenueKey(dia)
    await kvIncrBy(kr, Math.round(amountCents))
    await kvExpire(kr, DAILY_TTL_S)
  }
}

// --- Leitura ---------------------------------------------------------------

// Séries dos dias pedidos (mesma lista de datas que o relatório de visitantes,
// pra os dois gráficos ficarem alinhados dia a dia). 3 comandos no total.
export async function ordersByDay(dates: string[]): Promise<OrdersDay[]> {
  if (!kvConfigured() || dates.length === 0) {
    return dates.map((date) => ({ date, created: 0, paid: 0, revenueCents: 0 }))
  }
  const [criados, pagos, receitas] = await Promise.all([
    kvMGetNumbers(dates.map(createdKey)),
    kvMGetNumbers(dates.map(paidKey)),
    kvMGetNumbers(dates.map(revenueKey)),
  ])
  return dates.map((date, i) => ({
    date,
    created: criados[i] ?? 0,
    paid: pagos[i] ?? 0,
    revenueCents: receitas[i] ?? 0,
  }))
}
