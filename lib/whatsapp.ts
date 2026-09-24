// WhatsApp da loja: número + liga/desliga do botão flutuante e do link no
// rodapé, guardado no KV (Upstash) pra mudar pelo painel sem novo deploy.
// Sem KV, valem os padrões abaixo — o botão nunca some por falta de KV.

import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv-store"

export type WhatsAppConfig = {
  /** Só dígitos, com DDI. Ex.: 5531975148344 */
  numero: string
  /** Botão flutuante no canto da tela. */
  botao: boolean
  /** Link no rodapé. */
  rodape: boolean
}

const KEY = "whatsapp-config"
const TTL = 60 * 60 * 24 * 365

export const WHATSAPP_PADRAO: WhatsAppConfig = {
  numero: "5531975148344",
  botao: true,
  rodape: true,
}

export const MENSAGEM_PADRAO = "Olá! Vim pelo site da BRINKA e preciso de ajuda."

// Aceita o número digitado de qualquer jeito ((31) 97514-8344, com ou sem 55).
export function normalizaNumero(valor: unknown): string {
  const digitos = String(valor ?? "").replace(/\D/g, "")
  if (!digitos) return ""
  return digitos.length <= 11 ? `55${digitos}` : digitos
}

export function linkWhatsApp(numero: string, mensagem = MENSAGEM_PADRAO): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

// Número formatado pra leitura: +55 (31) 97514-8344
export function numeroLegivel(numero: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(numero)
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : numero
}

function completa(parcial?: Partial<WhatsAppConfig> | null): WhatsAppConfig {
  const numero = normalizaNumero(parcial?.numero) || WHATSAPP_PADRAO.numero
  return {
    numero,
    botao: parcial?.botao ?? WHATSAPP_PADRAO.botao,
    rodape: parcial?.rodape ?? WHATSAPP_PADRAO.rodape,
  }
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  if (!kvConfigured()) return WHATSAPP_PADRAO
  try {
    return completa(await kvGetJSON<Partial<WhatsAppConfig>>(KEY))
  } catch {
    return WHATSAPP_PADRAO
  }
}

export async function setWhatsAppConfig(patch: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
  const atual = await getWhatsAppConfig()
  const novo = completa({ ...atual, ...patch })
  await kvSetJSON(KEY, novo, TTL)
  return novo
}

/** O painel precisa saber se o botão vai guardar a escolha. */
export function whatsappPersiste(): boolean {
  return kvConfigured()
}
