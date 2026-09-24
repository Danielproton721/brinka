"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Tema = "claro" | "escuro"

const CHAVE = "brinka-admin-tema"
const TemaCtx = createContext<{ tema: Tema; alternar: () => void }>({ tema: "claro", alternar: () => {} })

export const useTemaAdmin = () => useContext(TemaCtx)

// A classe `dark` fica só nesta árvore: a loja do cliente não é afetada.
// Começa no claro pra bater com o HTML do servidor e troca logo na montagem,
// seguindo o que foi salvo ou o tema do sistema.
export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("claro")

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE)
      if (salvo === "claro" || salvo === "escuro") {
        setTema(salvo)
        return
      }
    } catch {
      // navegador sem storage: segue o sistema
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) setTema("escuro")
  }, [])

  function alternar() {
    setTema((atual) => {
      const novo = atual === "escuro" ? "claro" : "escuro"
      try {
        localStorage.setItem(CHAVE, novo)
      } catch {
        // sem storage a escolha vale só nesta aba
      }
      return novo
    })
  }

  return (
    <TemaCtx.Provider value={{ tema, alternar }}>
      <div className={tema === "escuro" ? "dark" : undefined}>{children}</div>
    </TemaCtx.Provider>
  )
}

export function BotaoTema() {
  const { tema, alternar } = useTemaAdmin()
  const escuro = tema === "escuro"
  return (
    <button
      onClick={alternar}
      title={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      aria-label={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-muted"
    >
      {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {escuro ? "Claro" : "Escuro"}
    </button>
  )
}
