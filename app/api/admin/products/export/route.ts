import { isAuthed } from "@/lib/admin-auth"
import { exportMergedProductsTs } from "@/lib/catalog"

export const dynamic = "force-dynamic"

// Baixa o lib/products.ts regenerado (array base + overlay) pra commitar de volta.
export async function GET() {
  if (!(await isAuthed())) {
    return new Response("Não autorizado.", { status: 401 })
  }
  try {
    const ts = await exportMergedProductsTs()
    return new Response(ts, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": 'attachment; filename="products.ts"',
        "cache-control": "no-store",
      },
    })
  } catch (e: any) {
    return new Response(e?.message || "Erro ao gerar o products.ts.", { status: 500 })
  }
}
