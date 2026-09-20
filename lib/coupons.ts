// Cupons da loja.
//
// Este arquivo é a ÚNICA fonte da verdade do desconto: o carrinho (cliente) e o
// /api/checkout/session (servidor) leem daqui. Assim o desconto que o cliente vê
// é exatamente o que o servidor assina e o gateway cobra — se os dois
// divergirem, a criação do PIX falha com "amount_mismatch".

export type Cupom = {
  code: string
  pct: number
  // Quantos produtos DIFERENTES o carrinho precisa ter pro cupom valer.
  minProdutos: number
  descricao: string
}

export const CUPOM_PADRAO = "PRIMEIRACOMPRA"
// Recuperação de quem montou o carrinho com as duas versões e não pagou.
export const CUPOM_COMBO = "COMBO10"
export const CUPOM_COMBO_PCT = 10

export const CUPONS: Cupom[] = [
  { code: CUPOM_PADRAO, pct: 5, minProdutos: 1, descricao: "5% de desconto" },
  { code: CUPOM_COMBO, pct: CUPOM_COMBO_PCT, minProdutos: 2, descricao: "10% levando os dois carrinhos" },
]

export function normalizarCupom(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().toUpperCase() : ""
}

export function acharCupom(valor: unknown): Cupom | null {
  const code = normalizarCupom(valor)
  if (!code) return null
  return CUPONS.find((c) => c.code === code) ?? null
}

// Percentual que vale de fato: 0 quando o cupom não existe ou quando o carrinho
// ainda não tem produtos diferentes suficientes.
export function pctDoCupom(valor: unknown, produtosDiferentes: number): number {
  const cupom = acharCupom(valor)
  if (!cupom) return 0
  return produtosDiferentes >= cupom.minProdutos ? cupom.pct : 0
}
