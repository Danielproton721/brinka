"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageCircle } from "lucide-react"

type Cfg = {
  numero: string
  legivel: string
  link: string
  botao: boolean
  rodape: boolean
  podeSalvar: boolean
}

export function WhatsAppSwitch() {
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [salvando, setSalvando] = useState<"botao" | "rodape" | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/whatsapp", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCfg(d))
      .catch(() => {})
  }, [])

  async function alternar(campo: "botao" | "rodape") {
    if (!cfg || salvando) return
    setSalvando(campo)
    setErro(null)
    try {
      const r = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [campo]: !cfg[campo] }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.ok) setCfg(d)
      else setErro(d?.error || "Não consegui salvar.")
    } catch {
      setErro("Falha de conexão.")
    } finally {
      setSalvando(null)
    }
  }

  if (!cfg) return null

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <h2 className="font-bold text-foreground">WhatsApp da loja</h2>
          <p className="text-xs text-muted-foreground">
            Atendimento em <span className="font-semibold text-foreground">{cfg.legivel}</span>. Escolha onde ele
            aparece pro cliente.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <LinhaToggle
          titulo="Botão flutuante"
          descricao="Bolinha verde no canto da tela, em todas as páginas."
          ligado={cfg.botao}
          ocupado={salvando === "botao"}
          desabilitado={!cfg.podeSalvar || salvando !== null}
          onClick={() => alternar("botao")}
        />
        <LinhaToggle
          titulo="Link no rodapé"
          descricao="Aparece na coluna “Ajuda”, no fim de todas as páginas."
          ligado={cfg.rodape}
          ocupado={salvando === "rodape"}
          desabilitado={!cfg.podeSalvar || salvando !== null}
          onClick={() => alternar("rodape")}
        />
      </div>

      {!cfg.podeSalvar && (
        <p className="mt-2 text-xs text-amber-700">KV (Upstash) não configurado — a escolha não pode ser salva.</p>
      )}
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">
        A mudança aparece pro cliente em até 1 minuto (o site guarda a resposta por esse tempo).
      </p>
    </div>
  )
}

function LinhaToggle({
  titulo,
  descricao,
  ligado,
  ocupado,
  desabilitado,
  onClick,
}: {
  titulo: string
  descricao: string
  ligado: boolean
  ocupado: boolean
  desabilitado: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-foreground">{titulo}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{descricao}</div>
      </div>
      <button
        onClick={onClick}
        disabled={desabilitado}
        aria-pressed={ligado}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-50 ${
          ligado
            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        {ocupado && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {ligado ? "Aparecendo" : "Escondido"}
      </button>
    </div>
  )
}
