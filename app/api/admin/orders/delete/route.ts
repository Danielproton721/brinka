import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import { deleteOrder } from "@/lib/orders"

export const dynamic = "force-dynamic"

const erro = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status })

// Pedidos são permanentes; este é o único caminho que apaga um. Exige login no
// painel e `confirmar: true` no corpo (o botão pede confirmação antes).
export async function POST(request: Request) {
  if (!(await isAuthed())) return erro(401, "Não autorizado.")

  let body: any
  try {
    body = await request.json()
  } catch {
    return erro(400, "JSON inválido.")
  }

  const txid = typeof body?.txid === "string" ? body.txid.trim() : ""
  if (!txid || txid.length > 200) return erro(400, "txid obrigatório.")
  if (body?.confirmar !== true) return erro(400, "Confirmação obrigatória.")

  try {
    const existia = await deleteOrder(txid)
    if (!existia) return erro(404, "Pedido não encontrado.")
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[ADMIN DELETE] falha ao apagar pedido:", txid, e)
    return erro(500, "Não consegui apagar. Tente de novo.")
  }
}
