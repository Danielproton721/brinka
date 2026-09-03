import { kvGet, kvSet } from "./kv-store";

type PaymentStatusRecord = {
  status: string;
  transactionId: string;
  paymentMethod?: string | null;
  event?: string | null;
  updatedAt: string;
};

const STATUS_TTL_SECONDS = 60 * 60 * 48; // 48h

export function normalizePaymentStatus(status: unknown) {
  return String(status ?? "").trim().toLowerCase();
}

export function isGatewayPaidStatus(status: unknown) {
  const normalized = normalizePaymentStatus(status);

  return (
    ["paid", "approved", "authorized"].includes(normalized) ||
    normalized.endsWith(".paid") ||
    normalized.endsWith("_paid") ||
    normalized.endsWith(":paid")
  );
}

// Persistido no KV (compartilhado entre invocações serverless) — antes era um
// Map em memória, que não funcionava na Vercel porque o webhook e o polling
// caem em instâncias de função diferentes.
export async function recordPaymentStatus(status: PaymentStatusRecord): Promise<void> {
  await kvSet(`status:${status.transactionId}`, JSON.stringify(status), STATUS_TTL_SECONDS);
}

export async function getPaymentStatus(transactionId: string): Promise<PaymentStatusRecord | null> {
  const raw = await kvGet(`status:${transactionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PaymentStatusRecord;
  } catch {
    return null;
  }
}
