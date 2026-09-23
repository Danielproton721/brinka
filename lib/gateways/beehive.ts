// Provider Beehive Pay (doc: https://docs.beehivehub.io, openapi em
// https://docs.beehivehub.io/api-reference/openapi.yaml).
//
//   • base    https://api.conta.paybeehive.com.br/v1
//   • auth    Authorization: Bearer base64(SECRET_KEY:x)  — Basic embrulhado em Bearer
//   • criar   POST /transactions  (amount em CENTAVOS, paymentMethod "pix")
//   • status  GET /transactions/{id}
//   • webhook postbackUrl no corpo da transação, SEM assinatura documentada
//
// `metadata` é obrigatório na API (provider, user_email, order_id, checkout_url,
// shop_url): sem ele a requisição é recusada.
//
// Em dev o WAF deles responde 403 (página do CloudFront) quando o corpo leva
// URLs localhost — pra testar local, aponte NEXT_PUBLIC_APP_URL pro domínio real.

import crypto from "node:crypto"

const BASE_URL = "https://api.conta.paybeehive.com.br/v1"
const PIX_EXPIRES_SECONDS = 60 * 60 * 24

function lojaUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.brinkabrinquedos.shop").replace(/\/$/, "")
}

export function beehiveConfigured(): boolean {
  return Boolean(process.env.BEEHIVE_SECRET_KEY)
}

function authHeader(): string {
  const secret = (process.env.BEEHIVE_SECRET_KEY || "").trim()
  return `Bearer ${Buffer.from(`${secret}:x`).toString("base64")}`
}

// Allowlist pura (default-DENY): em dinheiro, só libera com status afirmativo de
// pago. A doc lista created | processing | authorized | paid | refused |
// refunded — "authorized" é cartão autorizado e NÃO capturado, então fica fora.
const PAID = ["paid"]

export function isPaidStatusBeehive(status: unknown): boolean {
  return PAID.includes(String(status ?? "").toLowerCase())
}

export function isRefundedStatusBeehive(status: unknown): boolean {
  return ["refunded", "chargedback", "chargeback"].includes(String(status ?? "").toLowerCase())
}

export interface BeehivePixInput {
  amountCents: number
  name: string
  email: string
  cpfDigits: string
  phoneDigits: string
  ip: string
  title: string
  postbackUrl?: string
  /** Identificador do pedido pro painel da Beehive (metadata.order_id). */
  orderRef?: string
}

export interface BeehivePixResult {
  ok: boolean
  status?: number
  error?: string
  txid?: string | null
  qrCode?: string
  qrCodeImage?: string | null
  expiresAt?: string | null
  paymentStatus?: string
  raw?: unknown
}

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      authorization: authHeader(),
      accept: "application/json",
      "user-agent": "BRINKA/1.0",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  const raw = await res.text()
  let data: any = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }
  return { res, raw, data }
}

// O openapi descreve `pix` como string e a nota da doc fala em campo `qrCode`,
// sem exemplo de resposta PIX — lemos os nomes prováveis até o 1º teste real.
function readPix(data: any) {
  const tx = data?.data ?? data ?? {}
  const pix = typeof tx?.pix === "string" ? { qrcode: tx.pix } : (tx?.pix ?? {})
  const qrCode =
    tx.qrCode ?? tx.qrcode ?? pix.qrcode ?? pix.qrCode ?? pix.copiaECola ?? pix.payload ?? pix.emv ?? ""
  const txid = tx?.id ?? null
  return {
    txid: txid != null ? String(txid) : null,
    qrCode: String(qrCode || ""),
    qrCodeImage: tx.qrCodeImage ?? pix.qrCodeUrl ?? pix.qrCodeImage ?? null,
    expiresAt: pix.expiresAt ?? pix.expirationDate ?? tx.expiresAt ?? null,
    status: String(tx?.status ?? "created"),
  }
}

function mensagemDeErro(data: any, raw: string, status: number): string {
  const m = data?.message ?? data?.error ?? data?.errors
  if (Array.isArray(m)) return m.map((e: any) => e?.message ?? String(e)).join(" | ")
  if (m && typeof m === "object") return JSON.stringify(m)
  if (m) return String(m)
  // Resposta que não é JSON (ex.: página de bloqueio do WAF) não vai pro cliente.
  return `Beehive recusou a requisição (HTTP ${status}).`
}

export async function createPixBeehive(input: BeehivePixInput): Promise<BeehivePixResult> {
  const loja = lojaUrl()
  const orderRef = input.orderRef || `BK-${crypto.randomBytes(5).toString("hex").toUpperCase()}`
  const payload = {
    amount: Math.round(input.amountCents),
    paymentMethod: "pix",
    pix: { expiresInSeconds: PIX_EXPIRES_SECONDS },
    customer: {
      name: input.name,
      email: input.email,
      phone: input.phoneDigits ? `+55${input.phoneDigits}` : undefined,
      document: { number: input.cpfDigits, type: "cpf" },
    },
    items: [
      {
        title: input.title.slice(0, 200),
        unitPrice: Math.round(input.amountCents),
        quantity: 1,
        tangible: true,
      },
    ],
    metadata: {
      provider: "BRINKA",
      user_email: input.email,
      order_id: orderRef,
      checkout_url: `${loja}/checkout`,
      shop_url: loja,
    },
    externalRef: orderRef,
    ip: input.ip,
    ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
  }

  let r: Awaited<ReturnType<typeof call>>
  try {
    r = await call("POST", "/transactions", payload)
  } catch {
    return { ok: false, error: "Falha de comunicação com a Beehive." }
  }

  if (!r.res.ok) {
    return {
      ok: false,
      status: r.res.status,
      error: mensagemDeErro(r.data, r.raw, r.res.status),
      raw: r.data ?? r.raw.slice(0, 500),
    }
  }

  const pix = readPix(r.data)
  return {
    ok: true,
    txid: pix.txid,
    qrCode: pix.qrCode,
    qrCodeImage: pix.qrCodeImage ? String(pix.qrCodeImage) : null,
    expiresAt: pix.expiresAt,
    paymentStatus: pix.status,
    raw: r.data,
  }
}

export async function getStatusBeehive(txid: string): Promise<{ ok: boolean; status: string; paid: boolean }> {
  try {
    const { res, data } = await call("GET", `/transactions/${encodeURIComponent(txid)}`)
    if (!res.ok) return { ok: false, status: "created", paid: false }
    const tx = data?.data ?? data ?? {}
    const status = String(tx?.status ?? "created")
    return { ok: true, status, paid: isPaidStatusBeehive(status) }
  } catch {
    return { ok: false, status: "created", paid: false }
  }
}
