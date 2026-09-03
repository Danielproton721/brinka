"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Pencil, Plus, Trash2, X } from "lucide-react"
import type { Catalog, ProductRow } from "@/lib/catalog"

const brl = (v: string | number) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return ""
  return `R$ ${n.toFixed(2).replace(".", ",")}`
}

export function ProductsPanel({
  initialCatalog,
  columns,
  kvOk,
  initialPending,
}: {
  initialCatalog: Catalog
  columns: Record<string, string>
  kvOk: boolean
  initialPending: number
}) {
  const [catalog, setCatalog] = useState<Catalog>(initialCatalog)
  const [pending, setPending] = useState(initialPending)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newImageUrl, setNewImageUrl] = useState("")

  const idHeader = columns.id
  const headers = catalog.headers

  // Trava o scroll do fundo enquanto o editor (modal) está aberto.
  useEffect(() => {
    if (!editing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [editing])

  // Colunas mostradas na tabela do desktop (o editor mostra todos os campos).
  const displayCols = useMemo(() => {
    const order = ["id", "name", "price", "compareAtPrice", "category", "slug"]
    return order.map((k) => columns[k]).filter((h) => h && headers.includes(h))
  }, [columns, headers])

  const imageHeader = columns.image && headers.includes(columns.image) ? columns.image : null

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog.rows
    return catalog.rows.filter((r) =>
      [r[columns.name], r[idHeader], r[columns.category], r[columns.slug]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [catalog.rows, query, columns, idHeader])

  const visibleRows = rows.slice(0, 300)

  async function refresh() {
    const r = await fetch("/api/admin/products", { cache: "no-store" })
    const d = await r.json().catch(() => null)
    if (d?.catalog) setCatalog(d.catalog)
    if (typeof d?.pending === "number") setPending(d.pending)
  }

  function nextId(): string {
    const max = catalog.rows.reduce((m, r) => {
      const n = Number(r[idHeader])
      return Number.isFinite(n) && n > m ? n : m
    }, 0)
    return String(max + 1)
  }

  function startNew() {
    const blank: ProductRow = {}
    headers.forEach((h) => (blank[h] = ""))
    blank[idHeader] = nextId()
    blank.images = "[]"
    setEditing(blank)
    setIsNew(true)
    setMsg(null)
    setNewImageUrl("")
  }

  function startEdit(row: ProductRow) {
    setEditing({ ...row })
    setIsNew(false)
    setMsg(null)
    setNewImageUrl("")
  }

  // Galeria de fotos: viaja como JSON dentro de editing.images (ver lib/catalog.ts).
  function galleryOf(row: ProductRow | null): string[] {
    if (!row) return []
    try {
      const arr = JSON.parse(row.images ?? "[]")
      return Array.isArray(arr) ? arr.filter((u) => typeof u === "string") : []
    } catch {
      return []
    }
  }

  function setGallery(next: string[]) {
    if (!editing) return
    setEditing({ ...editing, images: JSON.stringify(next), image: next[0] ?? editing.image ?? "" })
  }

  function addImage() {
    const url = newImageUrl.trim()
    if (!url) return
    setGallery([...galleryOf(editing), url])
    setNewImageUrl("")
  }

  function removeImage(idx: number) {
    setGallery(galleryOf(editing).filter((_, i) => i !== idx))
  }

  function makeCover(idx: number) {
    const imgs = galleryOf(editing)
    if (idx <= 0 || idx >= imgs.length) return
    const next = [...imgs]
    const [item] = next.splice(idx, 1)
    next.unshift(item)
    setGallery(next)
  }

  async function save() {
    if (!editing) return
    if (!(editing[idHeader] ?? "").trim()) {
      setMsg({ ok: false, text: `Preencha o campo de id ("${idHeader}").` })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ row: editing }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || "Erro ao salvar.")
      await refresh()
      setEditing(null)
      setMsg({ ok: true, text: isNew ? "Produto adicionado." : "Produto atualizado." })
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Erro ao salvar." })
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm(`Excluir o produto "${id}"?`)) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || "Erro ao excluir.")
      await refresh()
      setMsg({ ok: true, text: "Produto excluído." })
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Erro ao excluir." })
    } finally {
      setBusy(false)
    }
  }

  // Campos longos viram textarea no editor.
  const longFields = new Set([columns.description].filter(Boolean))

  return (
    <div>
      {/* Barra de ações */}
      <div className="mb-4 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, id, categoria…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground sm:text-sm">
            {rows.length} de {catalog.rows.length} produto(s)
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2 sm:flex-none">
            <button
              onClick={startNew}
              disabled={!kvOk || busy}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:flex-none"
            >
              <Plus className="h-4 w-4" /> Adicionar produto
            </button>
            <a
              href="/api/admin/products/export"
              title="Baixar uma cópia .ts do catálogo (backup opcional)"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Backup</span>
            </a>
          </div>
        </div>
      </div>

      {!kvOk && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          KV (Upstash) não configurado — catálogo em <strong>somente leitura</strong>. Provisione o Upstash na Vercel
          pra editar/adicionar. O array em <code className="font-mono">lib/products.ts</code> continua sendo a fonte.
        </div>
      )}

      <div className="mb-4 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Edite preço, nome, fotos e descrição — as mudanças <strong>aparecem no site em alguns segundos</strong>.
        Variantes e avaliações não são editadas aqui e ficam preservadas. Produtos{" "}
        <strong>novos</strong> só entram no site após um novo deploy.
      </div>

      {msg && (
        <p className={`mb-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      )}

      {/* Lista vazia */}
      {visibleRows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {catalog.rows.length === 0
            ? "Nenhum produto encontrado no catálogo."
            : "Nenhum produto bate com a busca."}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-2 md:hidden">
            {visibleRows.map((row) => {
              const id = row[idHeader]
              const price = brl(row[columns.price])
              const compareRaw = Number(row[columns.compareAtPrice])
              const showCompare =
                Number.isFinite(compareRaw) && compareRaw > Number(row[columns.price])
              return (
                <div key={id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex gap-3">
                    {imageHeader &&
                      (row[imageHeader] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row[imageHeader]}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded-lg bg-muted" />
                      ))}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold text-foreground">
                        {row[columns.name] || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        #{id}
                        {row[columns.category] ? ` · ${row[columns.category]}` : ""}
                      </div>
                      {price && (
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="font-bold text-foreground">{price}</span>
                          {showCompare && (
                            <span className="text-xs text-muted-foreground line-through">
                              {brl(compareRaw)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-2 border-t border-border/60 pt-2">
                    <button
                      onClick={() => startEdit(row)}
                      disabled={!kvOk}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => remove(id)}
                      disabled={!kvOk}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {imageHeader && <th className="px-4 py-3 font-semibold">Img</th>}
                  {displayCols.map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const id = row[idHeader]
                  return (
                    <tr key={id} className="border-b border-border/60 last:border-0">
                      {imageHeader && (
                        <td className="px-4 py-2">
                          {row[imageHeader] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row[imageHeader]} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted" />
                          )}
                        </td>
                      )}
                      {displayCols.map((h) => (
                        <td key={h} className="px-4 py-2 text-foreground">
                          <div className="max-w-[220px] truncate">{row[h]}</div>
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(row)}
                            disabled={!kvOk}
                            title="Editar"
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(id)}
                            disabled={!kvOk}
                            title="Excluir"
                            className="rounded-lg border border-border p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {rows.length > 300 && (
            <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
              Mostrando 300 de {rows.length}. Use a busca pra filtrar.
            </div>
          )}
        </>
      )}

      {/* Editor — bottom-sheet no mobile, modal centralizado no desktop.
          Abre sobreposto onde você estiver na lista; Salvar fica fixo no rodapé. */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => !busy && setEditing(null)}
        >
          <div
            className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:max-h-[88vh] sm:max-w-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header fixo */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-bold text-foreground">{isNew ? "Novo produto" : "Editar produto"}</h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo com scroll */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Galeria de fotos: preview em grade, deletar e trocar capa */}
              <div className="mb-4">
                <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Fotos do produto{galleryOf(editing).length > 0 ? ` (${galleryOf(editing).length})` : ""}
                </div>
                {galleryOf(editing).length > 0 && (
                  <div className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {galleryOf(editing).map((url, idx) => (
                      <div
                        key={`${idx}-${url}`}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          onClick={() => makeCover(idx)}
                          title={idx === 0 ? "Capa atual" : "Tornar capa"}
                          className="h-full w-full cursor-pointer object-cover"
                        />
                        {idx === 0 && (
                          <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                            Capa
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          title="Remover foto"
                          className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addImage()
                      }
                    }}
                    placeholder="Cole a URL/caminho da foto (ex: /fotos/preto.png)"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    Adicionar
                  </button>
                </div>
                {galleryOf(editing).length === 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Nenhuma foto ainda — cole uma URL acima.</p>
                )}
                {galleryOf(editing).length > 1 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Clique numa foto pra torná-la a capa. A 1ª foto é sempre a capa exibida nos cards.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {headers.filter((h) => h !== imageHeader).map((h) => (
                  <label
                    key={h}
                    className={`text-xs font-semibold text-muted-foreground ${longFields.has(h) ? "sm:col-span-2" : ""}`}
                  >
                    {h}
                    {h === idHeader && !isNew ? " (chave)" : ""}
                    {longFields.has(h) ? (
                      <textarea
                        value={editing[h] ?? ""}
                        onChange={(e) => setEditing({ ...editing, [h]: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    ) : (
                      <input
                        value={editing[h] ?? ""}
                        onChange={(e) => setEditing({ ...editing, [h]: e.target.value })}
                        disabled={h === idHeader && !isNew}
                        inputMode={
                          [columns.price, columns.compareAtPrice, columns.rating, columns.reviews].includes(h)
                            ? "decimal"
                            : undefined
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Footer fixo com Salvar */}
            <div
              className="flex gap-2 border-t border-border bg-card px-4 py-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:flex-none"
              >
                {busy ? "Salvando…" : "Salvar"}
              </button>
              <button
                onClick={() => setEditing(null)}
                disabled={busy}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
