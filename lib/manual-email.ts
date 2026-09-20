import { CUPOM_COMBO, CUPOM_COMBO_PCT } from "./coupons"
import { kvGet } from "./kv-store"

// "abandonado" = pedido pendente (não pago). "pendente-desconto" = o mesmo, com
// desconto pra quem montou o pedido com os dois carrinhos. "pago" = pagamento
// confirmado.
export const TIPOS_EMAIL_MANUAL = ["abandonado", "pendente-desconto", "pago"] as const
export type TipoEmailManual = (typeof TIPOS_EMAIL_MANUAL)[number]

export function isTipoEmailManual(v: unknown): v is TipoEmailManual {
  return typeof v === "string" && (TIPOS_EMAIL_MANUAL as readonly string[]).includes(v)
}

// Não é /checkout: o carrinho fica no localStorage do navegador original e abriria vazio.
export const MANUAL_CTA_HREF = "/"
// Link que já aplica o cupom no carrinho do cliente (lido em lib/cart-context).
export const MANUAL_CTA_COMBO = `/?cupom=${CUPOM_COMBO}`
export const OFERTA_COMBO = { pct: CUPOM_COMBO_PCT, cupom: CUPOM_COMBO }
// O cupom do combo só vale com 2 produtos diferentes — o e-mail respeita isso.
export const MIN_PRODUTOS_COMBO = 2

// Tem que ser a mesma chave de trava usada em app/api/abandoned/check.
export const abandonSentKey = (txid: string) => `abandon:sent:${txid}`
export const abandonManualKey = (txid: string) => `abandon:manual:${txid}`
export const abandonManualLockKey = (txid: string) => `abandon:manual:lock:${txid}`

// Tem que ser a mesma trava de lib/send-order-email.ts (dispatchOrderEmailOnce):
// o webhook grava nela a hora em que o e-mail automático de confirmação saiu.
export const confirmacaoAutoKey = (txid: string) => `emailed:${txid}`
export const pagoManualKey = (txid: string) => `email:pago:manual:${txid}`
export const pagoManualLockKey = (txid: string) => `email:pago:manual:lock:${txid}`

async function lerOuNull(key: string): Promise<string | null> {
  try {
    return (await kvGet(key)) || null
  } catch {
    return null
  }
}

export async function getEmailManualEm(txid: string): Promise<string | null> {
  return lerOuNull(abandonManualKey(txid))
}

export async function getEmailsPagoEm(txid: string): Promise<{ automaticoEm: string | null; manualEm: string | null }> {
  const [automaticoEm, manualEm] = await Promise.all([lerOuNull(confirmacaoAutoKey(txid)), lerOuNull(pagoManualKey(txid))])
  return { automaticoEm, manualEm }
}
