// Provider CenturionPay (https://api-gateway.centurionpaybr.com, API v1.1).
// Auth por header x-api-key + User-Agent fixo (a doc exige o UA no exemplo).
// Criar transação: POST /api/user/transactions com paymentMethod "PIX".
// SEM relay: o postbackUrl aponta direto pro webhook da loja.
//
// Referência (doc oficial, extraída dos .md do Apidog):
//   - Criar:  POST /api/user/transactions
//             body: { amount (centavos), paymentMethod:"PIX", customer{...},
//                     items[], pix{expiresInDays}, postbackUrl }
//             resp: { data: { id, qrCode, pix:{ qrcode, expirationDate },
//                     status:"WAITING_PAYMENT" } }
//   - Status: GET /api/user/transactions/{id}
//             resp: { data: { status, paidAt, ... } }
//   - Webhook: schema NÃO documentado (página placeholder). Por isso NÃO
//     confiamos no corpo do postback — confirmamos via GET status.

const BASE_URL = "https://api-gateway.centurionpaybr.com"

// User-Agent do exemplo oficial da doc. Alguns gateways bloqueiam requests sem
// UA (ou com UA de bot); replicamos o documentado pra não tomar 4xx/bloqueio.
const USER_AGENT = "AtivoB2B/1.0"

export function centurionConfigured(): boolean {
  return Boolean(process.env.CENTURION_API_KEY)
}

function authHeaders(): Record<string, string> {
  return {
    "x-api-key": (process.env.CENTURION_API_KEY || "").trim(),
    "User-Agent": USER_AGENT,
    "content-type": "application/json",
    accept: "application/json",
  }
}

// Status que a doc/schema tratam como liquidado. Normalizamos pra minúsculo
// porque a doc é inconsistente: o create devolve "WAITING_PAYMENT" (maiúsculo
// com underscore), o schema Transaction usa "paid" (minúsculo). Cobrimos ambos.
// ALLOWLIST pura (default-DENY): em código de dinheiro, só liberamos entrega com
// um status afirmativo de pago. NÃO usamos paidAt como fallback — um status
// desconhecido (estorno/disputa/análise) com timestamp NÃO pode virar "pago".
// Se o teste real revelar outro valor de "pago", adicione-o AQUI explicitamente.
const PAID = ["paid", "approved", "completed", "captured", "succeeded", "pago"]

export function isPaidStatusCenturion(status: unknown): boolean {
  return PAID.includes(String(status ?? "").toLowerCase())
}

export interface CenturionAddress {
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  stateUF: string
}

export interface CenturionPixInput {
  amountCents: number
  name: string
  email: string
  cpfDigits: string
  phoneDigits: string
  ip: string
  title: string
  postbackUrl?: string
  address?: CenturionAddress
}

export interface CenturionPixResult {
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

function mapAddress(a: CenturionAddress) {
  return {
    street: a.street,
    streetNumber: a.number,
    complement: a.complement || "",
    // CEP só com dígitos: o checkout guarda o cep mascarado ("01310-100"); alguns
    // gateways rejeitam o formato com hífen. Enviamos os 8 dígitos.
    zipCode: (a.cep || "").replace(/\D/g, ""),
    neighborhood: a.neighborhood,
    city: a.city,
    state: (a.stateUF || "").toUpperCase(),
    country: "BR",
  }
}

export async function createPixCenturion(input: CenturionPixInput): Promise<CenturionPixResult> {
  const addr = input.address && input.address.cep ? mapAddress(input.address) : null

  const payload: Record<string, any> = {
    amount: input.amountCents,
    paymentMethod: "PIX",
    customer: {
      name: input.name,
      email: input.email,
      document: { number: input.cpfDigits, type: "CPF" },
      phone: input.phoneDigits,
      ...(addr ? { address: addr } : {}),
    },
    // Item sintético com o valor total (igual Pagou/Medusa): evita mismatch
    // entre `amount` e a soma dos itens quando há desconto/cupom/frete.
    items: [
      {
        title: input.title,
        unitPrice: input.amountCents,
        quantity: 1,
        tangible: true,
      },
    ],
    ...(addr ? { shipping: { fee: 0, address: addr } } : {}),
    pix: { expiresInDays: 1 },
    ip: input.ip,
    ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/user/transactions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    })
  } catch (e) {
    return { ok: false, error: "Falha de comunicação com a CenturionPay." }
  }

  const raw = await res.text()
  let data: any = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      (Array.isArray(data?.errors) ? data.errors.join(" | ") : data?.errors) ||
      raw ||
      "Erro desconhecido na CenturionPay"
    return { ok: false, status: res.status, error: String(msg), raw: data ?? raw }
  }

  const tx = data?.data ?? data ?? {}
  const pix = tx?.pix ?? {}
  // Copia-e-cola PIX (payload EMV): a doc devolve em data.qrCode e/ou data.pix.qrcode.
  const qrCode =
    tx.qrCode ??
    tx.qrcode ??
    pix.qrcode ??
    pix.qrCode ??
    pix.emv ??
    pix.copyPaste ??
    pix.payload ??
    ""
  // A doc NÃO devolve imagem do QR — o front gera a imagem a partir do copia-e-cola.
  const qrCodeImage = pix.qrCodeUrl ?? pix.qrCodeImage ?? pix.url ?? null
  const txid = tx?.id ?? data?.id ?? null
  const expiresAt = pix.expirationDate ?? pix.expiration_date ?? pix.expiresAt ?? null
  const status = tx?.status ?? "WAITING_PAYMENT"

  return {
    ok: true,
    txid: txid != null ? String(txid) : null,
    qrCode: String(qrCode || ""),
    qrCodeImage,
    expiresAt,
    paymentStatus: String(status),
    raw: data,
  }
}

export async function getStatusCenturion(
  txid: string
): Promise<{ ok: boolean; status: string; paid: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/api/user/transactions/${encodeURIComponent(txid)}`, {
      method: "GET",
      headers: {
        "x-api-key": (process.env.CENTURION_API_KEY || "").trim(),
        "User-Agent": USER_AGENT,
        accept: "application/json",
      },
      cache: "no-store",
    })
    const raw = await res.text()
    let data: any = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = null
    }
    if (!res.ok) return { ok: false, status: "pending", paid: false }
    const tx = data?.data ?? data ?? {}
    const status = String(tx?.status ?? "pending")
    return { ok: true, status, paid: isPaidStatusCenturion(status) }
  } catch {
    return { ok: false, status: "pending", paid: false }
  }
}
