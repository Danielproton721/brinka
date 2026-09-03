import { NextResponse } from "next/server"
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/admin-auth"
import { consumeRateLimit, getClientIp } from "@/lib/checkout-security"

export const dynamic = "force-dynamic"

// 8 tentativas por IP a cada 15 min. O código da loja é público no GitHub —
// qualquer um lê que esta rota recebe { password } e que o painel fica em
// /admin. Sem limite, a senha cai por tentativa e erro; com limite, força bruta
// deixa de ser viável.
const MAX_TENTATIVAS = 8
const JANELA_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const limite = consumeRateLimit(`admin:login:${ip}`, MAX_TENTATIVAS, JANELA_MS)
  if (!limite.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const password = String(body?.password || "")
  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: "Senha incorreta." }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
  return res
}
