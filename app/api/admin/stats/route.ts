import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"
import { rangeReport } from "@/lib/presence"
import { ordersByDay } from "@/lib/order-stats"
import { listRecentOrders } from "@/lib/orders"

export const dynamic = "force-dynamic"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Visitantes + pedidos do MESMO período, alinhados dia a dia.
//
// Fica em /api/admin (e não em /api/presence) de propósito: presence é público
// — o site inteiro bate lá pro heartbeat. Pendurar venda e faturamento numa rota
// aberta entregaria o resultado da loja pra qualquer visitante.
export async function GET(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const from = params.get("from") || ""
  const to = params.get("to") || ""
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return NextResponse.json({ error: "Informe from e to no formato AAAA-MM-DD." }, { status: 400 })
  }

  try {
    const visitas = await rangeReport(from, to, Date.now())
    const datas = visitas.days.map((d) => d.date)
    const pedidos = await ordersByDay(datas)

    // Pendentes AGORA (não é série histórica): quantos pedidos abertos existem
    // neste momento. Vem do índice vivo, não do contador diário — "pendente" é
    // um estado que muda, não um evento que aconteceu num dia.
    const recentes = await listRecentOrders(100)
    const pendentesAgora = recentes.filter((o) => o.status === "aguardando").length
    const abandonadosAgora = recentes.filter((o) => o.status === "abandonado").length

    // Distribuição (rosca) — sai do índice vivo, então cobre os últimos 7 dias
    // (poda do índice), NÃO o período do seletor. A UI rotula isso; misturar as
    // duas janelas no mesmo bloco daria número que não fecha com o de cima.
    const conta = <T extends string>(chave: (o: (typeof recentes)[number]) => T | null) => {
      const m: Record<string, { n: number; cents: number }> = {}
      for (const o of recentes) {
        const k = chave(o)
        if (!k) continue
        m[k] ??= { n: 0, cents: 0 }
        m[k].n += 1
        m[k].cents += Math.round((Number(o.total) || 0) * 100)
      }
      return m
    }

    const porStatus = conta((o) => o.status)
    const porMetodo = conta((o) => (o.paymentMethod === "card" ? "cartao" : "pix"))
    const porGateway = conta((o) => (o.gateway ?? "—") as string)

    const dias = visitas.days.map((d, i) => ({
      date: d.date,
      visitors: d.count,
      created: pedidos[i]?.created ?? 0,
      paid: pedidos[i]?.paid ?? 0,
      revenueCents: pedidos[i]?.revenueCents ?? 0,
    }))

    const totalPagos = dias.reduce((s, d) => s + d.paid, 0)
    const totalCriados = dias.reduce((s, d) => s + d.created, 0)
    const receitaCents = dias.reduce((s, d) => s + d.revenueCents, 0)

    return NextResponse.json({
      days: dias,
      total: visitas.total,
      prevTotal: visitas.prevTotal,
      orders: {
        paid: totalPagos,
        created: totalCriados,
        revenueCents: receitaCents,
        pendingNow: pendentesAgora,
        abandonedNow: abandonadosAgora,
      },
      // Janela diferente da de cima (7 dias, não o seletor) — a UI avisa.
      breakdown: {
        windowDays: 7,
        totalOrders: recentes.length,
        byStatus: porStatus,
        byMethod: porMetodo,
        byGateway: porGateway,
      },
    })
  } catch {
    return NextResponse.json({
      days: [],
      total: 0,
      prevTotal: 0,
      orders: { paid: 0, created: 0, revenueCents: 0, pendingNow: 0, abandonedNow: 0 },
      breakdown: { windowDays: 7, totalOrders: 0, byStatus: {}, byMethod: {}, byGateway: {} },
    })
  }
}
