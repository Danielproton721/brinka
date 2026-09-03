import { NextResponse } from "next/server";
import { addTarget, getGlobalSecret, getTargets, updateTarget } from "@/lib/relay";

// ============================================================================
//  AUTO-REGISTRO — a loja de trás se cadastra sozinha no relay.
//
//  A loja de trás chama este endpoint mandando o webhook dela (url de destino)
//  e o segredo único (x-relay-secret). Se o segredo bate, o relay cria/atualiza
//  a loja e devolve a chave + o notify_url pronto pra ela usar.
//
//  Assim conectar uma loja nova = colar 1 prompt no agente dela; ele registra
//  sozinho e a loja aparece no painel ja conectada. Zero cadastro manual.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const globalSecret = await getGlobalSecret();
  if (!globalSecret) {
    return NextResponse.json(
      { ok: false, error: "Relay sem segredo unico definido. Defina no painel /admin (aba Relay)." },
      { status: 409 },
    );
  }

  const provided = (request.headers.get("x-relay-secret") || "").trim();
  if (provided !== globalSecret) {
    return NextResponse.json({ ok: false, error: "x-relay-secret invalido." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const url = String(body?.url || "").trim();
  if (!/^https?:\/\/.+/i.test(url)) {
    return NextResponse.json({ ok: false, error: "url do webhook invalida (use https://...)." }, { status: 400 });
  }
  const name = String(body?.name || "").trim();

  // Se já existe uma loja com exatamente esse webhook, reusa (idempotente).
  const targets = await getTargets();
  const existing = Object.values(targets).find((t) => t.url === url);
  const target = existing
    ? (name ? (await updateTarget(existing.key, { name })) ?? existing : existing)
    : await addTarget(name || "Loja", url);

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    ok: true,
    key: target.key,
    notifyUrl: `${origin}/api/webhooks/payment/${target.key}`,
    relaySecret: globalSecret,
  });
}
