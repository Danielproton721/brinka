import { NextResponse } from "next/server"
import { isAuthed } from "@/lib/admin-auth"
import { CatalogReadonlyError, resetOverlay } from "@/lib/catalog"
import { revalidateCatalog } from "@/lib/catalog-runtime"

export const dynamic = "force-dynamic"

// Zera o overlay de edições. Use DEPOIS de exportar o products.ts e commitar.
export async function POST() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  try {
    await resetOverlay()
    revalidateCatalog()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof CatalogReadonlyError ? 409 : 400
    return NextResponse.json({ error: e?.message || "Erro ao zerar." }, { status })
  }
}
