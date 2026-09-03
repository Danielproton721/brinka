import { NextResponse } from "next/server";

// ============================================================================
//  RELAY DE WEBHOOK (MÁSCARA)
//
//  Esta loja pode servir de FACHADA pra outra loja: a Pagou.ai chama ESTE
//  endpoint (domínio desta loja), e ele repassa o evento pro webhook da loja
//  de TRÁS — que nunca é revelada ao gateway.
//
//        Pagou.ai ──► (esta loja)/api/webhooks/payment ──► LOJA DE TRÁS (oculta)
//
//  Variáveis (setar SÓ quando esta loja for usada como máscara):
//   • RELAY_TARGET_URL     — webhook da loja de trás, ex.:
//                            https://LOJA-REAL/api/webhooks/pagouai
//   • RELAY_FORWARD_SECRET — segredo enviado no header x-relay-secret pra a loja
//                            de trás validar (deve bater com o RELAY_SECRET dela).
//
//  Sem RELAY_TARGET_URL o endpoint é inócuo (responde 200 e não faz nada). Isso
//  NÃO interfere no /api/webhooks/pagouai desta loja, que processa os pagamentos
//  dela própria — são endpoints separados.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const target = process.env.RELAY_TARGET_URL?.trim();
  const secret = process.env.RELAY_FORWARD_SECRET?.trim();

  const body = await request.text();

  // Relay não configurado: 200 pra Pagou não ficar re-tentando. No-op.
  if (!target) {
    return NextResponse.json({ ok: true });
  }

  try {
    const resp = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        ...(secret ? { "x-relay-secret": secret } : {}),
      },
      body,
      cache: "no-store",
    });
    const text = await resp.text();
    return new NextResponse(text || JSON.stringify({ ok: true }), {
      status: resp.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    // Loja de trás fora do ar: 502 pra Pagou re-tentar depois (não perde evento).
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
