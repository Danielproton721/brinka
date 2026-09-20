"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { CheckCircle2, ExternalLink, Loader2, Mail, Trash2, X } from "lucide-react"
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

const FILTROS: { id: AdminOrder["status"] | "todos"; label: string; ativo: string; vazio: string }[] = [
  { id: "todos", label: "Todos", ativo: "border-foreground bg-foreground text-background", vazio: "ainda" },
  { id: "pago", label: "Pagos", ativo: "border-emerald-300 bg-emerald-100 text-emerald-800", vazio: "pago" },
  { id: "aguardando", label: "Aguardando", ativo: "border-amber-300 bg-amber-100 text-amber-800", vazio: "aguardando pagamento" },
  { id: "abandonado", label: "Abandonados", ativo: "border-red-300 bg-red-100 text-red-800", vazio: "abandonado" },
]

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function fmtCurto(iso?: string | null) {
  if (!iso || Number.isNaN(Date.parse(iso))) return ""
  return new Date(iso)
    .toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(", ", " ")
}

// Não pago → e-mail de pedido pendente. Pago → e-mail de pagamento confirmado.
const podeEnviarEmail = (o: AdminOrder) => Boolean(o.customer?.email)

const MODELOS = {
  abandonado: "Pedido pendente",
  "pendente-desconto": "Pedido pendente com 10% de desconto",
  pago: "Pagamento confirmado",
} as const
type TipoEmail = keyof typeof MODELOS

// O desconto de 10% só aparece pra quem montou o pedido com 2 produtos
// diferentes (é a regra do cupom COMBO10 em lib/coupons).
function modelosDo(o: AdminOrder): TipoEmail[] {
  if (o.status === "pago") return ["pago"]
  return (o.items?.length ?? 0) >= 2 ? ["abandonado", "pendente-desconto"] : ["abandonado"]
}

export function OrdersPanel({ orders, kvOk }: { orders: AdminOrder[]; kvOk: boolean }) {
  const router = useRouter()
  const [emailPara, setEmailPara] = useState<AdminOrder | null>(null)
  // Selo aparece na hora, sem esperar o refresh do servidor trazer emailManualEm.
  const [enviadosAgora, setEnviadosAgora] = useState<Record<string, string>>({})
  // Some da lista na hora, sem esperar o refresh do servidor.
  const [apagados, setApagados] = useState<string[]>([])
  const [filtro, setFiltro] = useState<AdminOrder["status"] | "todos">("todos")

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

  const emailEnviadoEm = (o: AdminOrder) => enviadosAgora[o.txid] ?? o.emailManualEm ?? null

  function aoEnviar(txid: string, enviadoEm: string) {
    setEnviadosAgora((atual) => ({ ...atual, [txid]: enviadoEm }))
    setEmailPara(null)
    router.refresh()
  }

  function aoApagar(txid: string) {
    setApagados((atual) => [...atual, txid])
    router.refresh()
  }

  const naoApagados = orders.filter((o) => !apagados.includes(o.txid))
  const visiveis = filtro === "todos" ? naoApagados : naoApagados.filter((o) => o.status === filtro)
  const quantos = (f: AdminOrder["status"] | "todos") =>
    f === "todos" ? naoApagados.length : naoApagados.filter((o) => o.status === f).length

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const on = filtro === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${
                on ? f.ativo : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              <span className={`text-xs font-bold ${on ? "" : "text-muted-foreground/70"}`}>{quantos(f.id)}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
        <span><span className="font-bold text-emerald-700">Pago</span>: pagamento confirmado</span>
        <span><span className="font-bold text-amber-700">Aguardando</span>: gerado, cliente ainda pode pagar (até 30 min)</span>
        <span><span className="font-bold text-red-700">Abandonado</span>: gerou e não voltou pra concluir</span>
      </div>

      {visiveis.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum pedido {FILTROS.find((f) => f.id === filtro)?.vazio}.
        </div>
      )}

      {/* Mobile: cada pedido vira um card (a tabela não cabe na tela) */}
      <div className="space-y-3 md:hidden">
        {visiveis.map((o) => {
          const st = STATUS[o.status]
          const enviadoEm = emailEnviadoEm(o)
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

              {(podeEnviarEmail(o) || enviadoEm || o.status === "pago") && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  {podeEnviarEmail(o) && <EnviarEmailBotao onClick={() => setEmailPara(o)} />}
                  {o.status === "pago" && <ConfirmacaoAutoSelo em={o.emailConfirmacaoEm ?? null} />}
                  {enviadoEm && <EmailEnviadoSelo em={enviadoEm} />}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <ApagarPedidoBotao pedido={o} onApagado={() => aoApagar(o.txid)} />
              </div>
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
              <th className="px-4 py-3 font-semibold">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((o) => {
              const st = STATUS[o.status]
              const enviadoEm = emailEnviadoEm(o)
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
                  <td className="px-4 py-3">
                    {podeEnviarEmail(o) || enviadoEm || o.status === "pago" ? (
                      <div className="flex flex-col items-start gap-1.5">
                        {podeEnviarEmail(o) && <EnviarEmailBotao onClick={() => setEmailPara(o)} />}
                        {o.status === "pago" && <ConfirmacaoAutoSelo em={o.emailConfirmacaoEm ?? null} />}
                        {enviadoEm && <EmailEnviadoSelo em={enviadoEm} />}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    <div className="mt-2">
                      <ApagarPedidoBotao pedido={o} onApagado={() => aoApagar(o.txid)} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <EnviarEmailModal pedido={emailPara} onFechar={() => setEmailPara(null)} onEnviado={aoEnviar} />
    </>
  )
}

// Pedidos são permanentes; apagar é sempre escolha explícita (confirma antes).
function ApagarPedidoBotao({ pedido, onApagado }: { pedido: AdminOrder; onApagado: () => void }) {
  const [apagando, setApagando] = useState(false)

  async function apagar() {
    if (apagando) return
    const quem = pedido.customer?.name || "cliente sem nome"
    const ok = window.confirm(
      `Apagar o pedido de ${quem} (${brl(pedido.total)}, ${fmtDate(pedido.createdAt)})?\n\nEle sai do painel para sempre. Não dá para desfazer.`,
    )
    if (!ok) return
    setApagando(true)
    try {
      const r = await fetch("/api/admin/orders/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txid: pedido.txid, confirmar: true }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.ok) {
        onApagado()
        return
      }
      window.alert(d?.error || `Não consegui apagar (erro ${r.status}).`)
    } catch {
      window.alert("Falha de rede. Tente de novo.")
    } finally {
      setApagando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={apagar}
      disabled={apagando}
      className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-muted-foreground hover:text-red-600 disabled:opacity-50"
    >
      {apagando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      Apagar pedido
    </button>
  )
}

function EnviarEmailBotao({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
    >
      <Mail className="h-3.5 w-3.5" />
      Enviar e-mail
    </button>
  )
}

function EmailEnviadoSelo({ em }: { em: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      E-mail enviado {fmtCurto(em)}
    </span>
  )
}

// E-mail automático de confirmação (webhook). Sem registro = o cliente pode não
// ter recebido: vale mandar pelo botão.
function ConfirmacaoAutoSelo({ em }: { em: string | null }) {
  if (em && fmtCurto(em)) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
        <CheckCircle2 className="h-3 w-3" />
        Confirmação automática {fmtCurto(em)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
      Confirmação automática não registrada
    </span>
  )
}

type JaEnviado = { automatico: boolean; automaticoEm?: string | null; manualEm: string | null }

function textoJaEnviado(j: JaEnviado) {
  const automatico = j.automatico ? `automático${fmtCurto(j.automaticoEm) ? ` em ${fmtCurto(j.automaticoEm)}` : ""}` : null
  const partes = [automatico, j.manualEm ? `manual em ${fmtCurto(j.manualEm)}` : null].filter(Boolean)
  return partes.length
    ? `Esse cliente já recebeu (${partes.join(" / ")}). Enviar de novo?`
    : "Esse cliente já recebeu este e-mail. Enviar de novo?"
}

function EnviarEmailModal({
  pedido,
  onFechar,
  onEnviado,
}: {
  pedido: AdminOrder | null
  onFechar: () => void
  onEnviado: (txid: string, enviadoEm: string) => void
}) {
  const opcoes: TipoEmail[] = pedido ? modelosDo(pedido) : ["abandonado"]
  const [tipo, setTipo] = useState<TipoEmail>(opcoes[0])
  const [assunto, setAssunto] = useState<string | null>(null)
  const [erroAssunto, setErroAssunto] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [jaEnviado, setJaEnviado] = useState<JaEnviado | null>(null)

  const txid = pedido?.txid ?? ""
  const primeiraOpcao = opcoes[0]

  // Trocou de pedido: volta pro modelo padrão daquele pedido.
  useEffect(() => {
    setTipo(primeiraOpcao)
  }, [txid, primeiraOpcao])

  useEffect(() => {
    if (!txid) return
    setAssunto(null)
    setErroAssunto(null)
    setErro(null)
    setJaEnviado(null)
    let cancelado = false
    fetch(`/api/admin/orders/email/preview?txid=${encodeURIComponent(txid)}&tipo=${tipo}&formato=json`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (cancelado) return
        if (r.ok && d?.ok) setAssunto(d.assunto)
        else setErroAssunto(d?.error || `Não consegui carregar o e-mail (erro ${r.status}).`)
      })
      .catch(() => !cancelado && setErroAssunto("Falha de rede ao carregar o e-mail."))
    return () => {
      cancelado = true
    }
  }, [txid, tipo])

  async function enviar(confirmarReenvio: boolean) {
    if (!txid || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const r = await fetch("/api/admin/orders/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txid, tipo, confirmarReenvio }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.ok) {
        onEnviado(txid, d.enviadoEm)
        return
      }
      if (r.status === 409 && d?.jaEnviado) {
        setJaEnviado(d.jaEnviado)
        return
      }
      setJaEnviado(null)
      setErro(d?.error || `Não consegui enviar (erro ${r.status}).`)
    } catch {
      setErro("Falha de rede. Tente de novo.")
    } finally {
      setEnviando(false)
    }
  }

  const previaHref = `/api/admin/orders/email/preview?txid=${encodeURIComponent(txid)}&tipo=${tipo}`

  return (
    <Dialog.Root open={Boolean(pedido)} onOpenChange={(aberto) => !aberto && !enviando && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-bold text-foreground">Enviar e-mail</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {pedido?.customer?.name || "Cliente"} · {pedido ? brl(pedido.total) : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close
              disabled={enviando}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modelo</span>
              {opcoes.length > 1 ? (
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoEmail)}
                  disabled={enviando}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {opcoes.map((op) => (
                    <option key={op} value={op}>
                      {MODELOS[op]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">{MODELOS[tipo]}</div>
              )}
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Para</span>
              <div className="break-all rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
                {pedido?.customer?.email}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assunto</span>
              <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
                {assunto ?? (erroAssunto ? <span className="text-red-600">{erroAssunto}</span> : <span className="text-muted-foreground">Carregando…</span>)}
              </div>
            </div>

            <a
              href={previaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Ver prévia <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {erro && (
            <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {erro}
            </p>
          )}

          {jaEnviado ? (
            <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">{textoJaEnviado(jaEnviado)}</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJaEnviado(null)}
                  disabled={enviando}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => enviar(true)}
                  disabled={enviando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                  {enviando ? "Enviando…" : "Enviar de novo"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close
                disabled={enviando}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={() => enviar(false)}
                disabled={enviando || !assunto}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
