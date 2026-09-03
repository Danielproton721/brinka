// Ordenação dos "Kits de Presente": produtos cuja FOTO exibe a marca de origem
// (logo WOODBULL / touro gravado na tampa ou caixa) vão pro FIM da lista; os
// limpos (nome genérico ou sem marca visível) ficam no topo. O produto que o
// Daniel destacou (Churrasqueiro Oficial da Família) abre a coleção.
//
// Classificação feita por inspeção visual das fotos. Marca discreta gravada na
// TÁBUA (canto) de alguns produtos "só tábua" pode existir e só some com o
// carimbo da logo própria — aqui olhamos a caixa/foto principal.

// Fotos com logo WOODBULL / touro visível → empurrados pro fim.
export const BRANDED_KIT_SLUGS = new Set<string>([
  "kit-churrasco-personalizado-mestre-do-churrasco",
  "kit-para-churrasco-personalizado-faca-chaira-garra-de-urso",
  "kit-churrasco-personalizado-edicao-especial",
  "kit-churrasco-personalizado-mestre-do-churrasco-serie-especial",
  "kit-churrasco-personalizado-doutor-churras",
  "kit-churrasco-personalizado-com-faca-7-e-acessorios-presente-ideal",
  "kit-churrasco-personalizado-chef-parrillero",
  "kit-churrasco-personalizado-artesanal-churras-essencial",
  "conjunto-garfo-trinchante-e-faca-7-cabo-em-chifre-com-estojo-em-madeira",
  "caixa-para-presente-personalizada-madeira-mdf-30x30x5-cm",
  "caixa-para-presente-personalizada-madeira-mdf-40-x-40-x-7cm",
  "caixa-presente-preta-quadrada",
  "caixa-de-presente-premium-preta-embalagem-elegante-para-kits-e-presentes",
])

// Destaques limpos (sem marca) que abrem a coleção, nesta ordem.
export const FEATURED_KIT_SLUGS = [
  "kit-churrasco-personalizado-churrasqueiro-oficial-da-familia",
  "kit-churrasco-personalizado-p-presente-faca-teca-7-garra-de-urso-e-tabua-com-berco",
  "conjunto-com-garfo-trinchante-e-faca-com-cabo-em-osso-e-chifre-e-estojo-em-madeira",
]

// Ordena mantendo a ordem original dentro de cada grupo:
// 1) destaques (FEATURED, na ordem dada) → 2) limpos → 3) com marca (fim).
export function sortKitsBrandLast<T extends { slug: string }>(products: T[]): T[] {
  const featIndex = (slug: string) => {
    const i = FEATURED_KIT_SLUGS.indexOf(slug)
    return i < 0 ? Number.MAX_SAFE_INTEGER : i
  }
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ab = BRANDED_KIT_SLUGS.has(a.p.slug) ? 1 : 0
      const bb = BRANDED_KIT_SLUGS.has(b.p.slug) ? 1 : 0
      if (ab !== bb) return ab - bb // com marca por último
      const af = featIndex(a.p.slug)
      const bf = featIndex(b.p.slug)
      if (af !== bf) return af - bf // destaques primeiro
      return a.i - b.i // resto: ordem original estável
    })
    .map((x) => x.p)
}
