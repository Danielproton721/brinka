// Autenticação simples do painel admin: uma senha única em ADMIN_PASSWORD.
// O cookie guarda um hash da senha (não a senha crua), validado a cada request.
// Portável: o nome do cookie vem de admin.config.ts.

import { createHash } from "crypto"
import { cookies } from "next/headers"
import { adminConfig } from "@/admin.config"

export const ADMIN_COOKIE = adminConfig.cookieName

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD)
}

export function sessionToken(): string {
  const pw = process.env.ADMIN_PASSWORD || ""
  return createHash("sha256").update(`${adminConfig.cookieName}:${pw}`).digest("hex")
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || ""
  return Boolean(pw) && input === pw
}

export async function isAuthed(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false
  const jar = await cookies()
  const val = jar.get(ADMIN_COOKIE)?.value
  return Boolean(val) && val === sessionToken()
}
