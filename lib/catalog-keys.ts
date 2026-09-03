// Chaves do overlay de catálogo no KV — compartilhadas entre:
//  • lib/catalog.ts        (escrita: o painel grava edições/remoções aqui)
//  • lib/catalog-runtime.ts (leitura: o site público aplica o overlay)
// Manter num só lugar pra as duas pontas nunca divergirem.

export const OVERRIDES_KEY = "catalog:overrides" // { [id]: Partial<Product> | Product(novo) }
export const DELETED_KEY = "catalog:deleted" //     string[] (ids removidos)

// Tag de cache: o site lê o overlay com esta tag; o painel chama
// revalidateTag(CATALOG_TAG) ao salvar pra o site refletir a edição.
export const CATALOG_TAG = "catalog"
