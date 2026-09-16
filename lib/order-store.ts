// Persistência do pedido associada ao txid da transação.
//
// O webhook da Pagou só recebe txid + status — não tem os itens nem o endereço.
// Por isso o pedido completo é persistido no momento em que o PIX é criado,
// para que o webhook consiga montar e disparar o e-mail de confirmação mesmo
// que o cliente já tenha fechado a aba.

import { kvGet, kvSet } from "./kv-store";
import type { OrderEmailInput } from "./order-email";

export type StoredOrder = OrderEmailInput & {
  txid: string;
  createdAt: string;
  // Gravado pelo painel na primeira leitura: a marca do gateway por txid
  // (lib/gateways/active) expira em 3 dias, o pedido não.
  gateway?: string;
};

// Sem prazo de validade: o pedido fica guardado para sempre e só sai quando
// alguém apaga pelo painel (/api/admin/orders/delete). Antes expirava em 48h e
// o histórico de pedidos se perdia.
export async function saveOrder(txid: string, order: StoredOrder): Promise<void> {
  await kvSet(`order:${txid}`, JSON.stringify(order));
}

export async function getOrder(txid: string): Promise<StoredOrder | null> {
  const raw = await kvGet(`order:${txid}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOrder;
  } catch {
    return null;
  }
}
