import type { OrderEmailInput } from "./order-email";

// Pedido de exemplo usado pelo preview (/api/email/preview) e pelo teste de
// envio do painel. Fica num arquivo só para os dois mostrarem exatamente o
// mesmo e-mail — se o teste usasse outro pedido, o que você vê no preview não
// seria o que chega na caixa de entrada.
export const SAMPLE_TRACKING_CODE = "PB482910375BR";

export function sampleOrder(overrides: Partial<OrderEmailInput> = {}): OrderEmailInput {
  return {
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
      {
        id: 101,
        name: "Caminhão Dinossauro Engole Carrinhos — Versão Pista",
        image: "/fotos/pista/cegonha-dino.jpg",
        price: 89.98,
        quantity: 1,
      },
    ],
    subtotal: 89.98,
    shipping: 0,
    discount: 4.5,
    coupon: "PRIMEIRACOMPRA",
    total: 85.48,
    paymentMethod: "pix",
    ...overrides,
  };
}
