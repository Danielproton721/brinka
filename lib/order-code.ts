// Geração do código do pedido no servidor.
//
// Replica o formato visual usado no checkout (2 letras + 9 dígitos + 2 letras),
// para manter consistência de marca e do rastreio. A fonte da verdade do código
// passa a ser o servidor (no /api/pix/create), que devolve o código ao front
// para ele popular o localStorage do rastreio com o MESMO valor.

const ORDER_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I/O para evitar confusão visual

function randomOrderLetters(count: number) {
  let out = "";
  for (let index = 0; index < count; index += 1) {
    out += ORDER_LETTERS[Math.floor(Math.random() * ORDER_LETTERS.length)];
  }
  return out;
}

export function buildOrderCode(source: string) {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(31, hash) + source.charCodeAt(index);
    hash |= 0;
  }

  const prefix = randomOrderLetters(2);
  const numberSeed = Math.abs(hash + Date.now());
  const number = String(numberSeed % 1000000000).padStart(9, "0");
  const suffix = randomOrderLetters(2);

  return `${prefix}${number}${suffix}`;
}
