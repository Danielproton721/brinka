import { renderOrderConfirmationEmail, renderAbandonedCartEmail, renderShippedEmail } from "@/lib/order-email";
import { sampleOrder, SAMPLE_TRACKING_CODE } from "@/lib/order-email-sample";

export const dynamic = "force-dynamic";

// Preview dos e-mails com dados de exemplo. ?tipo=pendente | postado; sem param
// mostra o de confirmação. Dados fake, não toca em nada real — é o MESMO pedido
// que a aba "E-mail" do painel usa no envio de teste.
export async function GET(request: Request) {
  const tipo = new URL(request.url).searchParams.get("tipo");
  const order = sampleOrder();
  const { html } =
    tipo === "pendente"
      ? renderAbandonedCartEmail(order)
      : tipo === "postado"
        ? renderShippedEmail(order, SAMPLE_TRACKING_CODE)
        : renderOrderConfirmationEmail(order);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
