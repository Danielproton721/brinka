"use client"

import { useState } from "react"
import { Loader2, CreditCard } from "lucide-react"
import type { GatewayId } from "@/lib/gateways/active"

const OPTIONS: { id: GatewayId; label: string }[] = [
  { id: "pagou", label: "Pagou.ai" },
  { id: "medusa", label: "MedusaPay" },
  { id: "centurion", label: "CenturionPay" },
]

export function GatewaySwitch({ initial, kvOk }: { initial: GatewayId; kvOk: boolean }) {
  const [active, setActive] = useState<GatewayId>(initial)
  const [saving, setSaving] = useState<GatewayId | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function choose(id: GatewayId) {
    if (id === active || saving) return
    setSaving(id)
    setMsg(null)
    try {
      const r = await fetch("/api/admin/gateway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gateway: id }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setActive(id)
        setMsg({ ok: true, text: `Gateway alterado para ${OPTIONS.find((o) => o.id === id)?.label}.` })
      } else {
        setMsg({ ok: false, text: d?.error || "Erro ao salvar." })
      }
    } catch {
      setMsg({ ok: false, text: "Falha de conexão." })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <CreditCard className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-bold text-foreground">Gateway de pagamento</h2>
            <p className="text-xs text-muted-foreground">Define qual processa os pagamentos da loja agora.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {OPTIONS.map((o) => {
            const on = active === o.id
            return (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                disabled={!kvOk || saving !== null}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                  on
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {saving === o.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {o.label}
                {on ? " ✓" : ""}
              </button>
            )
          })}
        </div>
      </div>

      {!kvOk && (
        <p className="mt-2 text-xs text-amber-700">
          KV (Upstash) não configurado — a troca não pode ser salva.
        </p>
      )}
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      )}
    </div>
  )
}
