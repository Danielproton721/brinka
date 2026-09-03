import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/admin-auth";
import {
  addTarget,
  clearLog,
  getGlobalSecret,
  getLog,
  getTargets,
  removeTarget,
  setGlobalSecret,
  updateTarget,
  kvConfigured,
} from "@/lib/relay";
import { usingSeparateKv, relayKvDiag } from "@/lib/relay-kv";
import { getActiveGateway } from "@/lib/gateways/active";

export const dynamic = "force-dynamic";

// Lista as lojas conectadas + o log de eventos recentes.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const [targets, log, activeGateway] = await Promise.all([getTargets(), getLog(60), getActiveGateway()]);
  const globalSecret = (await getGlobalSecret()) || null;
  return NextResponse.json({
    kvOk: kvConfigured(),
    separateKv: usingSeparateKv(),
    env: relayKvDiag(),
    globalSecret,
    targets,
    log,
    // Esta loja COMO CLIENTE de um relay externo (o que a v0 mostra).
    // O relay é EXCLUSIVO da Pagou.ai — a URL destino é sempre o webhook dela.
    client: {
      activeGateway,
      pagouActive: activeGateway === "pagou",
      webhookPath: "/api/webhooks/pagouai",
      relaySecret: (process.env.RELAY_SECRET || "").trim(),
      notifyOverride: (process.env.NOTIFY_URL_OVERRIDE || "").trim(),
    },
  });
}

// Conecta uma loja nova: recebe { name, url } e devolve a chave + segredo gerados.
export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!kvConfigured()) {
    return NextResponse.json({ error: "KV (Upstash) não configurado." }, { status: 409 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = String(body?.name ?? "");
  const url = String(body?.url ?? "").trim();
  // url é OPCIONAL aqui: dá pra conectar só com o apelido (pra gerar o prompt do
  // agente) e preencher o webhook de destino depois. Se vier, valida o formato.
  if (url && !/^https?:\/\/.+/i.test(url)) {
    return NextResponse.json({ error: "URL de destino inválida (use https://...)." }, { status: 400 });
  }
  const key = body?.key ? String(body.key) : undefined;
  const secret = body?.secret ? String(body.secret) : undefined;
  try {
    const target = await addTarget(name, url, key, secret);
    return NextResponse.json({ ok: true, target });
  } catch (e: any) {
    // Causa comum: token Read-Only do Upstash bloqueia a escrita.
    return NextResponse.json(
      { error: `Falha ao gravar no KV: ${e?.message || "erro"}. Se o token do Upstash for Read-Only, troque pelo token completo.` },
      { status: 502 },
    );
  }
}

// Edita apelido/webhook de destino de uma loja já conectada.
export async function PUT(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  // Definir o segredo único do relay (guardado no KV, sem env).
  if (body?.globalSecret !== undefined) {
    try {
      await setGlobalSecret(String(body.globalSecret));
      return NextResponse.json({ ok: true, globalSecret: (await getGlobalSecret()) || null });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Erro ao salvar o segredo." }, { status: 409 });
    }
  }
  const key = String(body?.key ?? "").trim();
  if (!key) {
    return NextResponse.json({ error: "chave obrigatória." }, { status: 400 });
  }
  const patch: { name?: string; url?: string } = {};
  if (body?.name !== undefined) patch.name = String(body.name);
  if (body?.url !== undefined) {
    const url = String(body.url).trim();
    if (url && !/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: "URL de destino inválida (use https://...)." }, { status: 400 });
    }
    patch.url = url;
  }
  const target = await updateTarget(key, patch);
  if (!target) {
    return NextResponse.json({ error: "loja não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, target });
}

// Remove uma loja conectada.
export async function DELETE(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  // Limpar o log de tráfego (zera a lista de eventos).
  if (params.get("clear") === "log") {
    await clearLog();
    return NextResponse.json({ ok: true });
  }
  const key = params.get("key") || "";
  if (!key) {
    return NextResponse.json({ error: "chave obrigatória." }, { status: 400 });
  }
  await removeTarget(key);
  return NextResponse.json({ ok: true });
}
