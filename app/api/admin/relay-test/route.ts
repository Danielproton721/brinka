import { NextResponse } from "next/server"

import { isAuthed } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// Testa o caminho do relay de ponta a ponta, SEM pagamento:
//   esta loja → loja da frente → ela repassa → volta em /api/webhooks/relay-in
// Como o aviso dá a volta e retorna pra cá, uma resposta prova o circuito todo.
//
// O id enviado não existe em gateway nenhum, então nada é marcado como pago: o
// handler do gateway consulta a API do provider e não acha a transação.
//
// Difere da versão da Gold Grill num ponto: lá a URL do relay mora na config do
// painel (gatewayConfig.relay.url). Aqui ela continua vindo da env
// NOTIFY_URL_OVERRIDE, que é como esta loja guarda esse endereço hoje.

const ID_DE_TESTE = "relay-test-nao-existe"

export async function POST() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = (process.env.NOTIFY_URL_OVERRIDE || "").trim()
  if (!url) {
    return NextResponse.json({
      ok: false,
      titulo: "Sem URL do relay",
      detalhe:
        "Defina NOTIFY_URL_OVERRIDE com a URL que a loja da frente te deu. Sem ela o gateway enxerga o domínio desta loja.",
    })
  }

  const segredo = (process.env.RELAY_SECRET || "").trim()
  if (!segredo) {
    return NextResponse.json({
      ok: false,
      titulo: "Sem RELAY_SECRET",
      detalhe:
        "O relay-in recusa qualquer aviso sem o header x-relay-secret. Defina a env com o mesmo segredo da loja da frente.",
    })
  }

  const inicio = Date.now()
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-relay-secret": segredo },
      body: JSON.stringify({ id: ID_DE_TESTE, teste: true }),
      cache: "no-store",
    })
    const ms = Date.now() - inicio
    const corpo = (await r.text().catch(() => "")).slice(0, 300)

    if (!r.ok) {
      return NextResponse.json({
        ok: false,
        titulo: `O relay respondeu ${r.status}`,
        detalhe: corpo || "Sem corpo na resposta.",
        ms,
      })
    }
    return NextResponse.json({
      ok: true,
      titulo: "Relay respondeu",
      detalhe:
        "O circuito está de pé. Nada foi marcado como pago — o id de teste não existe em gateway nenhum.",
      ms,
      resposta: corpo,
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      titulo: "Não consegui falar com o relay",
      detalhe: e?.message || "Falha de rede.",
      ms: Date.now() - inicio,
    })
  }
}
