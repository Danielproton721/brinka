import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import { kvDel, kvGet, kvSet, kvSetNx } from "@/lib/kv-store"
import {
  MANUAL_CTA_COMBO,
  MANUAL_CTA_HREF,
  MIN_PRODUTOS_COMBO,
  OFERTA_COMBO,
  abandonManualKey,
  abandonManualLockKey,
  abandonSentKey,
  confirmacaoAutoKey,
  isTipoEmailManual,
  pagoManualKey,
  pagoManualLockKey,
} from "@/lib/manual-email"
import { getOrder, type StoredOrder } from "@/lib/order-store"
import { isOrderPaid } from "@/lib/orders"
import { sendAbandonedCartEmail, sendOrderEmail, validateOrderInput } from "@/lib/send-order-email"

export const dynamic = "force-dynamic"

const LOCK_TTL_SECONDS = 60
const SENT_TTL_SECONDS = 60 * 60 * 48
// O registro do envio manual não tem prazo: fica junto do pedido, que é permanente.

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

  const pago = await isOrderPaid(txid)
  if (body.tipo === "pago") {
    if (!pago) return erro(409, "Pagamento ainda não confirmado — use o e-mail de pedido pendente.")
    return enviarPagamentoConfirmado(txid, order, confirmarReenvio)
  }

  if (pago) return erro(409, "Pedido já pago — use o e-mail de pagamento confirmado.")

  const comDesconto = body.tipo === "pendente-desconto"
  if (comDesconto && (order.items?.length ?? 0) < MIN_PRODUTOS_COMBO) {
    return erro(422, `O desconto só vale para pedido com ${MIN_PRODUTOS_COMBO} produtos diferentes.`)
  }
  return enviarPedidoPendente(txid, order, confirmarReenvio, comDesconto)
}

async function enviarPedidoPendente(
  txid: string,
  order: StoredOrder,
  confirmarReenvio: boolean,
  comDesconto: boolean,
) {
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

  const result = comDesconto
    ? await sendAbandonedCartEmail(order, { ctaHref: MANUAL_CTA_COMBO, oferta: OFERTA_COMBO })
    : await sendAbandonedCartEmail(order, { ctaHref: MANUAL_CTA_HREF })
  if (!result.ok) {
    await kvDel(lockKey).catch(() => {})
    return erro(result.status, result.error)
  }

  const enviadoEm = new Date().toISOString()
  try {
    await kvSet(abandonManualKey(txid), enviadoEm)
    // Se o automático ainda não rodou, ele encontra a trava e não duplica.
    await kvSetNx(abandonSentKey(txid), "manual", SENT_TTL_SECONDS)
  } catch (e) {
    console.error("[MANUAL EMAIL] e-mail enviado, mas falhou ao registrar no KV:", txid, e)
  }

  return NextResponse.json({ ok: true, enviadoEm })
}

// Mesmo template do e-mail automático do webhook. Envia direto (sem
// dispatchOrderEmailOnce): a trava daquele envio já existe quando o automático
// saiu, e aqui a intenção é justamente mandar de novo.
async function enviarPagamentoConfirmado(txid: string, order: StoredOrder, confirmarReenvio: boolean) {
  const [automaticoEm, manualEm] = await Promise.all([kvGet(confirmacaoAutoKey(txid)), kvGet(pagoManualKey(txid))])
  if ((automaticoEm || manualEm) && !confirmarReenvio) {
    return erro(409, "Esse cliente já recebeu este e-mail.", {
      jaEnviado: {
        automatico: Boolean(automaticoEm),
        automaticoEm: automaticoEm || null,
        manualEm: manualEm || null,
      },
    })
  }

  const lockKey = pagoManualLockKey(txid)
  if (!(await kvSetNx(lockKey, "1", LOCK_TTL_SECONDS))) {
    return erro(429, "Já tem um envio em andamento pra esse pedido. Aguarde um minuto e tente de novo.")
  }

  const result = await sendOrderEmail(order)
  if (!result.ok) {
    await kvDel(lockKey).catch(() => {})
    return erro(result.status, result.error)
  }

  const enviadoEm = new Date().toISOString()
  try {
    await kvSet(pagoManualKey(txid), enviadoEm)
  } catch (e) {
    console.error("[MANUAL EMAIL] confirmação enviada, mas falhou ao registrar no KV:", txid, e)
  }

  return NextResponse.json({ ok: true, enviadoEm })
}
