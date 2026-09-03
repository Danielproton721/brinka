// Presença "ao vivo" + visitantes únicos por dia. Desenhado pra gastar o MÍNIMO
// de comandos do Upstash (KV Free):
//
//  - Ao vivo: sorted set (score = timestamp). Cada visitante manda um heartbeat
//    (só 1 ZADD por ping). "Online" = quem pingou nos últimos WINDOW_MS. A poda
//    dos ausentes acontece na LEITURA (countOnline), não em todo heartbeat.
//  - Únicos/dia: HyperLogLog (PFADD/PFCOUNT). O client chama recordDailyVisit
//    UMA vez por navegador por dia (trava no localStorage) → ~1 comando por
//    visitante único por dia. Memória fixa e barata; expira em 45 dias.
//
// Sem KV configurado, tudo degrada gracioso (conta 0 / histórico vazio).

import {
  kvConfigured,
  kvZAdd,
  kvZCard,
  kvZRemRangeByScore,
  kvPfAdd,
  kvPfCount,
  kvPfCountUnion,
  kvExpire,
} from "./kv-store"

const KEY = "presence:online"
// Janela de presença: considera online quem pingou nos últimos 90s.
const WINDOW_MS = 90_000

// Dia no fuso do Brasil (UTC-3, sem horário de verão desde 2019).
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000
export function dayKey(nowMs: number): string {
  return new Date(nowMs - BRT_OFFSET_MS).toISOString().slice(0, 10)
}
const visitorsKey = (day: string) => `visitors:${day}`
// Mantém ~45 dias de histórico e some sozinho (não acumula lixo no KV).
const DAILY_TTL_S = 45 * 24 * 60 * 60

// Heartbeat do visitante ao vivo — só 1 ZADD (a poda é na leitura).
export async function recordHeartbeat(id: string, nowMs: number): Promise<void> {
  if (!kvConfigured() || !id) return
  await kvZAdd(KEY, nowMs, id)
}

// Marca 1 visita única do dia (HLL). Chamado 1x por navegador por dia.
export async function recordDailyVisit(id: string, nowMs: number): Promise<void> {
  if (!kvConfigured() || !id) return
  const key = visitorsKey(dayKey(nowMs))
  await kvPfAdd(key, id)
  await kvExpire(key, DAILY_TTL_S)
}

export async function countOnline(nowMs: number): Promise<number> {
  if (!kvConfigured()) return 0
  await kvZRemRangeByScore(KEY, 0, nowMs - WINDOW_MS)
  return kvZCard(KEY)
}

// Visitantes únicos de hoje (aproximado via HLL).
export async function countToday(nowMs: number): Promise<number> {
  if (!kvConfigured()) return 0
  return kvPfCount(visitorsKey(dayKey(nowMs)))
}

// Histórico dos últimos `days` dias (mais antigo → mais recente).
export async function dailyHistory(
  nowMs: number,
  days: number,
): Promise<{ date: string; count: number }[]> {
  if (!kvConfigured()) return []
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(nowMs - i * 24 * 60 * 60 * 1000)
    const count = await kvPfCount(visitorsKey(day))
    out.push({ date: day, count })
  }
  return out
}

// Retenção máxima do histórico (alinhada ao EXPIRE das chaves diárias).
export const MAX_HISTORY_DAYS = 45

// Lista os dias (YYYY-MM-DD, fuso BR) entre `from` e `to` inclusive, cortada à
// janela de retenção. Aceita as datas em qualquer ordem.
function daysBetween(from: string, to: string, nowMs: number): string[] {
  const oldest = dayKey(nowMs - (MAX_HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000)
  const today = dayKey(nowMs)
  let a = from < to ? from : to
  let b = from < to ? to : from
  if (a < oldest) a = oldest
  if (b > today) b = today
  const out: string[] = []
  // Itera por data ISO usando UTC pra não escorregar no fuso local.
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  if (!ay || !by) return out
  let cur = Date.UTC(ay, am - 1, ad)
  const end = Date.UTC(by, bm - 1, bd)
  const DAY = 24 * 60 * 60 * 1000
  while (cur <= end && out.length <= MAX_HISTORY_DAYS) {
    out.push(new Date(cur).toISOString().slice(0, 10))
    cur += DAY
  }
  return out
}

// Gera as N chaves diárias imediatamente ANTES de `fromISO` (mesma duração),
// pra comparar o período com o anterior. Não corta na retenção — chaves fora
// da janela simplesmente não existem no KV (contam 0).
function prevKeys(fromISO: string, nDays: number): string[] {
  const [y, m, d] = fromISO.split("-").map(Number)
  if (!y || nDays <= 0) return []
  const DAY = 24 * 60 * 60 * 1000
  const start = Date.UTC(y, m - 1, d) - nDays * DAY // primeiro dia do período anterior
  const out: string[] = []
  for (let i = 0; i < nDays; i++) {
    out.push(visitorsKey(new Date(start + i * DAY).toISOString().slice(0, 10)))
  }
  return out
}

// Relatório de um intervalo: breakdown por dia (N comandos) + total de únicos do
// período (1 comando, união dos HLLs — pessoa que voltou em vários dias conta 1x)
// + total do período anterior de mesma duração (1 comando, pra variação %).
export async function rangeReport(
  from: string,
  to: string,
  nowMs: number,
): Promise<{ days: { date: string; count: number }[]; total: number; prevTotal: number }> {
  if (!kvConfigured()) return { days: [], total: 0, prevTotal: 0 }
  const dates = daysBetween(from, to, nowMs)
  const keys = dates.map(visitorsKey)
  const counts = await Promise.all(keys.map((k) => kvPfCount(k)))
  const days = dates.map((date, i) => ({ date, count: counts[i] }))
  const [total, prevTotal] = await Promise.all([
    kvPfCountUnion(keys),
    kvPfCountUnion(prevKeys(dates[0] ?? from, dates.length)),
  ])
  return { days, total, prevTotal }
}
