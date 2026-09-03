"use client"

import { useEffect, useState } from "react"

// Contador "ao vivo" de visitantes + total de visitantes únicos de hoje.
// Atualiza sozinho a cada 30s (econômico no KV). Depende de a loja mandar
// heartbeats pro /api/presence (PresenceBeacon no layout).
export function OnlineCount() {
  const [online, setOnline] = useState<number | null>(null)
  const [today, setToday] = useState<number | null>(null)

  useEffect(() => {
    let stopped = false
    const load = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" })
        const d = await r.json()
        if (stopped) return
        setOnline(typeof d?.online === "number" ? d.online : 0)
        setToday(typeof d?.today === "number" ? d.today : 0)
      } catch {
        if (!stopped) setOnline(null)
      }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-bold text-emerald-700">
          {online ?? "—"} online
        </span>
      </div>
      <div className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5">
        <span className="text-sm font-bold text-foreground">{today ?? "—"}</span>
        <span className="ml-1 text-xs text-muted-foreground">hoje</span>
      </div>
    </div>
  )
}
