import { NextResponse } from "next/server";
import { type OrderEmailInput } from "@/lib/order-email";
import { dispatchOrderEmailOnce, validateOrderInput } from "@/lib/send-order-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // O front pode enviar `txid` para coordenar a idempotência com o webhook.
  const { txid, ...order } = body ?? {};
  const validationError = validateOrderInput(order as Partial<OrderEmailInput>);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Chave de idempotência: txid (compartilhada com o webhook) ou, na ausência
  // dele, o próprio código do pedido.
  const idempotencyKey = String(txid || order.orderCode);
  const result = await dispatchOrderEmailOnce(idempotencyKey, order as OrderEmailInput);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, id: result.id ?? null, deduped: result.deduped ?? false });
}
