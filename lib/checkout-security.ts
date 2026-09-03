import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export const CHECKOUT_SESSION_COOKIE = "checkout_session"
export const CHECKOUT_SESSION_TTL_SECONDS = 30 * 60

type CheckoutSessionPayload = {
  v: 1
  iat: number
  exp: number
  amountCents: number
  itemCount: number
  nonce: string
}

type RateBucket = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  ok: boolean
  retryAfterSeconds: number
}

type ValidationResult =
  | { ok: true; payload: CheckoutSessionPayload }
  | { ok: false; reason: string }

const globalStore = globalThis as typeof globalThis & {
  __checkoutRateLimits?: Map<string, RateBucket>
}

const rateLimits = globalStore.__checkoutRateLimits ?? new Map<string, RateBucket>()
globalStore.__checkoutRateLimits = rateLimits

function getSessionSecret() {
  return (
    process.env.CHECKOUT_SESSION_SECRET ||
    process.env.PAGOUAI_SECRET_KEY ||
    "dev-only-checkout-session-secret"
  )
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url")
}

function safeEqual(a: string, b: string) {
  const first = Buffer.from(a)
  const second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}

export function createCheckoutSession(amountCents: number, itemCount: number) {
  const now = Math.floor(Date.now() / 1000)
  const payload: CheckoutSessionPayload = {
    v: 1,
    iat: now,
    exp: now + CHECKOUT_SESSION_TTL_SECONDS,
    amountCents,
    itemCount,
    nonce: randomBytes(16).toString("base64url"),
  }
  const encoded = encodeBase64Url(JSON.stringify(payload))
  return `${encoded}.${sign(encoded)}`
}

export function validateCheckoutSession(token: string | undefined, expectedAmountCents: number): ValidationResult {
  if (!token) return { ok: false, reason: "missing" }

  const [encoded, signature] = token.split(".")
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) {
    return { ok: false, reason: "invalid" }
  }

  let payload: CheckoutSessionPayload
  try {
    payload = JSON.parse(decodeBase64Url(encoded))
  } catch {
    return { ok: false, reason: "invalid_payload" }
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.v !== 1 || payload.exp <= now) {
    return { ok: false, reason: "expired" }
  }

  if (payload.amountCents !== expectedAmountCents) {
    return { ok: false, reason: "amount_mismatch" }
  }

  return { ok: true, payload }
}

export function getCheckoutSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") || ""
  const cookies = cookie.split(";").map((part) => part.trim())
  const session = cookies.find((part) => part.startsWith(`${CHECKOUT_SESSION_COOKIE}=`))
  return session ? decodeURIComponent(session.slice(CHECKOUT_SESSION_COOKIE.length + 1)) : undefined
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

export function hashRateLimitValue(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24)
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    pruneRateLimits(now)
    return { ok: true, retryAfterSeconds: 0 }
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { ok: true, retryAfterSeconds: 0 }
}

function pruneRateLimits(now: number) {
  if (rateLimits.size < 500) return
  for (const [key, bucket] of rateLimits) {
    if (bucket.resetAt <= now) rateLimits.delete(key)
  }
}
