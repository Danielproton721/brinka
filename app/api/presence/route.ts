import { NextResponse } from "next/server"
import {
  countOnline,
  countToday,
  dailyHistory,
  rangeReport,
  recordDailyVisit,
  recordHeartbeat,
} from "@/lib/presence"

export const dynamic = "force-dynamic"

// Crawlers/preview/monitores executam o JS da loja e inflam o "online". Como o
// contador é métrica interna (só o admin vê), descartamos quem se identifica como
// bot. Não é anti-fraude — só higiene da contagem pra refletir gente de verdade.
const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|facebot|whatsapp|telegrambot|discordbot|embedly|quora|pinterest|redditbot|applebot|petalbot|yandex|baidu|sogou|duckduckbot|headless|phantomjs|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|monitor|python-requests|axios|node-fetch|curl|wget|go-http|java\/|okhttp|apache-httpclient|adsbot|mediapartners|apis-google|google-inspectiontool|vercelbot|preview/i

function isBot(ua: string): boolean {
  if (!ua) return true // sem User-Agent = quase sempre robô/health-check
  return BOT_UA.test(ua)
}

// Heartbeat do visitante: a loja chama isto periodicamente com um id de sessão.
// `count: true` (só no 1º ping do dia daquele navegador) registra a visita única.
export async function POST(request: Request) {
  if (isBot(request.headers.get("user-agent") || "")) {
    return NextResponse.json({ ok: true, skipped: "bot" })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const id = String(body?.id || "").slice(0, 64)
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  const now = Date.now()
  try {
    await recordHeartbeat(id, now)
    if (body?.count === true) await recordDailyVisit(id, now)
  } catch {
    // best effort — presença nunca derruba a navegação
  }
  return NextResponse.json({ ok: true })
}

// GET padrão → { online, today } (usado no poll ao vivo do painel).
// GET ?from=AAAA-MM-DD&to=AAAA-MM-DD → { days: [...], total } (relatório do período).
// GET ?range=N → { days: [...] } (compat: últimos N dias).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const from = params.get("from") || ""
  const to = params.get("to") || ""
  const range = Number(params.get("range") || 0)
  const now = Date.now()
  try {
    if (ISO_DATE.test(from) && ISO_DATE.test(to)) {
      const report = await rangeReport(from, to, now)
      return NextResponse.json(report)
    }
    if (range > 0) {
      const days = await dailyHistory(now, Math.min(range, 31))
      return NextResponse.json({ days })
    }
    const [online, today] = await Promise.all([countOnline(now), countToday(now)])
    return NextResponse.json({ online, today })
  } catch {
    if (ISO_DATE.test(from) && ISO_DATE.test(to)) return NextResponse.json({ days: [], total: 0 })
    if (range > 0) return NextResponse.json({ days: [] })
    return NextResponse.json({ online: 0, today: 0 })
  }
}
