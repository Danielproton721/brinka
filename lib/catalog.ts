// ============================================================================
//  CATÁLOGO DE PRODUTOS (módulo Produtos do painel /admin)
//
//  Esta loja NÃO usa CSV — o catálogo é o array `products` em lib/products.ts.
//  O kit original era CSV-cêntrico; aqui ele foi adaptado pra esse array TS:
//
//   • BASE: o array `products` importado de @/lib/products (objetos Product
//     completos, com variants/images[]/reviews — campos ricos que NÃO se editam
//     na web mas são PRESERVADOS no export).
//   • OVERLAY (KV): edições e produtos novos ficam num overlay; remoções num
//     conjunto de ids deletados. A leitura mescla base + overlay por id.
//   • EXPORT: regenera o lib/products.ts substituindo SÓ o bloco do array
//     `products` (interfaces, collections e helpers ficam intactos) — você baixa,
//     commita e dá deploy; depois zera o overlay.
//
//  O painel edita só o subconjunto escalar de Product (EDITABLE_HEADERS). Tudo
//  degrada gracioso sem KV (vira somente-leitura).
// ============================================================================

import { promises as fs } from "fs"
import path from "path"
import { products, type Product } from "@/lib/products"
import { kvConfigured, kvGetJSON, kvSetJSON } from "./kv-store"
import { OVERRIDES_KEY, DELETED_KEY } from "./catalog-keys"

export type ProductRow = Record<string, string>
export type Catalog = { headers: string[]; rows: ProductRow[] }

// Campos escalares editáveis no painel (a ordem vira a ordem das colunas).
const EDITABLE_HEADERS = [
  "id",
  "name",
  "price",
  "compareAtPrice",
  "image",
  "category",
  "slug",
  "rating",
  "reviews",
  "description",
] as const

const PRODUCTS_PATH = "lib/products.ts"
const PRODUCTS_MARKER = "export const products: Product[] ="

// --- Conversões Product <-> ProductRow (strings pro painel) -----------------
// `images` viaja como JSON dentro do row (ProductRow é Record<string,string>).
// Não faz parte de EDITABLE_HEADERS (não vira coluna/input genérico) — o
// editor renderiza a galeria com um widget próprio (ver ProductsPanel).
function productToRow(p: Product): ProductRow {
  return {
    id: String(p.id),
    name: p.name ?? "",
    price: p.price != null ? String(p.price) : "",
    compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
    image: p.image ?? "",
    category: p.category ?? "",
    slug: p.slug ?? "",
    rating: p.rating != null ? String(p.rating) : "",
    reviews: p.reviews != null ? String(p.reviews) : "",
    description: p.description ?? "",
    images: JSON.stringify(p.images && p.images.length ? p.images : p.image ? [p.image] : []),
  }
}

// Converte um número digitado no painel, tolerando formato brasileiro:
//  "99,90" → 99.9 ; "1.299,90" → 1299.9 ; "199.90" → 199.9 ; "1299" → 1299.
// Retorna undefined se vazio ou inválido — NUNCA NaN (que viraria null no JSON
// e quebraria o site no price.toFixed()).
function parseNum(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  let s = String(raw).trim()
  if (s === "") return undefined
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".") // ponto = milhar, vírgula = decimal
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

// Lê a galeria enviada pelo editor (JSON em row.images). Retorna undefined se
// o campo não veio (edição feita por outro caminho que não a UI do painel).
function parseImages(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return undefined
    return arr.map((u) => String(u).trim()).filter(Boolean)
  } catch {
    return undefined
  }
}

function rowToPartial(row: ProductRow): Partial<Product> {
  const out: Partial<Product> = {}
  if (row.name !== undefined) out.name = row.name
  if (row.image !== undefined) out.image = row.image
  if (row.category !== undefined) out.category = row.category
  if (row.slug !== undefined) out.slug = row.slug
  if (row.description !== undefined) out.description = row.description

  // A galeria manda no campo "image" (capa) — a 1ª foto da galeria sempre
  // vira a capa, pra cards/carrinho/header (que usam só product.image)
  // nunca ficarem dessincronizados do que aparece na PDP.
  const images = parseImages(row.images)
  if (images !== undefined) {
    out.images = images
    if (images.length) out.image = images[0]
  }

  const price = parseNum(row.price)
  if (price !== undefined) out.price = price
  const rating = parseNum(row.rating)
  if (rating !== undefined) out.rating = rating
  const reviews = parseNum(row.reviews)
  if (reviews !== undefined) out.reviews = reviews

  if (row.compareAtPrice !== undefined) {
    const t = row.compareAtPrice.trim()
    if (t === "") out.compareAtPrice = undefined // intenção de limpar
    else {
      const cap = parseNum(t)
      if (cap !== undefined) out.compareAtPrice = cap // só grava se for número válido
    }
  }
  return out
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// --- Overlay (KV) -----------------------------------------------------------
async function readOverrides(): Promise<Record<string, Partial<Product>>> {
  if (!kvConfigured()) return {}
  return (await kvGetJSON<Record<string, Partial<Product>>>(OVERRIDES_KEY)) ?? {}
}

async function readDeleted(): Promise<string[]> {
  if (!kvConfigured()) return []
  return (await kvGetJSON<string[]>(DELETED_KEY)) ?? []
}

const baseById = (): Map<string, Product> =>
  new Map(products.map((p) => [String(p.id), p]))

// --- Catálogo mesclado (objetos Product completos) --------------------------
export async function getMergedProducts(): Promise<Product[]> {
  const overrides = await readOverrides()
  const deleted = new Set(await readDeleted())

  const byId = baseById()
  for (const [id, ov] of Object.entries(overrides)) {
    const base = byId.get(id)
    if (base) {
      // edição: aplica por cima da base, mantendo o id numérico original e os
      // campos ricos (variants, images[], customerReviews…) que não se editam.
      byId.set(id, { ...base, ...ov, id: base.id })
    } else {
      // produto novo: o override já é um Product completo (montado no upsert).
      byId.set(id, ov as Product)
    }
  }
  for (const id of deleted) byId.delete(id)

  return Array.from(byId.values())
}

// --- Catálogo pro painel (linhas de strings) --------------------------------
export async function getMergedCatalog(): Promise<Catalog> {
  const merged = await getMergedProducts()
  return { headers: [...EDITABLE_HEADERS], rows: merged.map(productToRow) }
}

// --- Mutações (gravam no overlay KV) ----------------------------------------
export class CatalogReadonlyError extends Error {
  constructor() {
    super("KV (Upstash) não configurado — o catálogo está em modo somente leitura.")
    this.name = "CatalogReadonlyError"
  }
}

export async function upsertProduct(row: ProductRow): Promise<void> {
  if (!kvConfigured()) throw new CatalogReadonlyError()
  const id = (row.id ?? "").trim()
  if (!id) throw new Error('Produto sem "id".')

  const overrides = await readOverrides()
  const isExisting = baseById().has(id)
  const partial = rowToPartial(row)

  if (isExisting) {
    overrides[id] = { ...overrides[id], ...partial }
  } else {
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) {
      throw new Error("O id de um produto novo precisa ser numérico.")
    }
    const prev = (overrides[id] ?? {}) as Partial<Product>
    const name = (partial.name ?? prev.name ?? "").toString().trim()
    if (!name) throw new Error("Produto novo precisa de um nome.")
    const image = partial.image ?? prev.image ?? ""
    const newProduct: Product = {
      id: numericId,
      name,
      price: Number(partial.price ?? prev.price ?? 0),
      compareAtPrice: partial.compareAtPrice ?? prev.compareAtPrice,
      image,
      images: partial.images ?? prev.images ?? (image ? [image] : []),
      rating: partial.rating ?? prev.rating ?? 5,
      reviews: partial.reviews ?? prev.reviews ?? 0,
      category: partial.category ?? prev.category ?? "Diversos",
      slug: (partial.slug && partial.slug.trim()) || prev.slug || slugify(name) || id,
      description: partial.description ?? prev.description ?? "",
    }
    overrides[id] = newProduct
  }
  await kvSetJSON(OVERRIDES_KEY, overrides)

  // Se estava marcado como deletado, "ressuscita".
  const deleted = await readDeleted()
  if (deleted.includes(id)) {
    await kvSetJSON(DELETED_KEY, deleted.filter((d) => d !== id))
  }
}

export async function deleteProduct(id: string): Promise<void> {
  if (!kvConfigured()) throw new CatalogReadonlyError()
  const key = (id ?? "").trim()
  if (!key) return

  const overrides = await readOverrides()
  if (overrides[key]) {
    delete overrides[key]
    await kvSetJSON(OVERRIDES_KEY, overrides)
  }
  const deleted = await readDeleted()
  if (!deleted.includes(key)) {
    deleted.push(key)
    await kvSetJSON(DELETED_KEY, deleted)
  }
}

// Zera o overlay — use DEPOIS de exportar o products.ts e commitar.
export async function resetOverlay(): Promise<void> {
  if (!kvConfigured()) throw new CatalogReadonlyError()
  await kvSetJSON(OVERRIDES_KEY, {})
  await kvSetJSON(DELETED_KEY, [])
}

export async function pendingChangesCount(): Promise<number> {
  const overrides = await readOverrides()
  const deleted = await readDeleted()
  return Object.keys(overrides).length + deleted.length
}

// --- Export: regenera lib/products.ts (só o bloco do array) ------------------
// Acha o fechamento balanceado do array, respeitando strings e escapes — mesma
// técnica do scripts/products-editor.ts da loja.
function findMatchingBracket(source: string, openIndex: number): number {
  const open = source[openIndex]
  const close = open === "[" ? "]" : "}"
  let depth = 0
  let inString = false
  let escaped = false
  let quote = ""

  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === quote) inString = false
      continue
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true
      quote = ch
    } else if (ch === open) {
      depth++
    } else if (ch === close) {
      depth--
      if (depth === 0) return i
    }
  }
  throw new Error("Não foi possível encontrar o fechamento do array products.")
}

export async function exportMergedProductsTs(): Promise<string> {
  const merged = await getMergedProducts()

  const abs = path.join(process.cwd(), PRODUCTS_PATH)
  let source: string
  try {
    source = await fs.readFile(abs, "utf8")
  } catch {
    throw new Error(
      "Não consegui ler lib/products.ts no servidor para regenerar o arquivo. " +
        "Rode o export em ambiente com o código-fonte presente (dev local) ou confira " +
        "outputFileTracingIncludes no next.config.",
    )
  }

  const markerIndex = source.indexOf(PRODUCTS_MARKER)
  if (markerIndex === -1) throw new Error("Marcador do array products não encontrado em lib/products.ts.")
  const start = source.indexOf("[", markerIndex + PRODUCTS_MARKER.length)
  if (start === -1) throw new Error("Início do array products não encontrado.")
  const end = findMatchingBracket(source, start) + 1

  const serialized = JSON.stringify(merged, null, 2)
  return source.slice(0, start) + serialized + source.slice(end)
}
