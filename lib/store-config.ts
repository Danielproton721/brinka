// Liga/desliga do relay pelo painel, sem novo deploy.
// Guardado no KV (Upstash), igual ao gateway ativo.
//
// A env NOTIFY_URL_OVERRIDE segue valendo como fallback: sem KV configurado, ou
// enquanto o admin nunca tocar no botão, o comportamento é exatamente o de
// antes. Isso importa porque o notify_url entra no fluxo de cobrança — não
// pode depender de KV pra funcionar.

import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv-store"

export type RelayConfig = {
  /** false = o gateway recebe o domínio desta loja, ignorando a URL do relay. */
  enabled: boolean
  /** URL da loja da frente. Vazio cai na env NOTIFY_URL_OVERRIDE. */
  url: string
}

const KEY = "relay-config"
const TTL = 60 * 60 * 24 * 365 // ~1 ano: na prática permanente

function envUrl(): string {
  return (process.env.NOTIFY_URL_OVERRIDE || "").trim()
}

function comEnv(parcial?: Partial<RelayConfig> | null): RelayConfig {
  const daEnv = envUrl()
  return {
    // Ligado por padrão SE existir uma URL — sem URL não há relay pra ligar.
    enabled: parcial?.enabled ?? Boolean(daEnv),
    url: (parcial?.url ?? daEnv).trim(),
  }
}

export async function getRelayConfig(): Promise<RelayConfig> {
  if (!kvConfigured()) return comEnv()
  try {
    return comEnv(await kvGetJSON<Partial<RelayConfig>>(KEY))
  } catch {
    return comEnv()
  }
}

export async function setRelayConfig(patch: Partial<RelayConfig>): Promise<RelayConfig> {
  const atual = await getRelayConfig()
  const novo: RelayConfig = {
    enabled: patch.enabled ?? atual.enabled,
    url: (patch.url ?? atual.url).trim(),
  }
  await kvSetJSON(KEY, novo, TTL)
  return novo
}

// A URL que vai no notify_url do gateway. Vazio = o gateway usa o domínio desta
// loja, que é o comportamento sem relay.
export async function getRelayNotifyUrl(): Promise<string> {
  const cfg = await getRelayConfig()
  return cfg.enabled ? cfg.url : ""
}

// O painel precisa saber se o botão vai persistir a escolha.
export function relayConfigPersiste(): boolean {
  return kvConfigured()
}
