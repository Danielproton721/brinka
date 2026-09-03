// Provider MedusaPay (https://api.v2.medusapay.com.br/v1).
// Auth Basic base64(secret:x). Estrutura parecida com a Pagou.ai, mas com
// paymentMethod/customer/items (camelCase) e document {number,type}.
// O nome do campo do QR Code no response não está documentado — lemos vários
// nomes prováveis (ajustar após o 1º teste real).

const BASE_URL = "https://api.v2.medusapay.com.br/v1"

export function medusaConfigured(): boolean {
  return Boolean(process.env.MEDUSAPAY_SECRET_KEY)
}

function authHeader(): string {
  const secret = (process.env.MEDUSAPAY_SECRET_KEY || "").trim()
  // Basic Auth: secret como usuário, "x" como senha (padrão da doc).
  const token = Buffer.from(`${secret}:x`).toString("base64")
  return `Basic ${token}`
}

export function isPaidStatusMedusa(status: unknown): boolean {
  return ["paid", "captured", "succeeded", "completed", "approved", "pago"].includes(
    String(status ?? "").toLowerCase()
  )
}

export interface MedusaPixInput {
  amountCents: number
  name: string
  email: string
  cpfDigits: string
  phoneDigits: string
  ip: string
  title: string
  postbackUrl?: string
}

export interface MedusaPixResult {
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

export async function createPixMedusa(input: MedusaPixInput): Promise<MedusaPixResult> {
  const payload = {
    amount: input.amountCents,
    paymentMethod: "pix",
    customer: {
      name: input.name,
      email: input.email,
      document: { number: input.cpfDigits, type: "cpf" },
      phone: input.phoneDigits,
    },
    items: [
      {
        title: input.title,
        unitPrice: input.amountCents,
        quantity: 1,
        tangible: true,
      },
    ],
    pix: { expiresInDays: 1 },
    ip: input.ip,
    ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        authorization: authHeader(),
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
  } catch (e) {
    return { ok: false, error: "Falha de comunicação com a MedusaPay." }
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
      (Array.isArray(data?.errors) ? data.errors.join(" | ") : data?.errors) ||
      data?.error ||
      raw ||
      "Erro desconhecido na MedusaPay"
    return { ok: false, status: res.status, error: String(msg), raw: data ?? raw }
  }

  const tx = data?.data ?? data ?? {}
  const pix = tx?.pix ?? {}
  // Copia-e-cola / payload EMV do PIX — tenta os nomes mais prováveis.
  const qrCode =
    pix.qrcode ??
    pix.qrCode ??
    pix.qr_code ??
    pix.emv ??
    pix.copyPaste ??
    pix.payload ??
    pix.code ??
    tx.qrcode ??
    tx.qr_code ??
    ""
  const qrCodeImage =
    pix.qrCodeUrl ??
    pix.qr_code_url ??
    pix.qrCodeImage ??
    pix.image ??
    pix.url ??
    null
  const txid = tx?.id ?? data?.id ?? null
  const expiresAt = pix.expiresAt ?? pix.expiration_date ?? pix.expirationDate ?? null
  const status = tx?.status ?? "pending"

  return {
    ok: true,
    txid: txid != null ? String(txid) : null,
    qrCode: String(qrCode || ""),
    qrCodeImage,
    expiresAt,
    paymentStatus: status,
    raw: data,
  }
}

export async function getStatusMedusa(txid: string): Promise<{ ok: boolean; status: string; paid: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/transactions/${encodeURIComponent(txid)}`, {
      method: "GET",
      headers: { authorization: authHeader(), accept: "application/json" },
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
    return { ok: true, status, paid: isPaidStatusMedusa(status) }
  } catch {
    return { ok: false, status: "pending", paid: false }
  }
}
