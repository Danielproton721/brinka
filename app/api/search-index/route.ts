import { NextResponse } from "next/server";
import { products } from "@/lib/products";

// Índice magro pra busca do header. O catálogo completo (~345KB) morava no
// bundle client de TODAS as páginas só por causa da busca; agora o header
// baixa este JSON (fração do tamanho) sob demanda, quando a busca abre.
// force-static: vira asset estático no build (zero custo por requisição).
export const dynamic = "force-static";

export async function GET() {
  const index = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    image: p.image,
    price: p.price,
    ...(p.tags && p.tags.length > 0 ? { tags: p.tags } : {}),
  }));

  return NextResponse.json(index, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
