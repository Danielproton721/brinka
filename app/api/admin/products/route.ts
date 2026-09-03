import { NextResponse } from "next/server"
import { isAuthed } from "@/lib/admin-auth"
import {
  CatalogReadonlyError,
  deleteProduct,
  getMergedCatalog,
  pendingChangesCount,
  upsertProduct,
} from "@/lib/catalog"
import { revalidateCatalog } from "@/lib/catalog-runtime"

export const dynamic = "force-dynamic"

// Lista o catálogo mesclado (array base de lib/products.ts + overlay KV).
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  const catalog = await getMergedCatalog()
  const pending = await pendingChangesCount()
  return NextResponse.json({ catalog, pending })
}

// Cria/atualiza um produto (grava no overlay KV).
export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  let body: any
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const row = body?.row
  if (!row || typeof row !== "object") {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 })
  }
  try {
    await upsertProduct(row)
    revalidateCatalog(typeof row?.slug === "string" ? row.slug : undefined)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof CatalogReadonlyError ? 409 : 400
    return NextResponse.json({ error: e?.message || "Erro ao salvar." }, { status })
  }
}

// Remove um produto (marca como deletado no overlay KV).
export async function DELETE(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  const id = new URL(request.url).searchParams.get("id") || ""
  if (!id) {
    return NextResponse.json({ error: "id obrigatório." }, { status: 400 })
  }
  try {
    await deleteProduct(id)
    revalidateCatalog()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof CatalogReadonlyError ? 409 : 400
    return NextResponse.json({ error: e?.message || "Erro ao excluir." }, { status })
  }
}
