"use client"

import { useState } from "react"
import { Lock } from "lucide-react"

export function AdminLogin({ brand }: { brand: string }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.reload()
      } else {
        const d = await res.json().catch(() => null)
        setError(d?.error || "Senha incorreta.")
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-foreground">
          <Lock className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Painel {brand}</h1>
        </div>
        <p className="text-sm text-muted-foreground">Acesso restrito. Digite a senha do administrador.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoFocus
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-primary text-primary-foreground font-bold py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  )
}
