import { NextResponse } from "next/server";

import { isAuthed } from "@/lib/admin-auth";
import { getActiveGateway } from "@/lib/gateways/active";

export const dynamic = "force-dynamic";

// Estado do relay para o painel — só o lado CLIENTE.
//
// Esta loja é a LOJA DE TRÁS: o gateway avisa a LOJA DA FRENTE, que repassa
// pra cá. Ela nunca é a da frente, então não há lojas conectadas, log de
// tráfego nem cadastro a administrar — isso vive no painel da loja da frente.
//
// O que a loja precisa em produção:
//   • NOTIFY_URL_OVERRIDE — a URL da loja da frente, que esta informa ao gateway no lugar
//     do próprio domínio. Sem ela, o gateway enxerga o endereço real daqui.
//   • RELAY_SECRET — o segredo combinado com a loja da frente. Os webhooks só aceitam
//     avisos que cheguem com ele no header x-relay-secret.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const activeGateway = await getActiveGateway();

  return NextResponse.json({
    activeGateway,
    client: {
      // Porta única: um cadastro na loja da frente serve os três gateways.
      webhookPath: "/api/webhooks/relay-in",
      secretSet: Boolean((process.env.RELAY_SECRET || "").trim()),
      notifyOverride: (process.env.NOTIFY_URL_OVERRIDE || "").trim(),
    },
  });
}
