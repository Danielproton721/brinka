"use client"

import type { AdminOrder } from "@/lib/orders"

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`

const STATUS: Record<AdminOrder["status"], { label: string; cls: string; desc: string }> = {
  pago: {
    label: "Pago",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    desc: "Pagamento confirmado.",
  },
  aguardando: {
    label: "Aguardando",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    desc: "Pagamento gerado — o cliente ainda pode pagar (até 30 min).",
  },
  abandonado: {
    label: "Abandonado",
    cls: "bg-red-100 text-red-700 border-red-200",
    desc: "Gerou o pagamento e não voltou pra concluir.",
  },
}

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export function OrdersPanel({ orders, kvOk }: { orders: AdminOrder[]; kvOk: boolean }) {
  if (!kvOk) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        KV (Upstash) não configurado — sem dados de pedidos. Provisione o Upstash na Vercel pra ligar.
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Nenhum pedido ainda.
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
        <span><span className="font-bold text-emerald-700">Pago</span>: pagamento confirmado</span>
        <span><span className="font-bold text-amber-700">Aguardando</span>: gerado, cliente ainda pode pagar (até 30 min)</span>
        <span><span className="font-bold text-red-700">Abandonado</span>: gerou e não voltou pra concluir</span>
      </div>

      {/* Mobile: cada pedido vira um card (a tabela não cabe na tela) */}
      <div className="space-y-3 md:hidden">
        {orders.map((o) => {
          const st = STATUS[o.status]
          return (
            <div key={o.txid} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span>
                <span className="whitespace-nowrap text-base font-bold text-foreground">{brl(o.total)}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span title={st.desc} className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${st.cls}`}>
                  {st.label}
                </span>
                {o.gateway && (
                  <span className="inline-block rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                    {o.gateway}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="font-semibold text-foreground">{o.customer?.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{o.customer?.phone || ""}</div>
                <div className="break-all text-xs text-muted-foreground">{o.customer?.email || ""}</div>
                {o.address && (o.address.street || o.address.city) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {o.address.street}, {o.address.number}
                    {o.address.complement ? ` — ${o.address.complement}` : ""}
                    {o.address.neighborhood ? ` · ${o.address.neighborhood}` : ""}
                    {o.address.city ? ` · ${o.address.city}-${o.address.stateUF ?? ""}` : ""}
                    {o.address.cep ? ` · CEP ${o.address.cep}` : ""}
                  </div>
                )}
              </div>

              <ul className="mt-3 space-y-0.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                {(o.items || []).map((it, i) => (
                  <li key={i}>
                    <span className="font-semibold text-foreground">{it.quantity}×</span> {it.name}
                  </li>
                ))}
              </ul>

              {o.proofUrl && (
                <a
                  href={o.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Ver comprovante
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: tabela completa */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Itens</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
              <th className="px-4 py-3 font-semibold">Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const st = STATUS[o.status]
              return (
                <tr key={o.txid} className="border-b border-border/60 last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{fmtDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span title={st.desc} className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${st.cls}`}>
                      {st.label}
                    </span>
                    {o.gateway && (
                      <div className="mt-1 text-[11px] text-muted-foreground">{o.gateway}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{o.customer?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customer?.phone || ""}</div>
                    <div className="text-xs text-muted-foreground">{o.customer?.email || ""}</div>
                    {o.address && (o.address.street || o.address.city) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {o.address.street}, {o.address.number}
                        {o.address.complement ? ` — ${o.address.complement}` : ""}
                        {o.address.neighborhood ? ` · ${o.address.neighborhood}` : ""}
                        {o.address.city ? ` · ${o.address.city}-${o.address.stateUF ?? ""}` : ""}
                        {o.address.cep ? ` · CEP ${o.address.cep}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {(o.items || []).map((it, i) => (
                        <li key={i}>
                          <span className="font-semibold text-foreground">{it.quantity}×</span> {it.name}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">{brl(o.total)}</td>
                  <td className="px-4 py-3">
                    {o.proofUrl ? (
                      <a
                        href={o.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold hover:underline whitespace-nowrap"
                      >
                        Ver comprovante
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
