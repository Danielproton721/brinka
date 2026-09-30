// Agendamento de chamadas com atraso via QStash (Upstash). Usado pra disparar o
// e-mail de pedido pendente X minutos depois da criação do PIX, mesmo que o
// cliente feche a aba. Sem QSTASH_TOKEN configurado, vira no-op seguro.
import { createHmac } from "crypto";
import { kvSetJSON } from "./kv-store";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
// Base do QStash. Varia por região (ex.: https://qstash-us-east-1.upstash.io).
const QSTASH_BASE = (process.env.QSTASH_URL || "https://qstash.upstash.io").replace(/\/$/, "");

export function qstashConfigured(): boolean {
  return Boolean(QSTASH_TOKEN);
}

// Assinatura do callback (não expõe chave crua na URL do QStash).
function callbackSecret() {
  return (
    process.env.ABANDONED_SECRET ||
    process.env.CHECKOUT_SESSION_SECRET ||
    process.env.PAGOUAI_SECRET_KEY ||
    "dev-abandoned-secret"
  );
}
export function abandonedSig(txid: string): string {
  return createHmac("sha256", callbackSecret()).update(txid).digest("hex").slice(0, 32);
}

// Agenda o e-mail de "pedido postado" ~1h após o pagamento confirmado (chamado
// dos webhooks). Best-effort: sem QSTASH_TOKEN/domínio, é no-op.
const SHIPPED_DELAY_MIN = 60;
export async function scheduleShippedNotify(txid: string): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!qstashConfigured() || !appUrl || !txid) return;
  try {
    const callback = `${appUrl}/api/shipped/notify?txid=${encodeURIComponent(txid)}&sig=${abandonedSig(txid)}`;
    await scheduleDelayedCall(callback, SHIPPED_DELAY_MIN * 60);
  } catch (err) {
    console.error("[QStash] Falha ao agendar e-mail de postado:", err);
  }
}

// Registro do último agendamento e da última chegada — o painel lê isto
// (/api/admin/diagnostico-emails) pra mostrar se o e-mail de pendente está
// saindo. Antes a falha só aparecia no log da Vercel e ficou dias sem ninguém ver.
export const QSTASH_ULTIMO_KEY = "qstash:ultimo";
export const CHEGADA_ULTIMA_KEY = "qstash:chegada:ultima";

export async function registrarDiagnostico(chave: string, dados: Record<string, unknown>): Promise<void> {
  try {
    await kvSetJSON(chave, { em: new Date().toISOString(), ...dados }, 60 * 60 * 24 * 30);
  } catch {
    // diagnóstico nunca derruba o fluxo
  }
}

// Agenda um POST para `destinationUrl` daqui a `delaySeconds` segundos.
//
// Os parâmetros (txid, sig) vão no CORPO da mensagem, e o destino é publicado
// sem query string: com "?txid=...&sig=..." colado no caminho do QStash, a
// query pode ser lida como parâmetro da própria chamada ao QStash e não chegar
// na loja — a rota recebia a chamada vazia e desistia calada ("sem-txid").
export async function scheduleDelayedCall(destinationUrl: string, delaySeconds: number): Promise<void> {
  if (!QSTASH_TOKEN) return;
  const destino = new URL(destinationUrl);
  const params = Object.fromEntries(destino.searchParams.entries());
  const semQuery = `${destino.origin}${destino.pathname}`;

  let res: Response;
  try {
    res = await fetch(`${QSTASH_BASE}/v2/publish/${semQuery}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${QSTASH_TOKEN}`,
        "content-type": "application/json",
        "upstash-delay": `${delaySeconds}s`,
      },
      body: JSON.stringify({ scheduled: true, ...params }),
      cache: "no-store",
    });
  } catch (err: any) {
    await registrarDiagnostico(QSTASH_ULTIMO_KEY, { ok: false, destino: destino.pathname, erro: String(err?.message || err).slice(0, 200) });
    throw err;
  }

  const texto = await res.text().catch(() => "");
  await registrarDiagnostico(QSTASH_ULTIMO_KEY, {
    ok: res.ok,
    status: res.status,
    destino: destino.pathname,
    base: QSTASH_BASE,
    resposta: texto.slice(0, 200),
  });
  if (!res.ok) {
    throw new Error(`QStash erro ${res.status}: ${texto}`);
  }
}

// Lê txid/sig de uma chamada agendada: da query (formato antigo e teste manual)
// ou do corpo JSON (formato atual, ver scheduleDelayedCall).
export async function lerParametrosAgendados(request: Request): Promise<{ txid: string; sig: string }> {
  const url = new URL(request.url);
  let txid = url.searchParams.get("txid")?.trim() || "";
  let sig = url.searchParams.get("sig") || "";
  if ((!txid || !sig) && request.method === "POST") {
    try {
      const body: any = await request.json();
      txid = txid || String(body?.txid ?? "").trim();
      sig = sig || String(body?.sig ?? "");
    } catch {
      // corpo vazio ou não-JSON
    }
  }
  return { txid, sig };
}
