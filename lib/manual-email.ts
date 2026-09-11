import { kvGet } from "./kv-store"

export const TIPOS_EMAIL_MANUAL = ["abandonado"] as const
export type TipoEmailManual = (typeof TIPOS_EMAIL_MANUAL)[number]

export function isTipoEmailManual(v: unknown): v is TipoEmailManual {
  return typeof v === "string" && (TIPOS_EMAIL_MANUAL as readonly string[]).includes(v)
}

// Não é /checkout: o carrinho fica no localStorage do navegador original e abriria vazio.
export const MANUAL_CTA_HREF = "/"

// Tem que ser a mesma chave de trava usada em app/api/abandoned/check.
export const abandonSentKey = (txid: string) => `abandon:sent:${txid}`
export const abandonManualKey = (txid: string) => `abandon:manual:${txid}`
export const abandonManualLockKey = (txid: string) => `abandon:manual:lock:${txid}`

export async function getEmailManualEm(txid: string): Promise<string | null> {
  try {
    return (await kvGet(abandonManualKey(txid))) || null
  } catch {
    return null
  }
}
