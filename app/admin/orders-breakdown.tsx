"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { CheckCircle2, Clock, CreditCard, QrCode, XCircle } from "lucide-react"

// Paleta validada com scripts/validate_palette.js (modo claro):
// chroma OK · CVD protan ΔE 11.0 · visão normal ΔE 20.0 — passa sem ressalva.
const C_PAGO = "#047857"
const C_AGUARDANDO = "#d97706"
const C_ABANDONADO = "#be123c"
const C_CARTAO = "#4338ca"

export type Bucket = { n: number; cents: number }
export type Breakdown = {
  windowDays: number
  totalOrders: number
  byStatus: Record<string, Bucket>
  byMethod: Record<string, Bucket>
  byGateway: Record<string, Bucket>
}

type Fatia = { chave: string; label: string; cor: string; n: number; cents: number; icone: React.ReactNode }

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// Percentual em pt-BR (vírgula decimal). Inteiro fica sem casas: "33%", não
// "33,00%". Quebrado mostra duas: "4,76%".
const pctBR = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}%`

export function OrdersBreakdown({ data, loading }: { data?: Breakdown; loading: boolean }) {
  if (loading) {
    return (
      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <div className="h-[190px] animate-pulse rounded-xl bg-muted" />
        <div className="h-[190px] animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }
  if (!data || data.totalOrders === 0) return null

  const st = data.byStatus ?? {}
  const mt = data.byMethod ?? {}

  const statusFatias: Fatia[] = [
    { chave: "pago", label: "Pago", cor: C_PAGO, icone: <CheckCircle2 className="h-3.5 w-3.5" style={{ color: C_PAGO }} />, ...bucket(st.pago) },
    { chave: "aguardando", label: "Aguardando", cor: C_AGUARDANDO, icone: <Clock className="h-3.5 w-3.5" style={{ color: C_AGUARDANDO }} />, ...bucket(st.aguardando) },
    { chave: "abandonado", label: "Abandonado", cor: C_ABANDONADO, icone: <XCircle className="h-3.5 w-3.5" style={{ color: C_ABANDONADO }} />, ...bucket(st.abandonado) },
  ]

  const metodoFatias: Fatia[] = [
    { chave: "pix", label: "PIX", cor: C_PAGO, icone: <QrCode className="h-3.5 w-3.5" style={{ color: C_PAGO }} />, ...bucket(mt.pix) },
    { chave: "cartao", label: "Cartão", cor: C_CARTAO, icone: <CreditCard className="h-3.5 w-3.5" style={{ color: C_CARTAO }} />, ...bucket(mt.cartao) },
  ]

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-bold text-foreground">Distribuição dos pedidos</h2>
        {/* Janela diferente da do seletor lá de cima — dizer isso evita a
            pergunta "por que este número não bate com o de cima?". */}
        <span className="text-[11px] text-muted-foreground">
          últimos {data.windowDays} dias · {data.totalOrders} pedido(s)
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Rosca titulo="Por situação" fatias={statusFatias} destaque="pago" />
        <Rosca titulo="Por forma de pagamento" fatias={metodoFatias} destaque="pix" />
      </div>
    </div>
  )
}

function bucket(b?: Bucket): { n: number; cents: number } {
  return { n: b?.n ?? 0, cents: b?.cents ?? 0 }
}

function Rosca({ titulo, fatias, destaque }: { titulo: string; fatias: Fatia[]; destaque: string }) {
  const total = fatias.reduce((s, f) => s + f.n, 0)
  const centro = fatias.find((f) => f.chave === destaque) ?? fatias[0]
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)
  // Fatia com 0 sai do desenho (senão o Recharts cria um traço fantasma na
  // borda), mas continua na legenda — "0 pedidos" é informação.
  const desenho = fatias.filter((f) => f.n > 0)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">{titulo}</h3>
      <div className="flex items-center gap-4">
        <div className="relative h-[132px] w-[132px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={desenho}
                dataKey="n"
                innerRadius={44}
                outerRadius={62}
                startAngle={90}
                endAngle={-270}
                // 2px de folga entre fatias: o anel de superfície que separa
                // marcas vizinhas sem depender só do contraste de cor.
                paddingAngle={desenho.length > 1 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {desenho.map((f) => (
                  <Cell key={f.chave} fill={f.cor} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Número central: a fatia que importa (pago / PIX) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium text-muted-foreground">{centro.label}</span>
            <span className="text-xl font-bold leading-none text-foreground">{centro.n}</span>
            <span className="text-[10px] text-muted-foreground">{pct(centro.n).toFixed(0)}%</span>
          </div>
        </div>

        {/* Legenda em tabela — identidade vem do ícone + rótulo, não da cor
            sozinha; o número fica em tinta de texto. O valor é POR fatia (e não
            um total no rodapé, que daria o mesmo número nas duas roscas e
            pareceria erro de conta). */}
        <ul className="min-w-0 flex-1 space-y-1">
          {fatias.map((f) => (
            <li
              key={f.chave}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs odd:bg-background"
            >
              {f.icone}
              <span className="min-w-0 flex-1 truncate text-foreground">{f.label}</span>
              {f.cents > 0 && (
                <span className="hidden tabular-nums text-muted-foreground sm:inline">{brl(f.cents)}</span>
              )}
              <span className="w-6 text-right font-semibold tabular-nums text-foreground">{f.n}</span>
              <span className="w-12 text-right tabular-nums text-muted-foreground">{pctBR(pct(f.n))}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
