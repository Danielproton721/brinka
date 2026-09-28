// Linha do tempo do rastreio — fonte única.
// O site (components/TrackingSimulator) e o painel /admin leem daqui, senão o
// status que o cliente vê e o que você vê podiam divergir.

// Horas, contadas a partir da compra, em que cada etapa entra como concluída.
export const STEP_OFFSET_HOURS = [
  0, // 0 Pagamento aprovado — instante da compra
  1, // 1 Em preparação
  1 + 24, // 2 Postagem preparada
  1 + 24 + 3, // 3 Em transporte
  1 + 24 + 3 + 9 * 24 + 1, // 4 Saiu para entrega
  1 + 24 + 3 + 9 * 24 + 1 + 5, // 5 Tentativa não efetuada
  1 + 24 + 3 + 9 * 24 + 1 + 5 + 6, // 6 Voltando para a base
  1 + 24 + 3 + 9 * 24 + 1 + 5 + 6 + 24, // 7 Saiu para entrega (2ª)
  1 + 24 + 3 + 9 * 24 + 1 + 5 + 6 + 24 + 3, // 8 Entregue
]

export const STATUS_TITLES = [
  "Pagamento aprovado",
  "Em preparação",
  "Postagem preparada",
  "Em transporte",
  "Saiu para entrega",
  "Tentativa de entrega não efetuada",
  "Pedido voltando para a base de distribuição",
  "Saiu para entrega",
  "Entregue",
]

export const LAST_STEP_INDEX = STATUS_TITLES.length - 1

/** Em que etapa o pedido está, pelo tempo decorrido desde a compra. */
export function progressIndexFromCreated(createdAt: Date, now: Date = new Date()): number {
  const horas = (now.getTime() - createdAt.getTime()) / 3600000
  let etapa = 0
  for (let i = 0; i < STEP_OFFSET_HOURS.length; i += 1) {
    if (horas >= STEP_OFFSET_HOURS[i]) etapa = i
  }
  return etapa
}

/** Título da etapa atual. Data inválida vira a primeira etapa. */
export function statusRastreio(createdAtIso?: string | null, now: Date = new Date()): string {
  const criado = createdAtIso ? new Date(createdAtIso) : null
  if (!criado || Number.isNaN(criado.getTime())) return STATUS_TITLES[0]
  return STATUS_TITLES[progressIndexFromCreated(criado, now)]
}
