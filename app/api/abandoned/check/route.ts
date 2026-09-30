import { NextResponse } from "next/server";
import { getOrder } from "@/lib/order-store";
import { isOrderPaid } from "@/lib/orders";
import { kvConfigured, kvSetNx } from "@/lib/kv-store";
import { sendAbandonedCartEmail, validateOrderInput } from "@/lib/send-order-email";
import { CHEGADA_ULTIMA_KEY, abandonedSig, lerParametrosAgendados, registrarDiagnostico } from "@/lib/qstash";

export const dynamic = "force-dynamic";

// Chamado pelo QStash alguns minutos após a criação do PIX. Se o pedido NÃO foi
// pago, dispara o e-mail de pedido pendente — uma única vez (trava NX no KV).
// Cada chegada fica registrada (sem dado do cliente) pro painel mostrar se o
// agendamento está chegando e com qual resultado.
async function handle(request: Request) {
  const { txid, sig } = await lerParametrosAgendados(request);

  const fim = async (motivo: string, status = 200, extra: Record<string, unknown> = {}) => {
    await registrarDiagnostico(CHEGADA_ULTIMA_KEY, { rota: "abandoned", txidFinal: txid ? txid.slice(-8) : null, motivo });
    return NextResponse.json({ ok: status === 200, handled: motivo === "enviado", reason: motivo, ...extra }, { status });
  };

  if (!txid) return fim("sem-txid");

  // Assinatura: o link foi gerado pelo pix/create com o sig correto do txid.
  if (sig !== abandonedSig(txid)) return fim("assinatura-invalida", 401);

  if (!kvConfigured()) return fim("sem-kv");

  try {
    if (await isOrderPaid(txid)) return fim("ja-pago");

    const order = await getOrder(txid);
    if (!order) return fim("sem-snapshot");
    if (validateOrderInput(order)) return fim("snapshot-invalido");

    // Trava: nunca manda 2x (TTL 48h).
    const won = await kvSetNx(`abandon:sent:${txid}`, "1", 60 * 60 * 48);
    if (!won) return fim("ja-enviado");

    const result = await sendAbandonedCartEmail(order);
    if (!result.ok) {
      console.error(`[ABANDONED CHECK] Falha ao enviar (${txid}):`, result.error);
      return fim("falha-no-envio", 200, { erro: result.error });
    }
    return fim("enviado");
  } catch (e) {
    console.error("[ABANDONED CHECK] Erro inesperado:", e);
    return fim("erro");
  }
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}
