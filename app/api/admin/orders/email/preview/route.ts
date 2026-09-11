import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import { MANUAL_CTA_HREF, isTipoEmailManual } from "@/lib/manual-email"
import { renderAbandonedCartEmail } from "@/lib/order-email"
import { getOrder } from "@/lib/order-store"
import { validateOrderInput } from "@/lib/send-order-email"

export const dynamic = "force-dynamic"

const erro = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status })

export async function GET(request: Request) {
  if (!(await isAuthed())) return erro(401, "Não autorizado.")

  const params = new URL(request.url).searchParams
  const txid = (params.get("txid") || "").trim()
  const tipo = params.get("tipo") || "abandonado"
  if (!txid) return erro(400, "txid obrigatório.")
  if (!isTipoEmailManual(tipo)) return erro(400, "Tipo de e-mail inválido.")

  const order = await getOrder(txid)
  if (!order) return erro(404, "Pedido não encontrado — pode ter expirado (o pedido fica guardado por 48h).")

  const invalido = validateOrderInput(order)
  if (invalido) return erro(422, invalido)

  const { subject, html } = renderAbandonedCartEmail(order, { ctaHref: MANUAL_CTA_HREF })

  if (params.get("formato") === "json") {
    return NextResponse.json({ ok: true, para: order.customer.email, assunto: subject })
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      // Nome e itens vêm do cliente; renderizados na origem do painel, sem script.
      "content-security-policy": "sandbox",
    },
  })
}
