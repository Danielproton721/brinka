// ============================================================================
//  PAINEL /admin · CONFIGURAÇÃO CENTRAL (BRINKA Brinquedos)
//  Único arquivo que muda por loja. Marca, cookie, módulos e o mapeamento dos
//  campos do catálogo.
//
//  ATENÇÃO: esta loja NÃO usa CSV — o catálogo é o array `products` em
//  lib/products.ts. O módulo Produtos foi adaptado pra ler esse array, editar
//  via overlay no KV e exportar um lib/products.ts regenerado (veja lib/catalog.ts).
// ============================================================================

export const adminConfig = {
  // Nome exibido no título do painel e na tela de login.
  brand: "BRINKA Brinquedos",

  // Cookie de sessão do admin (único pra esta loja — não pode colidir com o
  // cookie de outras lojas hospedadas no mesmo domínio).
  cookieName: "brinka_cegonha_admin",

  // Liga/desliga cada aba. Pedidos exige KV + checkout gravando lá.
  modules: {
    orders: true,
    products: true,
    // Relay/fachada: esta loja repassa webhooks de pagamento pra outras lojas
    // (que ficam ocultas do gateway). Gerenciado na aba "Relay" do painel.
    relay: true,
  },

  // ------------------------------------------------------------------------
  //  CATÁLOGO (módulo Produtos)
  //  Mapeia cada campo lógico do painel pro nome do campo no objeto Product.
  //  A coluna `id` é a CHAVE única usada pra mesclar as edições do overlay.
  //  (Nesta loja os nomes lógicos e reais coincidem — é só o subconjunto
  //  editável de Product; campos ricos como variants/images[] são preservados
  //  no export sem aparecer na edição.)
  // ------------------------------------------------------------------------
  catalog: {
    columns: {
      id: "id",
      name: "name",
      price: "price",
      compareAtPrice: "compareAtPrice",
      image: "image",
      category: "category",
      slug: "slug",
      rating: "rating",
      reviews: "reviews",
      description: "description",
    } as Record<string, string>,
  },
} as const

export type AdminConfig = typeof adminConfig
