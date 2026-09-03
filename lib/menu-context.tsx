"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface MenuContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  return (
    <MenuContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error("useMenu must be used within MenuProvider")
  return ctx
}
