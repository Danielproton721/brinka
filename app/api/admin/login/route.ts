import { NextResponse } from "next/server"
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
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
