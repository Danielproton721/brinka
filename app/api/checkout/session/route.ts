import { NextResponse } from "next/server"

import {
  CHECKOUT_SESSION_COOKIE,
  CHECKOUT_SESSION_TTL_SECONDS,
  consumeRateLimit,
  createCheckoutSession,
  getClientIp,
} from "@/lib/checkout-security"
import { products } from "@/lib/products"

export const dynamic = "force-dynamic"

type CheckoutItemInput = {
  id?: unknown
  slug?: unknown
  quantity?: unknown
}

const MAX_DISTINCT_ITEMS = 50
const MAX_ITEM_QUANTITY = 20

// Regras do total — DEVEM espelhar o front (cart-context COUPON_PCT=5 e
// SHIPPING_OPTIONS do checkout). O server calcula por conta própria: o cliente
// não decide o desconto (cupom fixo) nem inventa frete (só valores da tabela).
const COUPON_PCT = 5
const VALID_SHIPPING_CENTS = new Set([0, 1490]) // Frete grátis / Expresso R$14,90

function getItemPriceCents(item: CheckoutItemInput) {
  const id = Number(item.id)
  const slug = typeof item.slug === "string" ? item.slug : ""

  const product =
    products.find((entry) => slug && entry.slug === slug) ||
    products.find(
      (entry) =>
        entry.id === id || entry.variants?.some((variant) => variant.id === id)
    )

  if (!product) return null

  const variant = product.variants?.find((entry) => entry.id === id)
  return Math.round((variant?.price ?? product.price) * 100)
}

function calculateCart(items: CheckoutItemInput[]) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DISTINCT_ITEMS) {
    return null
  }

  let amountCents = 0
  let itemCount = 0

  for (const item of items) {
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      return null
    }

    const priceCents = getItemPriceCents(item)
    if (!priceCents || priceCents <= 0) return null

    amountCents += priceCents * quantity
    itemCount += quantity
  }

  return { amountCents, itemCount }
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const limit = consumeRateLimit(`checkout-session:ip:${ip}`, 20, 10 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas para iniciar checkout. Tente novamente em instantes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    )
  }

  let body: { items?: CheckoutItemInput[]; coupon?: unknown; shippingCents?: unknown } | null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 })
  }

  const cart = calculateCart(body?.items || [])
  if (!cart) {
    return NextResponse.json({ error: "Carrinho invalido para iniciar checkout." }, { status: 400 })
  }

  // Total final = subtotal - cupom (server aplica) + frete (só valor de tabela).
  // Assim a sessão assina o MESMO valor que o PIX/cartão vai cobrar.
  const discountCents = body?.coupon ? Math.round((cart.amountCents * COUPON_PCT) / 100) : 0
  const shipCents = Number(body?.shippingCents)
  const shippingCents = VALID_SHIPPING_CENTS.has(shipCents) ? shipCents : 0
  const totalCents = Math.max(0, cart.amountCents - discountCents) + shippingCents

  const token = createCheckoutSession(totalCents, cart.itemCount)
  const response = NextResponse.json({
    ok: true,
    amountCents: totalCents,
    itemCount: cart.itemCount,
    expiresInSeconds: CHECKOUT_SESSION_TTL_SECONDS,
  })

  response.cookies.set(CHECKOUT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHECKOUT_SESSION_TTL_SECONDS,
  })

  return response
}
