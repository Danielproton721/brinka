"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Eye, Loader2, Send } from "lucide-react"

type Estado = {
  apiKeySet: boolean
  from: string
  replyTo: string
  appUrl: string
}

const TIPOS = [
  { chave: "confirmacao", rotulo: "Pedido pago", desc: "A notinha — dispara quando o pagamento é confirmado.", preview: "" },
  { chave: "postado", rotulo: "Pedido postado", desc: "Sai ~1h depois do pagamento, com código de rastreio.", preview: "?tipo=postado" },
  { chave: "abandonado", rotulo: "Carrinho abandonado", desc: "Para quem gerou o PIX e não pagou.", preview: "?tipo=pendente" },
] as const

export function EmailPanel() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [para, setPara] = useState("")
  const [tipo, setTipo] = useState<string>("confirmacao")
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/email-test", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEstado(d))
      .catch(() => {})
  }, [])

  const enviar = async () => {
    setEnviando(true)
    setResultado(null)
    try {
      const r = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: para.trim(), tipo }),
      })
      const d = await r.json()
      setResultado(
        d?.ok
          ? { ok: true, msg: `Enviado para ${d.to}. Confira a caixa de entrada (e o spam).` }
          : { ok: false, msg: d?.error || "Falha ao enviar." },
      )
    } catch (e: any) {
      setResultado({ ok: false, msg: e?.message || "Falha de rede." })
    } finally {
      setEnviando(false)
    }
  }

  const tipoAtual = TIPOS.find((t) => t.chave === tipo) ?? TIPOS[0]
  const podeEnviar = !enviando && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para.trim())

  return (
    <div className="space-y-4">
      {/* Estado do Resend — o que falta antes de tentar enviar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">Configuração do Resend</h2>
        {!estado ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : (
          <dl className="space-y-1.5 text-xs">
            <Linha
              rotulo="API key"
              valor={estado.apiKeySet ? "configurada" : "FALTANDO — nada é enviado sem ela"}
              ok={estado.apiKeySet}
            />
            <Linha rotulo="Remetente" valor={estado.from} ok />
            <Linha rotulo="Responder para" valor={estado.replyTo} ok />
            <Linha
              rotulo="URL da loja"
              valor={estado.appUrl}
              ok={!estado.appUrl.startsWith("(nenhum")}
            />
          </dl>
        )}
        <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
          O domínio do remetente precisa estar verificado no Resend (Domains → Add Domain,
          publicando SPF e DKIM no DNS). Sem isso o envio é recusado, mesmo com a API key certa.
        </p>
      </div>

      {/* Qual e-mail testar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">Enviar um teste</h2>

        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          {TIPOS.map((t) => (
            <button
              key={t.chave}
              onClick={() => setTipo(t.chave)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                tipo === t.chave
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <div className="text-xs font-bold text-foreground">{t.rotulo}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>

        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Enviar para
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={para}
            onChange={(e) => setPara(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && podeEnviar) enviar() }}
            placeholder="seu@email.com"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={enviar}
            disabled={!podeEnviar}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {enviando ? "Enviando…" : "Enviar teste"}
          </button>
          <a
            href={`/api/email/preview${tipoAtual.preview}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Eye className="h-4 w-4" />
            Ver no navegador
          </a>
        </div>

        {resultado && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-xs ${
              resultado.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {resultado.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="leading-relaxed">{resultado.msg}</span>
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          O assunto vai com <strong>[TESTE]</strong> na frente, e o corpo usa o mesmo pedido de
          exemplo do preview. Vale olhar no Gmail de verdade: o navegador aceita CSS que o
          cliente de e-mail corta.
        </p>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor, ok }: { rotulo: string; valor: string; ok: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{rotulo}</dt>
      <dd className={`min-w-0 truncate text-right font-medium ${ok ? "text-foreground" : "text-red-600"}`}>
        {valor}
      </dd>
    </div>
  )
}
