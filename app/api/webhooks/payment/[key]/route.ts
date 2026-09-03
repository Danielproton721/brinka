import { NextResponse } from "next/server";
import { getGlobalSecret, getTarget, logEvent, summarizePayload } from "@/lib/relay";

// ============================================================================
//  HUB DE RELAY (por loja) — a Pagou chama /api/webhooks/payment/<chave> e o
//  hub repassa pro webhook da loja daquela chave, logando o evento pro painel.
//  A loja de trás nunca é revelada ao gateway.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const body = await request.text();
  const info = summarizePayload(body);

  const target = await getTarget(key);

  if (!target) {
    await logEvent({ key, name: "(chave desconhecida)", forwarded: false, error: "loja não conectada", payload: body.slice(0, 2000), ...info });
    // 200 pra Pagou não ficar re-tentando eternamente uma chave inexistente.
    return NextResponse.json({ ok: true, note: "no target" });
  }

  if (!target.url) {
    await logEvent({ key, name: target.name, forwarded: false, error: "sem webhook de destino ainda", payload: body.slice(0, 2000), ...info });
    return NextResponse.json({ ok: true, note: "no destination yet" });
  }

  try {
    // Repassa os cabeçalhos originais do gateway (ex.: a assinatura do webhook)
    // pra a loja de trás validar como se recebesse direto. Só removemos os que
    // não fazem sentido repassar (host/tamanho/hop-by-hop) e injetamos o
    // x-relay-secret. Assim funciona tanto se a loja valida a assinatura da
    // Pagou quanto se valida só o x-relay-secret.
    const fwdHeaders = new Headers();
    request.headers.forEach((value, name) => {
      const n = name.toLowerCase();
      if (["host", "content-length", "connection", "transfer-encoding", "keep-alive"].includes(n)) return;
      fwdHeaders.set(name, value);
    });
    if (!fwdHeaders.has("content-type")) fwdHeaders.set("content-type", "application/json");
    // Segredo GLOBAL do relay (definido no painel, guardado no KV): o mesmo pra
    // todas as lojas, sem sincronizar por loja. Se não houver, cai no segredo
    // por-loja (compatibilidade).
    const forwardSecret = (await getGlobalSecret()) || target.secret;
    fwdHeaders.set("x-relay-secret", forwardSecret);

    const resp = await fetch(target.url, {
      method: "POST",
      headers: fwdHeaders,
      body,
      cache: "no-store",
    });
    const text = await resp.text();
    await logEvent({
      key,
      name: target.name,
      forwarded: true,
      forwardStatus: resp.status,
      payload: body.slice(0, 2000),
      response: text.slice(0, 1000),
      ...info,
    });
    return new NextResponse(text || JSON.stringify({ ok: true }), {
      status: resp.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    await logEvent({ key, name: target.name, forwarded: false, error: "falha ao repassar", payload: body.slice(0, 2000), ...info });
    // 502 → a Pagou re-tenta o webhook depois (não perde o evento).
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
