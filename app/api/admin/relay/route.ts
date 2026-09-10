import { NextResponse } from "next/server";

import { isAuthed } from "@/lib/admin-auth";
import { getActiveGateway } from "@/lib/gateways/active";
import { getRelayConfig, relayConfigPersiste, setRelayConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";

// Estado do relay para o painel — esta loja é sempre a LOJA DE TRÁS.
//
// O gateway avisa a LOJA DA FRENTE, que repassa pra cá. Ela nunca é a da
// frente, então não há lojas conectadas nem log de tráfego pra administrar —
// isso vive no painel da loja da frente.
//
// O liga/desliga fica no KV. A env NOTIFY_URL_OVERRIDE segue como fallback:
// sem KV, ou enquanto ninguém tocar no botão, vale o que está no ambiente.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [activeGateway, relay] = await Promise.all([getActiveGateway(), getRelayConfig()]);

  return NextResponse.json({
    activeGateway,
    client: {
      // Porta única: um cadastro na loja da frente serve os três gateways.
      webhookPath: "/api/webhooks/relay-in",
      secretSet: Boolean((process.env.RELAY_SECRET || "").trim()),
      notifyOverride: relay.url,
      relayEnabled: relay.enabled,
      // Sem KV o botão não guarda a escolha — o painel avisa em vez de fingir
      // que salvou.
      canToggle: relayConfigPersiste(),
    },
  });
}

// Liga/desliga o relay e, se vier, atualiza a URL da loja da frente.
export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!relayConfigPersiste()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sem Upstash (KV) configurado a escolha não fica salva. Provisione o KV na Vercel, ou use a variável NOTIFY_URL_OVERRIDE.",
      },
      { status: 409 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const patch: { enabled?: boolean; url?: string } = {};
  if (typeof body?.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body?.url === "string") {
    const u = body.url.trim();
    // Vazio é permitido (limpa o campo); se vier algo, tem que ser http(s).
    if (u && !/^https?:\/\/.+/i.test(u)) {
      return NextResponse.json(
        { ok: false, error: "A URL precisa começar com http:// ou https://" },
        { status: 400 },
      );
    }
    patch.url = u;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada pra salvar." }, { status: 400 });
  }

  const relay = await setRelayConfig(patch);
  return NextResponse.json({ ok: true, relay });
}
