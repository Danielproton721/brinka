import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import {
  getWhatsAppConfig,
  linkWhatsApp,
  normalizaNumero,
  numeroLegivel,
  setWhatsAppConfig,
  whatsappPersiste,
} from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

const comExtras = (cfg: Awaited<ReturnType<typeof getWhatsAppConfig>>) => ({
  ...cfg,
  legivel: numeroLegivel(cfg.numero),
  link: linkWhatsApp(cfg.numero),
  podeSalvar: whatsappPersiste(),
})

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  return NextResponse.json(comExtras(await getWhatsAppConfig()))
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  if (!whatsappPersiste()) {
    return NextResponse.json(
      { ok: false, error: "Sem Upstash (KV) configurado a escolha não fica salva." },
      { status: 409 },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const patch: { numero?: string; botao?: boolean; rodape?: boolean } = {}
  if (typeof body?.botao === "boolean") patch.botao = body.botao
  if (typeof body?.rodape === "boolean") patch.rodape = body.rodape
  if (body?.numero !== undefined) {
    const numero = normalizaNumero(body.numero)
    if (numero.length < 12 || numero.length > 13) {
      return NextResponse.json(
        { ok: false, error: "Número inválido. Use DDD + número, ex.: (31) 97514-8344." },
        { status: 400 },
      )
    }
    patch.numero = numero
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada pra salvar." }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...comExtras(await setWhatsAppConfig(patch)) })
}
