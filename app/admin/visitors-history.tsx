"use client"

import { useEffect, useMemo, useState } from "react"
import { DayPicker, type DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { format, startOfMonth, subDays } from "date-fns"
import {
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock,
  Minus,
  Percent,
  TrendingDown,
  TrendingUp,
  Users,
  CalendarCheck,
  Wallet,
} from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import "react-day-picker/style.css"
import { OrdersBreakdown, type Breakdown } from "./orders-breakdown"

type Day = {
  date: string
  visitors: number
  created: number
  paid: number
  revenueCents: number
}
type OrdersSummary = {
  paid: number
  created: number
  revenueCents: number
  pendingNow: number
  abandonedNow: number
}
type Report = {
  days: Day[]
  total: number
  prevTotal: number
  orders: OrdersSummary
  breakdown?: Breakdown
}

const GOLD = "#b98a2e"
// Verde de "pago". Par GOLD↔GREEN validado (scripts/validate_palette.js):
// ΔE 20.0 normal / 8.6 protan — acima do piso, sem depender de encoding extra.
const GREEN = "#15803d"

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// Rótulo curto do eixo Y: 1000 → "1k". No mobile a calha do eixo é estreita e
// "1.000" era cortado no meio ("000"), o que lia como outro número.
const tickY = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v)

// Data local → "AAAA-MM-DD" (usa o que o usuário VÊ no calendário, sem conversão
// de fuso — loja e operador são BR, bate com o servidor).
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
// "2026-07-06" → "06/07"
function labelDay(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

const MAX_DAYS = 45

function buildPresets(today: Date) {
  const d = (n: number) => subDays(today, n)
  return [
    { key: "today", label: "Hoje", from: today, to: today },
    { key: "yesterday", label: "Ontem", from: d(1), to: d(1) },
    { key: "7", label: "Últimos 7 dias", from: d(6), to: today },
    { key: "14", label: "Últimos 14 dias", from: d(13), to: today },
    { key: "month", label: "Este mês", from: startOfMonth(today), to: today },
    { key: "30", label: "Últimos 30 dias", from: d(29), to: today },
    { key: "all", label: "Todo o período", from: d(MAX_DAYS - 1), to: today },
  ] as const
}

export function VisitorsHistory() {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])
  const presets = useMemo(() => buildPresets(today), [today])

  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange>({ from: presets[2].from, to: presets[2].to })
  const [presetKey, setPresetKey] = useState<string>("7")
  const [draft, setDraft] = useState<DateRange | undefined>(range)

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  // Bate em /api/admin/stats (autenticada), não em /api/presence: esta resposta
  // carrega venda e faturamento, e presence é rota pública.
  const fetchRange = (r: DateRange) => {
    if (!r.from || !r.to) return
    setLoading(true)
    fetch(`/api/admin/stats?from=${isoLocal(r.from)}&to=${isoLocal(r.to)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d?.days))
          setReport({
            days: d.days,
            total: Number(d.total) || 0,
            prevTotal: Number(d.prevTotal) || 0,
            orders: {
              paid: Number(d?.orders?.paid) || 0,
              created: Number(d?.orders?.created) || 0,
              revenueCents: Number(d?.orders?.revenueCents) || 0,
              pendingNow: Number(d?.orders?.pendingNow) || 0,
              abandonedNow: Number(d?.orders?.abandonedNow) || 0,
            },
            breakdown: d?.breakdown,
          })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPreset = (p: { key: string; from: Date; to: Date }) => {
    const r = { from: p.from, to: p.to }
    setRange(r)
    setDraft(r)
    setPresetKey(p.key)
    setOpen(false)
    fetchRange(r)
  }

  const applyDraft = () => {
    if (!draft?.from) return
    const r: DateRange = { from: draft.from, to: draft.to ?? draft.from }
    setRange(r)
    setPresetKey("custom")
    setOpen(false)
    fetchRange(r)
  }

  const triggerLabel = (() => {
    const p = presets.find((x) => x.key === presetKey)
    if (p) return p.label
    if (range.from && range.to) {
      const same = isoLocal(range.from) === isoLocal(range.to)
      return same
        ? format(range.from, "d 'de' MMM", { locale: ptBR })
        : `${format(range.from, "d MMM", { locale: ptBR })} – ${format(range.to, "d MMM", { locale: ptBR })}`
    }
    return "Selecionar período"
  })()

  // --- Métricas derivadas -------------------------------------------------
  const days = report?.days ?? []
  const total = report?.total ?? 0
  const nDays = Math.max(1, days.length)
  const avg = Math.round(days.reduce((s, d) => s + d.visitors, 0) / nDays)
  const peak = days.reduce<Day | null>((best, d) => (!best || d.visitors > best.visitors ? d : best), null)
  const prev = report?.prevTotal ?? 0
  const delta = prev > 0 ? Math.round(((total - prev) / prev) * 100) : null

  const orders = report?.orders
  const pagos = orders?.paid ?? 0
  const criados = orders?.created ?? 0
  // Conversão = pedidos PAGOS ÷ visitantes únicos do período. Denominador é o
  // total de únicos (não a soma dos dias), senão quem visita 2 dias conta 2x e
  // a taxa sai menor do que é.
  const conversao = total > 0 ? (pagos / total) * 100 : null
  // Quantos chegaram a gerar cobrança mas não pagaram — o vazamento do funil.
  const naoPagos = Math.max(0, criados - pagos)

  const chartData = days.map((d) => ({
    ...d,
    label: labelDay(d.date),
    conv: d.visitors > 0 ? (d.paid / d.visitors) * 100 : 0,
  }))
  const peakLabel = peak ? labelDay(peak.date) : null
  const houvePedido = days.some((d) => d.created > 0 || d.paid > 0)

  return (
    <>
    <div className="mb-3 rounded-xl border border-border bg-card p-4">
      {/* Cabeçalho + seletor de período */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Volume bruto</h2>
          {/* Número-herói: o faturamento é o que o operador procura primeiro.
              Os visitantes viram a linha de apoio embaixo, não o título. */}
          <div className="mt-0.5 text-3xl font-bold leading-none" style={{ color: GREEN }}>
            {loading ? "…" : brl(orders?.revenueCents ?? 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {triggerLabel.toLowerCase()} · {loading ? "…" : total.toLocaleString("pt-BR")} visitante(s)
          </p>
        </div>

        <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(range) }}>
          <Popover.Trigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {triggerLabel}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className="z-50 w-[min(92vw,560px)] rounded-xl border border-border bg-card p-0 shadow-xl outline-none"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="flex flex-row flex-wrap gap-1 border-b border-border p-2 sm:w-44 sm:flex-col sm:flex-nowrap sm:border-b-0 sm:border-r">
                  {presets.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(p)}
                      className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                        presetKey === p.key
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col p-3">
                  <DayPicker
                    mode="range"
                    locale={ptBR}
                    selected={draft}
                    onSelect={(r) => { setDraft(r); setPresetKey("custom") }}
                    disabled={{ before: subDays(today, MAX_DAYS - 1), after: today }}
                    className="rdp-fn"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                      Cancelar
                    </button>
                    <button onClick={applyDraft} disabled={!draft?.from} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {/* KPIs de ACESSO */}
      <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Total de visitantes"
          value={loading ? "…" : total.toLocaleString("pt-BR")}
          hint="únicos no período"
        />
        <Kpi
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Média por dia"
          value={loading ? "…" : avg.toLocaleString("pt-BR")}
          hint={`${nDays} dia(s)`}
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Melhor dia"
          value={loading || !peak ? "…" : peak.visitors.toLocaleString("pt-BR")}
          hint={peak ? labelDay(peak.date) : ""}
        />
        <DeltaKpi loading={loading} delta={delta} />
      </div>

      {/* KPIs de VENDA — o cruzamento com o acesso está na taxa de conversão */}
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Pedidos pagos"
          value={loading ? "…" : pagos.toLocaleString("pt-BR")}
          hint={criados > 0 ? `de ${criados.toLocaleString("pt-BR")} gerado(s)` : "no período"}
          accent={pagos > 0 ? GREEN : undefined}
        />
        <Kpi
          icon={<Percent className="h-4 w-4" />}
          label="Conversão"
          value={
            loading
              ? "…"
              : conversao === null
                ? "—"
                : `${conversao.toLocaleString("pt-BR", { minimumFractionDigits: conversao < 10 ? 1 : 0, maximumFractionDigits: conversao < 10 ? 1 : 0 })}%`
          }
          hint={conversao === null ? "sem visitantes" : "pagos ÷ visitantes"}
          accent={conversao && conversao > 0 ? GREEN : undefined}
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Aguardando agora"
          value={loading ? "…" : (orders?.pendingNow ?? 0).toLocaleString("pt-BR")}
          hint={
            (orders?.abandonedNow ?? 0) > 0
              ? `+${orders?.abandonedNow} abandonado(s)`
              : "PIX aberto, sem pagar"
          }
        />
        {/* Ticket médio, e não faturamento de novo: o total já é o número-herói
            lá em cima, repetir aqui gastaria um card sem dizer nada novo. */}
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="Ticket médio"
          value={loading ? "…" : pagos > 0 ? brl(Math.round((orders?.revenueCents ?? 0) / pagos)) : "—"}
          hint={naoPagos > 0 ? `${naoPagos} não fechou` : "por pedido pago"}
          accent={pagos > 0 ? GREEN : undefined}
        />
      </div>

      {/* Dois gráficos no MESMO eixo de dias, empilhados. Não é um gráfico de
          eixo duplo de propósito: visitante e pedido têm escalas muito
          diferentes (centenas x unidades) e sobrepor as duas curvas num só eixo
          achataria a de baixo até virar uma linha reta — parece "zero venda"
          quando não é. Alinhados verticalmente, o pico de acesso e o de venda
          continuam batendo na vertical, que é a leitura que interessa. */}
      <Trend chartData={chartData} loading={loading} peakLabel={peakLabel} peakValue={peak?.visitors ?? 0} />

      {houvePedido && <PaidByDay chartData={chartData} loading={loading} />}
      {!houvePedido && !loading && days.length > 0 && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
          Nenhum pedido gerado neste período — só a curva de acesso acima.
        </p>
      )}

      {/* Calendário casado com a marca (dourado) */}
      <style jsx global>{`
        .rdp-fn {
          --rdp-accent-color: ${GOLD};
          --rdp-accent-background-color: #f6eccf;
          --rdp-today-color: ${GOLD};
          --rdp-day-width: 34px;
          --rdp-day-height: 34px;
          --rdp-day_button-width: 34px;
          --rdp-day_button-height: 34px;
          margin: 0;
          font-size: 13px;
        }
      `}</style>
    </div>

    {/* Roscas de distribuição. Ficam FORA do card de cima porque olham uma
        janela diferente (índice vivo, 7 dias) — o próprio bloco diz isso. */}
    <OrdersBreakdown data={report?.breakdown} loading={loading} />
    </>
  )
}

function Kpi({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      {/* accent só colore o NÚMERO quando há valor; rótulo e dica ficam sempre
          em tinta de texto, pra identidade não depender de cor. */}
      <div className="text-2xl font-bold leading-tight" style={accent ? { color: accent } : undefined}>
        <span className={accent ? "" : "text-foreground"}>{value}</span>
      </div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function DeltaKpi({ loading, delta }: { loading: boolean; delta: number | null }) {
  const up = (delta ?? 0) > 0
  const down = (delta ?? 0) < 0
  const color = delta === null ? "text-muted-foreground" : up ? "text-emerald-600" : down ? "text-red-500" : "text-muted-foreground"
  const Icon = delta === null ? Minus : up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium">vs. período anterior</span>
      </div>
      <div className={`text-2xl font-bold leading-tight ${color}`}>
        {loading ? "…" : delta === null ? "—" : `${up ? "+" : ""}${delta}%`}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {delta === null ? "sem base anterior" : "mesma duração antes"}
      </div>
    </div>
  )
}

function Trend({
  chartData,
  loading,
  peakLabel,
  peakValue,
}: {
  chartData: { label: string; visitors: number; date: string }[]
  loading: boolean
  peakLabel: string | null
  peakValue: number
}) {
  if (loading && chartData.length === 0) return <div className="h-[190px] animate-pulse rounded-lg bg-muted" />
  if (chartData.length === 0) return <p className="text-sm text-muted-foreground">Sem dados no período.</p>

  const tickStep = Math.max(1, Math.ceil(chartData.length / 7))
  return (
    <div className="h-[190px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="fnGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" className="text-border" strokeOpacity={0.5} />
          {/* Mesmo padding do gráfico de pedidos abaixo — os dois eixos X
              precisam começar e terminar no mesmo x pra comparação vertical. */}
          <XAxis
            dataKey="label"
            padding={{ left: 16, right: 16 }}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={tickStep - 1}
            minTickGap={4}
          />
          <YAxis tickFormatter={tickY} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} width={38} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: GOLD, strokeOpacity: 0.4 }} />
          <Area type="monotone" dataKey="visitors" stroke={GOLD} strokeWidth={2} fill="url(#fnGold)" />
          {peakLabel && peakValue > 0 && (
            <ReferenceDot x={peakLabel} y={peakValue} r={4} fill={GOLD} stroke="#fff" strokeWidth={2} isFront />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Pedidos pagos por dia — mesmo eixo X da curva de acesso, logo abaixo dela.
function PaidByDay({
  chartData,
  loading,
}: {
  chartData: { label: string; paid: number; created: number; visitors: number; conv: number }[]
  loading: boolean
}) {
  if (loading && chartData.length === 0) return <div className="mt-2 h-[110px] animate-pulse rounded-lg bg-muted" />
  const tickStep = Math.max(1, Math.ceil(chartData.length / 7))
  const maxPago = chartData.reduce((m, d) => Math.max(m, d.paid), 0)

  return (
    <div className="mt-2 border-t border-border pt-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: GREEN }} aria-hidden />
        <span className="text-[11px] font-medium text-muted-foreground">Pedidos pagos por dia</span>
      </div>
      <div className="h-[110px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* AreaChart em degrau, e não BarChart, por um motivo de alinhamento:
              barra usa escala de BANDA e área usa escala de PONTO, então os dois
              eixos sairiam meia-banda fora de fase e a leitura vertical — o
              motivo de existirem dois gráficos — não fecharia. "stepAfter" não
              interpola entre dias, então continua honesto pra contagem discreta:
              cada patamar é um dia, sem inventar meio pedido no meio do caminho. */}
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="fnGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.32} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="currentColor" className="text-border" strokeOpacity={0.5} />
            <XAxis
              dataKey="label"
              padding={{ left: 16, right: 16 }}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval={tickStep - 1}
              minTickGap={4}
            />
            {/* width igual ao do gráfico de cima: é a calha do eixo Y que
                define onde a área de plotagem começa nos dois. */}
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={38}
              tickFormatter={tickY}
              domain={[0, Math.max(1, maxPago)]}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: GREEN, strokeOpacity: 0.4 }} />
            <Area
              type="stepAfter"
              dataKey="paid"
              stroke={GREEN}
              strokeWidth={2}
              fill="url(#fnGreen)"
              dot={{ r: 3, fill: GREEN, stroke: "#fff", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Tooltip único dos dois gráficos: mostra acesso E venda do mesmo dia, que é
// onde a correlação fica legível de fato.
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as {
    label: string
    visitors: number
    paid: number
    created: number
    revenueCents: number
    conv: number
  }
  const naoPagos = Math.max(0, (p.created ?? 0) - (p.paid ?? 0))
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="mb-1 text-xs text-muted-foreground">{p.label}</div>
      <div className="text-sm font-bold text-foreground">
        {p.visitors.toLocaleString("pt-BR")} visitante{p.visitors === 1 ? "" : "s"}
      </div>
      {(p.created > 0 || p.paid > 0) && (
        <div className="mt-1 space-y-0.5 border-t border-border pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: GREEN }} aria-hidden />
            <span className="font-semibold text-foreground">
              {p.paid} pago{p.paid === 1 ? "" : "s"}
            </span>
            {p.revenueCents > 0 && <span className="text-muted-foreground">· {brl(p.revenueCents)}</span>}
          </div>
          {naoPagos > 0 && (
            <div className="text-muted-foreground">
              {naoPagos} gerado{naoPagos === 1 ? "" : "s"} sem pagar
            </div>
          )}
          {p.visitors > 0 && p.paid > 0 && (
            <div className="text-muted-foreground">conversão {p.conv.toFixed(p.conv < 10 ? 1 : 0)}%</div>
          )}
        </div>
      )}
    </div>
  )
}
