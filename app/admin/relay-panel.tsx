"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Check, ChevronDown, ChevronUp, Copy, KeyRound, Radio, ShieldCheck } from "lucide-react"

type ClientCfg = {
  webhookPath: string
  secretSet: boolean
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
// relay: esta loja é a LOJA DE TRÁS — quem fala com o gateway é a LOJA DA
// FRENTE, que repassa os avisos pra cá.
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
// Card do relay em linguagem de quem NÃO é técnico. A regra aqui é: só falar
// de coisa que a pessoa vê na tela (Vercel, painel da loja da frente), dizendo
// onde clicar e o que colar. Nada de "webhook", "header" ou "endpoint" solto.
function ClientRelayPanel({ cfg, origin }: { cfg: ClientCfg; origin: string }) {
  const urlDestaLoja = `${origin}${cfg.webhookPath}`
  const temSegredo = cfg.secretSet
  const temUrlFrente = Boolean(cfg.notifyOverride)
  const prontoTudo = temSegredo && temUrlFrente

  return (
    <CollapsibleCard
      title="Receber o aviso de pagamento pela loja da frente"
      icon={<Radio className="h-4 w-4 text-primary" />}
      headerRight={
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            prontoTudo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {prontoTudo ? "Tudo pronto" : "Falta configurar"}
        </span>
      }
    >
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        A Pagou.ai não pode saber o endereço desta loja. Então quem fala com ela é a{" "}
        <strong className="text-foreground">loja da frente</strong>: ela recebe o aviso de que o
        cliente pagou e passa esse aviso para cá.
      </p>

      {/* PASSO 1 — o que falta hoje: as duas variáveis */}
      <div className="mb-3 rounded-xl border border-border bg-background p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            1
          </span>
          <span className="text-xs font-bold text-foreground">Na Vercel desta loja</span>
          {temSegredo && temUrlFrente ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <span className="text-[11px] font-semibold text-amber-700">falta fazer</span>
          )}
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Abra o site da Vercel → o projeto desta loja → <strong>Settings</strong> →{" "}
          <strong>Environment Variables</strong>. Crie as duas linhas abaixo com os valores que o
          painel da loja da frente te mostrou. Depois vá em <strong>Deployments</strong>, no
          primeiro da lista, e clique em <strong>Redeploy</strong> — sem isso os valores não valem.
        </p>
        <Field
          label="1ª linha — endereço da loja da frente"
          value={cfg.notifyOverride || "NOTIFY_URL_OVERRIDE = (cole aqui a URL que a loja da frente te deu)"}
          small
        />
        <div className="mt-2">
          <Field
            label="2ª linha — a senha combinada entre as duas lojas"
            value={temSegredo ? "RELAY_SECRET = já configurada ✓" : "RELAY_SECRET = (cole aqui a senha que aparece na loja da frente)"}
            small
          />
        </div>
      </div>

      {/* PASSO 2 — o que colar lá */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            2
          </span>
          <span className="text-xs font-bold text-foreground">No painel da loja da frente</span>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Lá existe um campo pedindo o endereço desta loja. Copie o texto abaixo e cole nele.
        </p>
        <Field label="Endereço desta loja (copie e cole lá)" value={urlDestaLoja} />
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Esse endereço serve para os três meios de pagamento — não precisa cadastrar um para cada.
        </p>
      </div>

      {!prontoTudo && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          Enquanto faltar o passo 1, a Pagou.ai continua vendo o endereço real desta loja e o aviso
          de pagamento pode não chegar.
        </p>
      )}
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