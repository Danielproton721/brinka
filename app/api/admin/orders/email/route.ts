import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import { kvDel, kvGet, kvSet, kvSetNx } from "@/lib/kv-store"
import {
  MANUAL_CTA_HREF,
  abandonManualKey,
  abandonManualLockKey,
  abandonSentKey,
  isTipoEmailManual,
} from "@/lib/manual-email"
import { getOrder } from "@/lib/order-store"
import { isOrderPaid } from "@/lib/orders"
import { sendAbandonedCartEmail, validateOrderInput } from "@/lib/send-order-email"

export const dynamic = "force-dynamic"

const LOCK_TTL_SECONDS = 60
const MANUAL_TTL_SECONDS = 60 * 60 * 24 * 30
const SENT_TTL_SECONDS = 60 * 60 * 48

const erro = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: false, error, ...extra }, { status })

export async function POST(request: Request) {
  if (!(await isAuthed())) return erro(401, "Não autorizado.")

  let body: any
  try {
    body = await request.json()
  } catch {
    return erro(400, "JSON inválido.")
  }

  const txid = typeof body?.txid === "string" ? body.txid.trim() : ""
  if (!txid || txid.length > 200) return erro(400, "txid obrigatório.")
  if (!isTipoEmailManual(body?.tipo)) return erro(400, "Tipo de e-mail inválido.")
  const confirmarReenvio = body?.confirmarReenvio === true

  const order = await getOrder(txid)
  if (!order) return erro(404, "Pedido não encontrado — pode ter expirado (o pedido fica guardado por 48h).")

  const invalido = validateOrderInput(order)
  if (invalido) return erro(422, invalido)

  if (await isOrderPaid(txid)) return erro(409, "Pedido já pago.")

  const [sentVal, manualEm] = await Promise.all([kvGet(abandonSentKey(txid)), kvGet(abandonManualKey(txid))])
  if ((sentVal || manualEm) && !confirmarReenvio) {
    return erro(409, "Esse cliente já recebeu este e-mail.", {
      jaEnviado: {
        // "manual" nessa trava foi gravado por esta rota, não pelo QStash.
        automatico: Boolean(sentVal) && sentVal !== "manual",
        manualEm: manualEm || null,
      },
    })
  }

  const lockKey = abandonManualLockKey(txid)
  if (!(await kvSetNx(lockKey, "1", LOCK_TTL_SECONDS))) {
    return erro(429, "Já tem um envio em andamento pra esse pedido. Aguarde um minuto e tente de novo.")
  }

  const result = await sendAbandonedCartEmail(order, { ctaHref: MANUAL_CTA_HREF })
  if (!result.ok) {
    await kvDel(lockKey).catch(() => {})
    return erro(result.status, result.error)
  }

  const enviadoEm = new Date().toISOString()
  try {
    await kvSet(abandonManualKey(txid), enviadoEm, MANUAL_TTL_SECONDS)
    // Se o automático ainda não rodou, ele encontra a trava e não duplica.
    await kvSetNx(abandonSentKey(txid), "manual", SENT_TTL_SECONDS)
  } catch (e) {
    console.error("[MANUAL EMAIL] e-mail enviado, mas falhou ao registrar no KV:", txid, e)
  }

  return NextResponse.json({ ok: true, enviadoEm })
}
