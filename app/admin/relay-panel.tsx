"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Check, ChevronDown, ChevronUp, Copy, KeyRound, Radio, ShieldCheck } from "lucide-react"

type ClientCfg = {
  activeGateway: string
  pagouActive: boolean
  webhookPath: string
  relaySecret: string
  notifyOverride: string
}
type Data = {
  activeGateway?: string
  client?: ClientCfg
}


// Prompt pronto pra colar no agente (Claude Code/Cursor) da OUTRA loja: ensina a
// integrar com o relay e a devolver o webhook pra registrar aqui.
function CopyBtn({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {}
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
    >
      {done ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      {done ? "Copiado" : label}
    </button>
  )
}

function Field({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className={`mb-0.5 ${small ? "text-[10px]" : "text-xs"} font-semibold uppercase tracking-wide text-muted-foreground`}>
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
          {value}
        </code>
        <CopyBtn text={value} />
      </div>
    </div>
  )
}

// Card colapsável (minimizar/maximizar) usado pelas duas áreas do painel de
// relay: "esta loja como cliente" (envio) e "esta loja como hub" (recebe).
function CollapsibleCard({
  title,
  icon,
  headerRight,
  defaultOpen = true,
  children,
}: {
  title: string
  icon?: ReactNode
  headerRight?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h3 className="truncate text-sm font-bold text-foreground">{title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerRight}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

// Painel "esta loja como CLIENTE de um relay externo" (igual ao da v0-delivery):
// mostra, com botão Copiar, tudo que precisa pra plugar esta loja num relay.
function ClientRelayPanel({ cfg, origin }: { cfg: ClientCfg; origin: string }) {
  const gwLabel: Record<string, string> = { pagou: "Pagou.ai", medusa: "MedusaPay", centurion: "CenturionPay" }
  const destUrl = origin ? `${origin}${cfg.webhookPath}` : cfg.webhookPath
  const secret = cfg.relaySecret
  const notify = cfg.notifyOverride
  const envBlock = `NOTIFY_URL_OVERRIDE=${notify || "<url-do-relay>"}\nRELAY_SECRET=${secret || "<segredo-do-relay>"}`
  const secretOk = !!secret
  const notifyOk = !!notify

  return (
    <CollapsibleCard
      title="Esta loja como cliente do relay (Pagou.ai)"
      icon={<Radio className="h-4 w-4 text-primary" />}
      headerRight={
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            secretOk && notifyOk ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {secretOk && notifyOk ? "Enviando via relay ✓" : "Relay não ativado"}
        </span>
      }
    >
      <p className="mb-3 text-[11px] text-muted-foreground">
        O relay é exclusivo da <strong className="text-foreground">Pagou.ai</strong>: ele recebe o webhook dela e repassa
        pra esta loja, escondendo o domínio real do gateway.
        {!cfg.pagouActive && (
          <span className="ml-1 font-semibold text-amber-700">
            Gateway ativo agora é {gwLabel[cfg.activeGateway] ?? cfg.activeGateway} — o relay só age quando a Pagou.ai está ativa.
          </span>
        )}
      </p>

      {/* 3 explicações rápidas */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-2.5">
          <Radio className="mb-1 h-4 w-4 text-primary" />
          <div className="text-xs font-bold text-foreground">Destino do relay</div>
          <div className="text-[10px] text-muted-foreground">Configure a URL abaixo como repasse no relay.</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-2.5">
          <KeyRound className="mb-1 h-4 w-4 text-primary" />
          <div className="text-xs font-bold text-foreground">Header obrigatório</div>
          <div className="text-[10px] text-muted-foreground">O relay deve mandar x-relay-secret em cada POST.</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-2.5">
          <ShieldCheck className="mb-1 h-4 w-4 text-primary" />
          <div className="text-xs font-bold text-foreground">Corpo intacto</div>
          <div className="text-[10px] text-muted-foreground">Repassar o JSON do gateway sem transformar campos.</div>
        </div>
      </div>

      {/* 1. dados pro relay */}
      <div className="mb-3 rounded-xl border border-border bg-background p-3">
        <div className="mb-2 text-xs font-bold text-foreground">1. Configurar no relay como destino</div>
        <div className="space-y-2.5">
          <Field label="URL destino (webhook desta loja)" value={destUrl} />
          <Field label="Método" value="POST" />
          <Field label="Header" value="x-relay-secret" />
          <Field label="Valor do header (RELAY_SECRET)" value={secret || "— defina RELAY_SECRET no ambiente —"} />
          <Field label="Content-Type" value="application/json" />
        </div>
      </div>

      {/* 2. notify que vai no gateway */}
      <div className="mb-3 rounded-xl border border-border bg-background p-3">
        <div className="mb-2 text-xs font-bold text-foreground">2. URL que vai no gateway</div>
        <Field label="NOTIFY_URL atual (NOTIFY_URL_OVERRIDE)" value={notify || "— não definido: o gateway veria o domínio desta loja —"} />
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-[11px] ${
            notifyOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {notifyOk
            ? "NOTIFY_URL_OVERRIDE aponta pro relay. O gateway só vê o domínio do relay, nunca o desta loja."
            : "Defina NOTIFY_URL_OVERRIDE com a URL do relay — senão o gateway recebe o domínio real desta loja."}
        </p>
      </div>

      {/* 3. bloco .env */}
      <div className="rounded-xl border border-border bg-background p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">3. Envs esperadas na produção</span>
          <CopyBtn text={envBlock} label="Copiar .env" />
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed text-foreground">
          {envBlock}
        </pre>
      </div>
    </CollapsibleCard>
  )
}

export function RelayPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    fetch("/api/admin/relay", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d && setData(d))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {data?.client && <ClientRelayPanel cfg={data.client} origin={origin} />}
    </div>
  )
}