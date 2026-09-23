import { NextResponse } from "next/server"

import { recordPaymentStatus } from "@/lib/payment-status"
import { getOrder } from "@/lib/order-store"
import { dispatchOrderEmailOnce } from "@/lib/send-order-email"
import { isOrderPaid, markOrderPaid } from "@/lib/orders"
import { scheduleShippedNotify } from "@/lib/qstash"
import { getStatusBeehive, isRefundedStatusBeehive } from "@/lib/gateways/beehive"

export const dynamic = "force-dynamic"

// Postback da Beehive (postbackUrl da transação), sem assinatura documentada:
// { id, type: "transaction" | "checkout" | "transfer", objectId, url, data: {...} }.
// O corpo não libera nada — o pagamento é confirmado no GET da própria API.

function extractId(body: any): string | null {
  const d = body?.data ?? {}
  const id = d?.id ?? body?.objectId ?? null
  return id != null ? String(id) : null
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "beehive-webhook" })
}

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true, handled: false, reason: "corpo-invalido" })
  }

  const tipo = String(body?.type ?? "").toLowerCase()
  if (tipo && tipo !== "transaction") {
    return NextResponse.json({ ok: true, handled: false, reason: `evento-${tipo}` })
  }

  const txid = extractId(body)
  if (!txid) return NextResponse.json({ ok: true, handled: false, reason: "sem-id" })

  const st = await getStatusBeehive(txid)

  if (isRefundedStatusBeehive(st.ok ? st.status : body?.data?.status)) {
    await recordPaymentStatus({
      event: "beehive.refunded",
      transactionId: txid,
      status: st.ok ? st.status : "refunded",
      paymentMethod: "pix",
      updatedAt: new Date().toISOString(),
    }).catch(() => {})
    console.warn("[BEEHIVE WEBHOOK] estorno recebido:", txid)
    return NextResponse.json({ ok: true, handled: true, refunded: true })
  }

  if (!st.ok || !st.paid) {
    return NextResponse.json({ ok: true, handled: false, reason: "nao-pago", status: st.status })
  }

  // A Beehive avisa a cada mudança de status: não reprocessa pedido já pago.
  if (await isOrderPaid(txid).catch(() => false)) {
    return NextResponse.json({ ok: true, handled: true, deduped: true })
  }

  await recordPaymentStatus({
    event: "beehive.webhook",
    transactionId: txid,
    status: "paid",
    paymentMethod: "pix",
    updatedAt: new Date().toISOString(),
  }).catch(() => {})

  try {
    await markOrderPaid(txid)
  } catch (err) {
    console.error("[BEEHIVE WEBHOOK] erro ao marcar pago no painel:", err)
  }

  try {
    const order = await getOrder(txid)
    if (order) {
      const result = await dispatchOrderEmailOnce(txid, order)
      console.log("[BEEHIVE WEBHOOK] e-mail:", {
        txid,
        outcome: result.ok ? (result.deduped ? "ja-enviado" : `enviado:${result.id ?? ""}`) : `falha:${result.error}`,
      })
    } else {
      console.warn("[BEEHIVE WEBHOOK] pedido nao encontrado no KV para txid", txid)
    }
  } catch (err) {
    console.error("[BEEHIVE WEBHOOK] erro ao despachar e-mail:", err)
  }

  await scheduleShippedNotify(txid)

  return NextResponse.json({ ok: true, handled: true })
}
