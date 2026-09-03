// Store chave-valor persistente para ambientes serverless (Vercel).
//
// Usa o Upstash Redis via REST API (sem dependência nova — só `fetch`), o que
// funciona de forma confiável entre invocações/instâncias de função. Quando as
// variáveis não estão configuradas (ex.: dev local), cai num Map em memória.
//
// IMPORTANTE: o fallback em memória NÃO é confiável em produção serverless
// (cada lambda tem o seu). Em produção, provisione um Upstash Redis no
// Marketplace da Vercel e conecte ao projeto — isso injeta KV_REST_API_URL e
// KV_REST_API_TOKEN automaticamente.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const isKvConfigured = Boolean(REST_URL && REST_TOKEN);

// Fallback em memória (só serve para dev local — ver aviso acima).
const globalForKv = globalThis as typeof globalThis & {
  __fionobreKvMem?: Map<string, { value: string; expiresAt: number | null }>;
};
const memStore =
  globalForKv.__fionobreKvMem ?? new Map<string, { value: string; expiresAt: number | null }>();
globalForKv.__fionobreKvMem = memStore;

function memRead(key: string) {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memStore.delete(key);
    return null;
  }
  return entry;
}

async function command(args: (string | number)[]): Promise<any> {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[KV] comando falhou (${res.status}): ${text}`);
  }

  const data = await res.json().catch(() => null);
  return data?.result ?? null;
}

export async function kvGet(key: string): Promise<string | null> {
  if (!isKvConfigured) {
    const entry = memRead(key);
    return entry ? entry.value : null;
  }
  const result = await command(["GET", key]);
  if (result === null || result === undefined) return null;
  return typeof result === "string" ? result : String(result);
}

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!isKvConfigured) {
    memStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return;
  }
  const args: (string | number)[] = ["SET", key, value];
  if (ttlSeconds) args.push("EX", ttlSeconds);
  await command(args);
}

// SET key value NX — retorna true só se a chave ainda não existia.
// Usado como trava de idempotência (ex.: garantir 1 único e-mail por pedido).
export async function kvSetNx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  if (!isKvConfigured) {
    if (memRead(key)) return false;
    memStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return true;
  }
  const args: (string | number)[] = ["SET", key, value, "NX"];
  if (ttlSeconds) args.push("EX", ttlSeconds);
  const result = await command(args);
  return result === "OK";
}

export async function kvDel(key: string): Promise<void> {
  if (!isKvConfigured) {
    memStore.delete(key);
    return;
  }
  await command(["DEL", key]);
}

// ===========================================================================
//  Helpers extras usados pelo painel /admin (pedidos, presença, catálogo).
//  São ADIÇÕES — não alteram o comportamento de kvGet/kvSet/kvSetNx/kvDel de
//  que o fluxo de PIX/e-mail depende. Tudo degrada gracioso sem Upstash.
// ===========================================================================

export function kvConfigured(): boolean {
  return isKvConfigured;
}

// JSON por cima do GET/SET existentes (herdam o fallback em memória).
export async function kvSetJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await kvSet(key, JSON.stringify(value), ttlSeconds);
}

export async function kvGetJSON<T = unknown>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// --- Sorted sets (indexa pedidos por data; conta presença ao vivo) ----------
// Fallback em memória pra dev local: Map<key, Map<member, score>>.
const memZ =
  (globalForKv as typeof globalForKv & { __fionobreKvZ?: Map<string, Map<string, number>> })
    .__fionobreKvZ ?? new Map<string, Map<string, number>>();
(globalForKv as typeof globalForKv & { __fionobreKvZ?: Map<string, Map<string, number>> }).__fionobreKvZ = memZ;

function memZSet(key: string) {
  let set = memZ.get(key);
  if (!set) {
    set = new Map();
    memZ.set(key, set);
  }
  return set;
}

export async function kvZAdd(key: string, score: number, member: string): Promise<void> {
  if (!isKvConfigured) {
    memZSet(key).set(member, score);
    return;
  }
  await command(["ZADD", key, score, member]);
}

export async function kvZRevRange(key: string, start: number, stop: number): Promise<string[]> {
  if (!isKvConfigured) {
    const ordered = [...memZSet(key).entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
    const end = stop < 0 ? ordered.length + stop + 1 : stop + 1;
    return ordered.slice(start, end);
  }
  const res = await command(["ZREVRANGE", key, start, stop]);
  return Array.isArray(res) ? res.map(String) : [];
}

export async function kvZRemRangeByScore(key: string, min: number, max: number): Promise<number> {
  if (!isKvConfigured) {
    const set = memZSet(key);
    let removed = 0;
    for (const [member, score] of set) {
      if (score >= min && score <= max) {
        set.delete(member);
        removed += 1;
      }
    }
    return removed;
  }
  const res = await command(["ZREMRANGEBYSCORE", key, min, max]);
  return typeof res === "number" ? res : Number(res) || 0;
}

export async function kvZCard(key: string): Promise<number> {
  if (!isKvConfigured) return memZSet(key).size;
  const res = await command(["ZCARD", key]);
  return typeof res === "number" ? res : Number(res) || 0;
}

// --- HyperLogLog (visitantes únicos por dia) --------------------------------
// Conta únicos aproximados com memória ~fixa e barata (1 comando por add/leitura).
// Fallback dev: um Set por chave (exato em memória).
const memHll =
  (globalForKv as typeof globalForKv & { __fionobreKvHll?: Map<string, Set<string>> })
    .__fionobreKvHll ?? new Map<string, Set<string>>();
(globalForKv as typeof globalForKv & { __fionobreKvHll?: Map<string, Set<string>> }).__fionobreKvHll = memHll;

function memHllSet(key: string) {
  let set = memHll.get(key);
  if (!set) {
    set = new Set();
    memHll.set(key, set);
  }
  return set;
}

export async function kvPfAdd(key: string, member: string): Promise<void> {
  if (!isKvConfigured) {
    memHllSet(key).add(member);
    return;
  }
  await command(["PFADD", key, member]);
}

export async function kvPfCount(key: string): Promise<number> {
  if (!isKvConfigured) return memHllSet(key).size;
  const res = await command(["PFCOUNT", key]);
  return typeof res === "number" ? res : Number(res) || 0;
}

// Cardinalidade da UNIÃO de vários HLLs em 1 comando (PFCOUNT k1 k2 ...).
// Serve pra "quantos únicos no período" sem somar dias (pessoa repetida conta 1x).
export async function kvPfCountUnion(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  if (!isKvConfigured) {
    const union = new Set<string>();
    for (const k of keys) for (const m of memHllSet(k)) union.add(m);
    return union.size;
  }
  const res = await command(["PFCOUNT", ...keys]);
  return typeof res === "number" ? res : Number(res) || 0;
}

export async function kvExpire(key: string, seconds: number): Promise<void> {
  if (!isKvConfigured) return; // fallback em memória não expira (some no restart)
  await command(["EXPIRE", key, seconds]);
}

// INCRBY — contador atômico. Usado pelas séries diárias de pedidos
// (lib/order-stats.ts): 1 comando por evento, sem ler-modificar-gravar.
export async function kvIncrBy(key: string, by: number): Promise<number> {
  if (!isKvConfigured) {
    const atual = Number(memRead(key)?.value ?? 0) || 0;
    const novo = atual + by;
    memStore.set(key, { value: String(novo), expiresAt: null });
    return novo;
  }
  const res = await command(["INCRBY", key, by]);
  return typeof res === "number" ? res : Number(res) || 0;
}

// Lê várias chaves de uma vez (MGET). Devolve number por posição, 0 pra ausente.
// Uma chamada em vez de N no relatório por período.
export async function kvMGetNumbers(keys: string[]): Promise<number[]> {
  if (keys.length === 0) return [];
  if (!isKvConfigured) return keys.map((k) => Number(memRead(k)?.value ?? 0) || 0);
  const res = await command(["MGET", ...keys]);
  if (!Array.isArray(res)) return keys.map(() => 0);
  return res.map((v) => (v == null ? 0 : Number(v) || 0));
}
