import { NextResponse } from "next/server"
import { isAuthed } from "@/lib/admin-auth"
import { kvConfigured } from "@/lib/kv-store"
import { getActiveGateway, setActiveGateway, isGatewayId } from "@/lib/gateways/active"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  return NextResponse.json({ active: await getActiveGateway(), kv: kvConfigured() })
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  if (!kvConfigured()) {
    return NextResponse.json(
      { error: "KV (Upstash) não configurado — não dá pra salvar a escolha." },
      { status: 400 }
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const id = body?.gateway
  // Type guard único (aceita todos os gateways de GatewayId) — adicionar um
  // gateway novo em active.ts basta, sem precisar lembrar de editar esta rota.
  if (!isGatewayId(id)) {
    return NextResponse.json({ error: "Gateway inválido." }, { status: 400 })
  }

  await setActiveGateway(id)
  return NextResponse.json({ ok: true, active: id })
}
