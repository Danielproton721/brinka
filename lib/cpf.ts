// Validação de CPF pelos dígitos verificadores.
//
// Antes o checkout só conferia se havia 11 dígitos. Um CPF com um número
// trocado passava pela identificação e só era recusado pelo gateway na hora de
// gerar o PIX — o cliente via "Não conseguimos gerar o PIX agora" sem saber
// que o problema era o CPF, e desistia.

export function cpfDigits(value: string): string {
  return (value || "").replace(/\D/g, "")
}

export function isValidCpf(value: string): boolean {
  const d = cpfDigits(value)
  if (d.length !== 11) return false
  // 000.000.000-00, 111.111.111-11... passam na conta mas não existem.
  if (/^(\d)\1{10}$/.test(d)) return false

  const digito = (base: string, pesoInicial: number) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const d1 = digito(d.slice(0, 9), 10)
  if (d1 !== Number(d[9])) return false
  const d2 = digito(d.slice(0, 10), 11)
  return d2 === Number(d[10])
}
