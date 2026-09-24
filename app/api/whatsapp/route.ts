import { NextResponse } from "next/server"

import { getWhatsAppConfig, linkWhatsApp, numeroLegivel } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

// Lido pelo botão flutuante e pelo link do rodapé. É público de propósito: o
// número de atendimento aparece no site de qualquer jeito. O cache curto evita
// bater no KV a cada visita — a troca no painel aparece em até 1 minuto.
export async function GET() {
  const cfg = await getWhatsAppConfig()
  return NextResponse.json(
    {
      numero: cfg.numero,
      legivel: numeroLegivel(cfg.numero),
      link: linkWhatsApp(cfg.numero),
      botao: cfg.botao,
      rodape: cfg.rodape,
    },
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } },
  )
}
