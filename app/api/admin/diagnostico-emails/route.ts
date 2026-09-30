import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import { kvGetJSON } from "@/lib/kv-store"
import {
  CHEGADA_ULTIMA_KEY,
  QSTASH_ULTIMO_KEY,
  abandonedSig,
  qstashConfigured,
  scheduleDelayedCall,
} from "@/lib/qstash"

export const dynamic = "force-dynamic"

// Diagnóstico do e-mail automático de pedido pendente (e do de "postado"),
// que dependem do QStash chamar a loja depois de alguns minutos.
//
// GET  → último agendamento feito (resposta do QStash) e última chamada que
//        chegou na loja (com o motivo do resultado).
// POST → agenda um teste de 10 s para /api/abandoned/check com um txid falso
//        ("diag-…"). Não existe pedido com esse txid, então nenhum e-mail sai;
//        se a chegada aparecer no GET com motivo "sem-snapshot", o caminho
//        inteiro funciona (agendar → QStash → loja → leitura do pedido).
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 })
  const [ultimoAgendamento, ultimaChegada] = await Promise.all([
    kvGetJSON(QSTASH_ULTIMO_KEY).catch(() => null),
    kvGetJSON(CHEGADA_ULTIMA_KEY).catch(() => null),
  ])
  return NextResponse.json({ ok: true, qstashConfigurado: qstashConfigured(), ultimoAgendamento, ultimaChegada })
}

export async function POST() {
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 })
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
  if (!qstashConfigured()) return NextResponse.json({ ok: false, error: "QSTASH_TOKEN não configurado." })
  if (!appUrl) return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_APP_URL não configurado." })

  const txid = `diag-${Date.now()}`
  const callback = `${appUrl}/api/abandoned/check?txid=${encodeURIComponent(txid)}&sig=${abandonedSig(txid)}`
  try {
    await scheduleDelayedCall(callback, 10)
  } catch (e: any) {
    const ultimoAgendamento = await kvGetJSON(QSTASH_ULTIMO_KEY).catch(() => null)
    return NextResponse.json({ ok: false, error: String(e?.message || e).slice(0, 300), ultimoAgendamento })
  }
  const ultimoAgendamento = await kvGetJSON(QSTASH_ULTIMO_KEY).catch(() => null)
  return NextResponse.json({ ok: true, agendado: txid.slice(-8), chegaEmSegundos: 10, ultimoAgendamento })
}
