import { NextResponse } from "next/server"

import { recordPaymentStatus } from "@/lib/payment-status"
import { getOrder } from "@/lib/order-store"
import { dispatchOrderEmailOnce } from "@/lib/send-order-email"
import { isOrderPaid, markOrderPaid } from "@/lib/orders"
import { scheduleShippedNotify } from "@/lib/qstash"
import { getStatusMedusa, verifyMedusaSignature } from "@/lib/gateways/medusa"

export const dynamic = "force-dynamic"

// Chega por metadata.postback_url (sem assinatura) ou pelo webhook cadastrado no
// painel da MedusaPay (assinado). Payload: { evento, eventId, dados: { vendaId, status, simulada } }.

function extractId(body: any): string | null {
  const d = body?.dados ?? body?.data ?? body?.venda ?? {}
  const id = d?.vendaId ?? d?.id ?? body?.vendaId ?? null
  return id != null ? String(id) : null
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "medusa-webhook" })
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (verifyMedusaSignature(rawBody, request.headers.get("x-medusa-signature")) === false) {
    console.warn("[MEDUSA WEBHOOK] assinatura invalida — descartado")
    return NextResponse.json({ ok: false, error: "assinatura-invalida" }, { status: 401 })
  }

  let body: any
  try {
    body = rawBody ? JSON.parse(rawBody) : null
  } catch {
    return NextResponse.json({ ok: true, handled: false, reason: "corpo-invalido" })
  }

  const evento = String(body?.evento ?? body?.event ?? "").toLowerCase()
  const eventId = body?.eventId ? String(body.eventId) : null

  if (evento.startsWith("transfer.")) {
    return NextResponse.json({ ok: true, handled: false, reason: "evento-de-saque" })
  }
  if (body?.dados?.simulada === true) {
    return NextResponse.json({ ok: true, handled: false, reason: "venda-simulada" })
  }

  const txid = extractId(body)
  if (!txid) return NextResponse.json({ ok: true, handled: false, reason: "sem-id" })

  // O corpo não libera nada: a confirmação vem da própria API da MedusaPay.
  const st = await getStatusMedusa(txid)

  if (evento === "payment.refunded") {
    await recordPaymentStatus({
      event: "medusa.refunded",
      transactionId: txid,
      status: st.ok ? st.status : "estornado",
      paymentMethod: "pix",
      updatedAt: new Date().toISOString(),
    }).catch(() => {})
    console.warn("[MEDUSA WEBHOOK] estorno recebido:", { txid, eventId })
    return NextResponse.json({ ok: true, handled: true, refunded: true })
  }

  if (!st.ok || !st.paid) {
    return NextResponse.json({ ok: true, handled: false, reason: "nao-pago", status: st.status })
  }

  // Painel e postback podem entregar o mesmo pagamento, e a Medusa re-tenta.
  if (await isOrderPaid(txid).catch(() => false)) {
    return NextResponse.json({ ok: true, handled: true, deduped: true })
  }

  await recordPaymentStatus({
    event: "medusa.webhook",
    transactionId: txid,
    status: "paid",
    paymentMethod: "pix",
    updatedAt: new Date().toISOString(),
  }).catch(() => {})

  try {
    await markOrderPaid(txid)
  } catch (err) {
    console.error("[MEDUSA WEBHOOK] erro ao marcar pago no painel:", err)
  }

  try {
    const order = await getOrder(txid)
    if (order) {
      const result = await dispatchOrderEmailOnce(txid, order)
      console.log("[MEDUSA WEBHOOK] e-mail:", {
        txid,
        eventId,
        outcome: result.ok ? (result.deduped ? "ja-enviado" : `enviado:${result.id ?? ""}`) : `falha:${result.error}`,
      })
    } else {
      console.warn("[MEDUSA WEBHOOK] pedido nao encontrado no KV para txid", txid)
    }
  } catch (err) {
    console.error("[MEDUSA WEBHOOK] erro ao despachar e-mail:", err)
  }

  await scheduleShippedNotify(txid)

  return NextResponse.json({ ok: true, handled: true })
}
