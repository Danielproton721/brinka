import { NextResponse } from "next/server"

import { getTxGateway, isGatewayId, getActiveGateway, type GatewayId } from "@/lib/gateways/active"
import { POST as postPagou } from "../pagouai/route"
import { POST as postMedusa } from "../medusa/route"
import { POST as postCenturion } from "../centurion/route"

export const dynamic = "force-dynamic"

// ============================================================================
//  PORTA ÚNICA DO RELAY
//
//  Um cadastro só no hub aponta pra cá; este endpoint descobre de qual gateway
//  veio o aviso e entrega pro handler certo. Sem isso seria preciso registrar
//  uma chave por gateway no hub (cada chave repassa pra um destino fixo).
//
//  No hub, o destino desta loja é:  https://<dominio>/api/webhooks/relay-in
// ============================================================================

function pick(payload: any, keys: string[]) {
  for (const key of keys) {
    const v = key.split(".").reduce((c: any, part) => c?.[part], payload)
    if (v !== undefined && v !== null && v !== "") return v
  }
  return null
}

function extractTxid(payload: any): string | null {
  const v = pick(payload, [
    "transactionId",
    "data.transactionId",
    "transaction.transactionId",
    "vendaId",
    "data.vendaId",
    "venda.id",
    "data.id",
    "transaction.id",
    "objectId",
    "id",
  ])
  return v != null ? String(v) : null
}

// Descobre o gateway na ordem do mais confiável pro mais chutado.
async function detectGateway(request: Request, payload: any): Promise<{ id: GatewayId; how: string }> {
  // 1. Assinatura própria da Medusa no header (o hub repassa os originais).
  if (request.headers.get("x-medusa-signature")) return { id: "medusa", how: "header medusa" }

  // 2. O txid foi gravado com o gateway que criou a cobrança (lib/gateways/active).
  const txid = extractTxid(payload)
  if (txid) {
    const marcado = await getTxGateway(txid)
    if (marcado && isGatewayId(marcado)) return { id: marcado, how: "txid no KV" }
  }

  // 3. Formato do corpo: campos que só um dos gateways manda.
  if (pick(payload, ["venda", "pixCopiaECola", "valorLiquido"])) return { id: "medusa", how: "corpo medusa" }
  if (pick(payload, ["external_ref", "buyer", "data.external_ref"])) return { id: "pagou", how: "corpo pagou" }

  // 4. Último caso: manda pro gateway que está processando agora. Cada handler
  //    confirma o pagamento na API do próprio provider, então um palpite errado
  //    não libera pedido — só não acha a transação.
  return { id: await getActiveGateway(), how: "gateway ativo (palpite)" }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "relay-in" })
}

export async function POST(request: Request) {
  // Porta do relay: aqui o segredo é sempre exigido (quando existe no ambiente),
  // independente de qual gateway está com relay ligado — nada chega nesta URL
  // sem passar pelo relay.
  const relaySecret = process.env.RELAY_SECRET?.trim()
  if (relaySecret && request.headers.get("x-relay-secret") !== relaySecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const rawBody = await request.text()
  let payload: any = {}
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ ok: true, handled: false, reason: "corpo invalido" })
  }

  const { id, how } = await detectGateway(request, payload)
  console.log("[RELAY-IN] roteando pra", id, `(${how})`)

  // Reconstrói o request pro handler do gateway: mesmo corpo e mesmos headers
  // (a assinatura original continua chegando lá).
  const encaminhado = new Request(new URL(`/api/webhooks/${id}`, request.url), {
    method: "POST",
    headers: request.headers,
    body: rawBody,
  })

  const handlers: Record<GatewayId, (r: Request) => Promise<Response>> = {
    pagou: postPagou,
    medusa: postMedusa,
    centurion: postCenturion,
  }

  try {
    return await handlers[id](encaminhado)
  } catch (err) {
    console.error("[RELAY-IN] falha ao processar no gateway", id, err)
    // 502 → o gateway/relay re-tenta depois em vez de dar o evento por perdido.
    return NextResponse.json({ ok: false, gateway: id }, { status: 502 })
  }
}
