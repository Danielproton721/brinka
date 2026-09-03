// Fotos reais de cliente por produto (aparecem em algumas reviews da PDP).
// Chave = slug do produto → URLs de fotos.
//
// VAZIO de propósito: só entra foto aqui se for foto REAL de comprador
// (cliente que recebeu e postou). Foto de catálogo/lifestyle da loja NÃO vale
// como review — fica falso. Enquanto não houver foto real de cliente, sem foto.
export const reviewPhotos: Record<string, string[]> = {}
