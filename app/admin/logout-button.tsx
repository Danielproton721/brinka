"use client"

import { LogOut } from "lucide-react"

export function LogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    window.location.reload()
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sair
    </button>
  )
}
