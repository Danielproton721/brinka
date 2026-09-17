// Provider MedusaPay — API nova (doc pública: https://app.medusapayoficial.pro/docs).
// A API antiga (api.v2.medusapay.com.br, Basic Auth, valor em centavos) foi
// descontinuada. Aqui: Bearer mk_live_, valor em REAIS, status em português.

import crypto from "node:crypto"

// O path repete "/api": o endpoint real é .../api/v1/api/pagamentos.
const BASE_URL = "https://api.medusapayoficial.pro/api/v1/api"

const IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000

function apiKey(): string {
  return (process.env.MEDUSAPAY_SECRET_KEY || process.env.MEDUSAPAY_API_KEY || "").trim()
}

export function medusaConfigured(): boolean {
  return Boolean(apiKey())
}

export function isPaidStatusMedusa(status: unknown): boolean {
  return ["aprovado", "approved", "paid", "pago"].includes(String(status ?? "").toLowerCase())
}

export function isRefundedStatusMedusa(status: unknown): boolean {
  return ["estornado", "refunded", "chargeback"].includes(String(status ?? "").toLowerCase())
}

// Webhook cadastrado no painel vem com X-Medusa-Signature: sha256=<hmac do corpo>.
// null = sem segredo configurado ou sem header (entrega por metadata.postback_url
// não é assinada); quem chama sempre confirma o pagamento no GET da API.
export function verifyMedusaSignature(rawBody: string, headerValue: string | null): boolean | null {
  const secret = (process.env.MEDUSAPAY_WEBHOOK_SECRET || "").trim()
  const received = String(headerValue || "").trim()
  if (!secret || !received) return null

  const hmac = (payload: string) =>
    "sha256=" + crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex")

  // A doc assina JSON.stringify(req.body), que pode diferir do corpo bruto.
  const candidates = [hmac(rawBody)]
  try {
    candidates.push(hmac(JSON.stringify(JSON.parse(rawBody))))
  } catch {
    // corpo não-JSON: só o bruto vale
  }

  const b = Buffer.from(received)
  return candidates.some((expected) => {
    const a = Buffer.from(expected)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  })
}

export interface MedusaPixInput {
  /** Em centavos; convertido pra reais aqui dentro. */
  amountCents: number
  name: string
  email: string
  cpfDigits: string
  title: string
  /** URL do webhook por transação (metadata.postback_url). */
  postbackUrl?: string
}

export interface MedusaPixResult {
  ok: boolean
  status?: number
  error?: string
  code?: string
  txid?: string | null
  qrCode?: string
  qrCodeImage?: string | null
  expiresAt?: string | null
  paymentStatus?: string
  /** Conta em Modo Teste: venda aprovada na hora, sem PIX real. */
  simulated?: boolean
  raw?: unknown
}

function centsToReais(amountCents: number): number {
  return Number((Math.round(amountCents) / 100).toFixed(2))
}

function idempotencyKeyFor(input: MedusaPixInput): string {
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS)
  const seed = [input.cpfDigits, input.email.toLowerCase(), input.amountCents, input.title, bucket].join("|")
  return "bk_" + crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32)
}

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${apiKey()}`,
      accept: "application/json",
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

function readPix(data: any) {
  const venda = data?.venda ?? {}
  const txid = venda?.id ?? data?.id ?? null
  return {
    txid: txid != null ? String(txid) : null,
    qrCode: String(data?.pixCopiaECola ?? venda?.pixCopiaECola ?? ""),
    qrCodeImage: data?.pixQrCode ? String(data.pixQrCode) : null,
    expiresAt: data?.pixExpiresAt ?? null,
    status: String(venda?.status ?? data?.status ?? "pendente"),
    simulated: Boolean(venda?.simulada ?? data?.simulada ?? false),
  }
}

export async function createPixMedusa(input: MedusaPixInput): Promise<MedusaPixResult> {
  const payload = {
    clienteNome: input.name,
    clienteEmail: input.email,
    clienteCpf: input.cpfDigits,
    produto: input.title.slice(0, 200),
    valor: centsToReais(input.amountCents),
    metodo: "PIX",
    ...(input.postbackUrl ? { metadata: { postback_url: input.postbackUrl } } : {}),
  }

  const key = idempotencyKeyFor(input)
  let r: Awaited<ReturnType<typeof call>>
  try {
    r = await call("POST", "/pagamentos", { ...payload, idempotencyKey: key })
  } catch {
    return { ok: false, error: "Falha de comunicação com a MedusaPay." }
  }

  if (!r.res.ok) {
    const msg = r.data?.message || r.data?.error || r.raw || "Erro desconhecido na MedusaPay"
    return { ok: false, status: r.res.status, code: r.data?.code, error: String(msg), raw: r.data ?? r.raw }
  }

  let pix = readPix(r.data)

  // 200 = mesma idempotencyKey devolveu a venda antiga; se ela não tem mais o
  // copia-e-cola, gera uma cobrança nova em vez de mostrar QR vazio.
  if (!pix.qrCode && !pix.simulated && r.res.status === 200) {
    try {
      const retry = await call("POST", "/pagamentos", {
        ...payload,
        idempotencyKey: `${key}_${crypto.randomBytes(4).toString("hex")}`,
      })
      if (retry.res.ok) {
        r = retry
        pix = readPix(retry.data)
      }
    } catch {
      // fica com a resposta original
    }
  }

  return {
    ok: true,
    txid: pix.txid,
    qrCode: pix.qrCode,
    qrCodeImage: pix.qrCodeImage,
    expiresAt: pix.expiresAt,
    paymentStatus: pix.status,
    simulated: pix.simulated,
    raw: r.data,
  }
}

export async function getStatusMedusa(
  txid: string,
): Promise<{ ok: boolean; status: string; paid: boolean; simulated: boolean }> {
  try {
    const { res, data } = await call("GET", `/pagamentos/${encodeURIComponent(txid)}`)
    if (!res.ok) return { ok: false, status: "pendente", paid: false, simulated: false }
    const venda = data?.venda ?? data?.data ?? data ?? {}
    const status = String(venda?.status ?? "pendente")
    const simulated = Boolean(venda?.simulada)
    return { ok: true, status, paid: isPaidStatusMedusa(status) && !simulated, simulated }
  } catch {
    return { ok: false, status: "pendente", paid: false, simulated: false }
  }
}
