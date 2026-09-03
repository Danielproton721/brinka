import { renderOrderConfirmationEmail, renderAbandonedCartEmail, renderShippedEmail } from "@/lib/order-email";

export const dynamic = "force-dynamic";

// Preview dos e-mails com dados de exemplo. ?tipo=pendente | postado; sem param
// mostra o de confirmação. Dados fake, não toca em nada real.
export async function GET(request: Request) {
  const tipo = new URL(request.url).searchParams.get("tipo");
  const order = {
    orderCode: "MV-8F3A2K",
    customer: { name: "João Silva", email: "joao@email.com", phone: "(91) 99999-8888" },
    address: {
      cep: "68650-000",
      street: "Rua das Palmeiras",
      number: "128",
      complement: "Casa 2",
      neighborhood: "Centro",
      city: "Belém",
      stateUF: "PA",
    },
    items: [
      { id: 101, name: "Caminhão Dinossauro Engole Carrinhos — Versão Pista", image: "/fotos/pista/cegonha-dino.jpg", price: 89.98, quantity: 1 },
    ],
    subtotal: 89.98,
    shipping: 0,
    discount: 4.5,
    coupon: "PRIMEIRACOMPRA",
    total: 85.48,
    paymentMethod: "pix" as const,
  };
  const { html } =
    tipo === "pendente"
      ? renderAbandonedCartEmail(order)
      : tipo === "postado"
        ? renderShippedEmail(order, "PB482910375BR")
        : renderOrderConfirmationEmail(order);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
