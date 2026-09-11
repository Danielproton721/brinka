"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Mail,
  MapPin,
  PackageCheck,
  Search,
  Trash2,
  Truck,
} from "lucide-react";

// Chaves usadas pelo checkout do brinka pra gravar o pedido do cliente —
// aqui só lemos, pra que o rastreio já venha com nome, endereço e savedAt.
const STORAGE_KEY = "brinka-tracking-cache-v1";
const ORDER_LOOKUP_STORAGE_KEY = "brinka-order-lookup-v1";
const MAX_RECENT = 5;

// Recalcula o status a cada 1 minuto — o passo atual é derivado do tempo
// decorrido desde a compra (savedAt), não de um timer que só avança.
const PROGRESS_UPDATE_INTERVAL_MS = 60 * 1000;

// Offset em horas, a partir do momento da compra, em que cada step entra
// como "completo". Ex.: index 3 ("Em transporte") chega 28 h depois e
// permanece como o status corrente por 9 dias antes do próximo.
const STEP_OFFSET_HOURS = [
  0,
  1,
  1 + 24,
  1 + 24 + 3,
  1 + 24 + 3 + 9 * 24 + 1,
  1 + 24 + 3 + 9 * 24 + 1 + 5,
  1 + 24 + 3 + 9 * 24 + 1 + 5 + 6,
  1 + 24 + 3 + 9 * 24 + 1 + 5 + 6 + 24,
  1 + 24 + 3 + 9 * 24 + 1 + 5 + 6 + 24 + 3,
];

const carrierLabels = {
  correios: "Correios",
  fedex: "FedEx",
  dhl: "DHL",
  ups: "UPS",
  brinka: "Brinka Entregas",
};

const statusTitles = [
  "Pagamento aprovado",
  "Em preparação",
  "Postagem preparada",
  "Em transporte",
  "Saiu para entrega",
  "Tentativa de entrega não efetuada",
  "Pedido voltando para a base de distribuição",
  "Saiu para entrega",
  "Entregue",
];

const LAST_STEP_INDEX = statusTitles.length - 1;
const ATTEMPT_FAILED_STEP_INDEX = 5;
const RETURNING_TO_BASE_STEP_INDEX = 6;
const SECOND_DELIVERY_ATTEMPT_STEP_INDEX = 7;
const HIDDEN_UNTIL_CURRENT_STEP_INDEXES = [
  ATTEMPT_FAILED_STEP_INDEX,
  RETURNING_TO_BASE_STEP_INDEX,
];

const stepDescriptions = [
  "Pagamento aprovado e pedido confirmado no sistema da loja.",
  "Pedido em preparação no centro de preparo.",
  "Remessa vinculada à transportadora.",
  "Pacote em transferência para a unidade regional.",
  "Entrega em rota para o endereço informado.",
  "A transportadora não conseguiu concluir a entrega nesta tentativa.",
  "Pedido retornando para a base de distribuição para uma nova tentativa de entrega.",
  "Nova tentativa de entrega em rota para o endereço informado.",
  "Entrega finalizada no endereço do pedido.",
];

const hubs = [
  "São Paulo, SP",
  "Campinas, SP",
  "Curitiba, PR",
  "Belo Horizonte, MG",
  "Rio de Janeiro, RJ",
  "Joinville, SC",
];

function normalizeCode(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function hashCode(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function detectCarrier(code) {
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) return "correios";
  if (/^1Z[A-Z0-9]{16}$/.test(code)) return "ups";
  if (/^\d{12}$/.test(code)) return "fedex";
  if (/^\d{10}$/.test(code)) return "dhl";
  return "brinka";
}

function formatDisplayCode(code, carrierId) {
  if (/^CB\d{8}\d{6}$/.test(code)) {
    return `CB-${code.slice(2, 10)}-${code.slice(10)}`;
  }
  if (carrierId === "correios") return code;
  if (carrierId === "ups") {
    return `${code.slice(0, 2)} ${code.slice(2, 8)} ${code.slice(8, 14)} ${code.slice(14)}`;
  }
  if (/^\d+$/.test(code)) return code.replace(/(\d{3})(?=\d)/g, "$1 ");
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}

function dateAt(base, daysOffset, seed) {
  const date = new Date(base);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(8 + ((seed + daysOffset * 7) % 9));
  date.setMinutes((seed + daysOffset * 11) % 60);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

// Data exata de um step com base no horário da compra + offset definido.
function stepDateFromCreated(createdAt, stepIndex) {
  const date = new Date(createdAt);
  date.setHours(date.getHours() + (STEP_OFFSET_HOURS[stepIndex] ?? 0));
  return date;
}

// Calcula em qual step o pedido está, dado o tempo real decorrido desde a
// compra. Retorna o último step cuja janela de tempo já foi atingida.
function progressIndexFromCreated(createdAt, now = new Date()) {
  const elapsedHours = (now.getTime() - createdAt.getTime()) / 3600000;
  let reached = 0;
  for (let i = 0; i < STEP_OFFSET_HOURS.length; i += 1) {
    if (elapsedHours >= STEP_OFFSET_HOURS[i]) reached = i;
  }
  return reached;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(date);
}

function getProgressIndex(seed) {
  const roll = seed % 100;
  if (roll < 10) return 1;
  if (roll < 28) return 2;
  if (roll < 56) return 3;
  if (roll < 76) return 4;
  if (roll < 88) return 5;
  if (roll < 96) return 6;
  if (roll < 99) return 7;
  return LAST_STEP_INDEX;
}

function clampProgressIndex(value) {
  return Math.max(0, Math.min(LAST_STEP_INDEX, value));
}

function getProgressIndexFromSteps(steps) {
  if (!Array.isArray(steps)) return 0;
  const currentIndex = steps.findIndex((step) => step.state === "current");
  if (currentIndex >= 0) return clampProgressIndex(currentIndex);
  const lastCompleteIndex = steps.reduce((lastIndex, step, index) => {
    return step.state === "complete" ? index : lastIndex;
  }, -1);
  return clampProgressIndex(lastCompleteIndex >= 0 ? lastCompleteIndex : 0);
}

function getResultProgressIndex(result) {
  if (Number.isFinite(result.progressIndex)) {
    return clampProgressIndex(result.progressIndex);
  }
  return getProgressIndexFromSteps(result.steps);
}

function shouldShowTimelineStep(index, currentProgressIndex) {
  if (HIDDEN_UNTIL_CURRENT_STEP_INDEXES.includes(index)) {
    return currentProgressIndex >= index;
  }
  if (index === SECOND_DELIVERY_ATTEMPT_STEP_INDEX) {
    return currentProgressIndex >= RETURNING_TO_BASE_STEP_INDEX;
  }
  return true;
}

function buildTrackingResult(code, progressIndex, createdAt) {
  const carrierId = detectCarrier(code);
  const seed = hashCode(code);
  const useRealSchedule = Boolean(createdAt);

  let currentIndex;
  if (useRealSchedule && createdAt) {
    currentIndex = clampProgressIndex(progressIndex ?? progressIndexFromCreated(createdAt));
  } else {
    const defaultProgressIndex = code.startsWith("CB") ? 0 : getProgressIndex(seed);
    currentIndex = clampProgressIndex(progressIndex ?? defaultProgressIndex);
  }

  const isDelivered = currentIndex >= LAST_STEP_INDEX;
  const origin = hubs[seed % hubs.length];
  const transferHub = hubs[(seed + 2) % hubs.length];

  // baseDate: usado só pela trilha "sintética" (sem createdAt) pra manter
  // o comportamento legado. Quando temos createdAt, ignorado.
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - currentIndex - 1);

  const dateForStep = (index) =>
    useRealSchedule && createdAt
      ? stepDateFromCreated(createdAt, index)
      : dateAt(baseDate, index, seed);

  const deliveryDate = dateForStep(LAST_STEP_INDEX);
  const updatedDate = dateForStep(currentIndex);

  const locations = [
    "Pedido online",
    `Centro de preparo - ${origin}`,
    `Unidade de postagem - ${origin}`,
    `Unidade de tratamento - ${transferHub}`,
    "Rota de entrega local",
    "Endereço informado no checkout",
    "Base de distribuição local",
    "Rota de entrega local",
    "Endereço informado no checkout",
  ];

  const steps = statusTitles.map((title, index) => {
    const isComplete = index < currentIndex || (isDelivered && index === LAST_STEP_INDEX);
    const isCurrent = !isDelivered && index === currentIndex;
    const state = isCurrent ? "current" : isComplete ? "complete" : "pending";

    return {
      title,
      description: stepDescriptions[index],
      date:
        isComplete || isCurrent
          ? formatDateTime(dateForStep(index))
          : index === currentIndex + 1
            ? `Previsto para ${formatDate(dateForStep(index))}`
            : "Aguardando",
      location: locations[index],
      state,
    };
  });

  return {
    code,
    displayCode: formatDisplayCode(code, carrierId),
    carrierId,
    carrierName: carrierLabels[carrierId],
    progressIndex: currentIndex,
    currentStatus: statusTitles[currentIndex],
    statusDetail: stepDescriptions[currentIndex],
    eta:
      currentIndex >= LAST_STEP_INDEX
        ? `Entregue em ${formatDate(deliveryDate)}`
        : `Previsto até ${formatDate(deliveryDate)}`,
    origin,
    destination: "Endereço informado no checkout",
    updatedAt: formatDateTime(updatedDate),
    consultedAt: new Date().toISOString(),
    steps,
  };
}

function readRecentResults() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const code = normalizeCode(item?.code ?? "");
        if (code.length < 6) return null;
        const progressIndex = Number.isFinite(item?.progressIndex)
          ? Number(item.progressIndex)
          : getProgressIndexFromSteps(item?.steps);
        return buildTrackingResult(code, progressIndex);
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Lê o pedido gravado pelo checkout (nome, endereço, savedAt) — deixa o
// rastreio "personalizado" pro cliente sem depender de backend.
function readOrderLookup(code) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ORDER_LOOKUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const normalizedCode = normalizeCode(code);
    const order = parsed.find((item) => normalizeCode(item?.code ?? "") === normalizedCode);
    if (!order?.name) return null;
    return {
      code: String(order.code ?? code),
      name: String(order.name),
      email: String(order.email ?? ""),
      phone: order.phone ? String(order.phone) : undefined,
      destinationAddress: order.destinationAddress ? String(order.destinationAddress) : undefined,
      address:
        order.address && typeof order.address === "object"
          ? {
              cep: order.address.cep ? String(order.address.cep) : undefined,
              street: order.address.street ? String(order.address.street) : undefined,
              number: order.address.number ? String(order.address.number) : undefined,
              complement: order.address.complement ? String(order.address.complement) : undefined,
              neighborhood: order.address.neighborhood ? String(order.address.neighborhood) : undefined,
              city: order.address.city ? String(order.address.city) : undefined,
              stateUF: order.address.stateUF ? String(order.address.stateUF) : undefined,
            }
          : undefined,
      savedAt: order.savedAt ? String(order.savedAt) : undefined,
    };
  } catch {
    return null;
  }
}

function saveRecentResults(results) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, MAX_RECENT)));
}

export default function TrackingSimulator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [orderLookup, setOrderLookup] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedResults = readRecentResults();
    const codeFromUrl = normalizeCode(
      new URLSearchParams(window.location.search).get("codigo") ?? ""
    );

    if (codeFromUrl.length >= 6) {
      const orderFromUrl = readOrderLookup(codeFromUrl);
      const createdAt = orderFromUrl?.savedAt ? new Date(orderFromUrl.savedAt) : undefined;
      const cachedResult = storedResults.find((item) => item.code === codeFromUrl);
      const nextResult = cachedResult ?? buildTrackingResult(codeFromUrl, undefined, createdAt);
      const nextResults = cachedResult
        ? storedResults
        : [
            nextResult,
            ...storedResults.filter((item) => item.code !== nextResult.code),
          ].slice(0, MAX_RECENT);

      setInput(codeFromUrl);
      setResult(nextResult);
      setOrderLookup(orderFromUrl);
      setNotice(cachedResult ? "Consulta recuperada deste navegador." : "Pedido carregado pelo código da compra.");
      setRecentResults(nextResults);
      saveRecentResults(nextResults);
      return;
    }

    setRecentResults(storedResults);
  }, []);

  const normalizedInput = useMemo(() => normalizeCode(input), [input]);
  const currentProgressIndex = result ? getResultProgressIndex(result) : 0;
  const trackingFinished = Boolean(result && currentProgressIndex >= LAST_STEP_INDEX);
  const visibleSteps = useMemo(() => {
    if (!result) return [];
    return result.steps
      .map((step, index) => ({ step, index }))
      .filter(({ index }) => shouldShowTimelineStep(index, currentProgressIndex));
  }, [currentProgressIndex, result]);

  const storeRecentResult = useCallback((nextResult) => {
    setRecentResults((currentResults) => {
      const nextResults = [
        nextResult,
        ...currentResults.filter((item) => item.code !== nextResult.code),
      ].slice(0, MAX_RECENT);
      saveRecentResults(nextResults);
      return nextResults;
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    const progressIndex = getResultProgressIndex(result);
    if (progressIndex >= LAST_STEP_INDEX) return;

    // Auto-atualização só vale pra pedidos reais (com savedAt). O status é
    // recalculado a partir do tempo decorrido — não há mais o "avança +1
    // a cada N segundos" que causava progresso irreal.
    const createdAtRaw = orderLookup?.savedAt;
    if (!createdAtRaw) return;
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) return;

    const tick = () => {
      const newIndex = progressIndexFromCreated(createdAt);
      if (newIndex === progressIndex) return;
      const nextResult = buildTrackingResult(result.code, newIndex, createdAt);
      setResult(nextResult);
      storeRecentResult(nextResult);
      setCopied(false);
      setNotice(
        nextResult.progressIndex >= LAST_STEP_INDEX
          ? "Pedido entregue."
          : `Atualização automática: ${nextResult.currentStatus}.`
      );
    };

    const timer = window.setInterval(tick, PROGRESS_UPDATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [result, orderLookup, storeRecentResult]);

  function handleSubmit(event) {
    event.preventDefault();
    setCopied(false);

    if (normalizedInput.length < 6) {
      setError("Informe um código de rastreio ou número de pedido válido.");
      setNotice("");
      return;
    }

    setError("");
    const matchedOrder = readOrderLookup(normalizedInput);

    if (result?.code === normalizedInput) {
      setOrderLookup(matchedOrder);
      setNotice("Essa consulta já está aberta neste navegador.");
      return;
    }

    const cachedResult = recentResults.find((item) => item.code === normalizedInput);
    if (cachedResult) {
      setResult(cachedResult);
      setOrderLookup(matchedOrder);
      setNotice("Consulta recuperada deste navegador.");
      return;
    }

    const createdAt = matchedOrder?.savedAt ? new Date(matchedOrder.savedAt) : undefined;
    const nextResult = buildTrackingResult(normalizedInput, undefined, createdAt);
    setResult(nextResult);
    setOrderLookup(matchedOrder);
    setNotice("");
    storeRecentResult(nextResult);
  }

  async function copyCode() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // navegador sem permissão de clipboard — sem alarde, deixa o botão como está.
    }
  }

  function openRecent(item) {
    setInput(item.code);
    setResult(item);
    setOrderLookup(readOrderLookup(item.code));
    setNotice("Consulta recente carregada.");
    setError("");
    setCopied(false);
  }

  function clearTrackingCodes() {
    window.localStorage.removeItem(STORAGE_KEY);
    setInput("");
    setResult(null);
    setRecentResults([]);
    setOrderLookup(null);
    setNotice("Códigos de rastreio limpos deste navegador.");
    setError("");
    setCopied(false);
  }

  return (
    <section className="tracking-simulator">
      <div className="tracking-grid">
        <div className="tracking-intro">
          <p className="tracking-kicker">Rastreio de pedido</p>
          <h1 className="tracking-title">Acompanhe seu pedido em tempo real</h1>
          <p className="tracking-lead">
            Consulte pelo código enviado no e-mail ou pelo número do pedido. As
            atualizações oficiais da transportadora continuam sendo enviadas
            pelos canais de atendimento.
          </p>

          <div className="tracking-highlights">
            <div className="tracking-highlight">
              <Truck className="tracking-highlight-ico" />
              <p className="tracking-highlight-title">Transportadoras</p>
              <p className="tracking-highlight-text">Correios, FedEx, DHL, UPS e pedidos Brinka.</p>
            </div>
            <div className="tracking-highlight">
              <PackageCheck className="tracking-highlight-ico" />
              <p className="tracking-highlight-title">Mesmo código</p>
              <p className="tracking-highlight-text">A consulta fica salva neste navegador.</p>
            </div>
          </div>
        </div>

        <div className="tracking-card">
          <form onSubmit={handleSubmit} className="tracking-form">
            <div className="tracking-field">
              <label htmlFor="tracking-code">Código de rastreio ou pedido</label>
              <input
                id="tracking-code"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ex: AN067003514DC"
                autoComplete="off"
              />
              {error && <p className="tracking-error">{error}</p>}
            </div>

            <button type="submit" className="tracking-primary-btn">
              <Search className="tracking-btn-ico" />
              Consultar
            </button>
          </form>

          <button
            type="button"
            onClick={clearTrackingCodes}
            className="tracking-secondary-btn"
          >
            <Trash2 className="tracking-btn-ico" />
            Limpar códigos
          </button>

          {notice && <div className="tracking-notice">{notice}</div>}

          <div className="tracking-result">
            {!result ? (
              <div className="tracking-empty">
                <PackageCheck className="tracking-empty-ico" />
                <p className="tracking-empty-title">Aguardando consulta</p>
                <p className="tracking-empty-text">
                  O status do envio aparece aqui depois da primeira consulta.
                </p>
              </div>
            ) : (
              <div className="tracking-details">
                <div className="tracking-summary">
                  <div className="tracking-summary-head">
                    <div>
                      <p className="tracking-kicker">{result.carrierName}</p>
                      {orderLookup?.name && (
                        <p className="tracking-order-name">
                          Pedido de <span>{orderLookup.name}</span>
                        </p>
                      )}
                      <div className="tracking-status-row">
                        <h2>{result.currentStatus}</h2>
                        <span className="tracking-badge">Atualizado</span>
                      </div>
                      <p className="tracking-status-text">{result.statusDetail}</p>
                      <p className="tracking-hint">
                        {trackingFinished
                          ? "Linha do tempo concluída"
                          : orderLookup?.savedAt
                            ? "Atualiza automaticamente a cada minuto"
                            : "Status atualizado na próxima consulta"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyCode}
                      className="tracking-copy-btn"
                      aria-label="Copiar código de rastreio"
                    >
                      <Copy className="tracking-btn-ico" />
                      {copied ? "Copiado" : result.displayCode}
                    </button>
                  </div>

                  <div className="tracking-info-grid">
                    <InfoBlock icon={<Clock3 className="tracking-info-ico" />} label="Previsão" value={result.eta} />
                    <InfoBlock icon={<MapPin className="tracking-info-ico" />} label="Origem" value={result.origin} />
                    <InfoBlock
                      icon={<Truck className="tracking-info-ico" />}
                      label="Destino"
                      value={orderLookup?.destinationAddress || result.destination}
                    />
                    <InfoBlock
                      icon={<CheckCircle2 className="tracking-info-ico" />}
                      label="Atualização"
                      value={result.updatedAt}
                    />
                  </div>
                </div>

                <div className="tracking-timeline">
                  <ol>
                    {visibleSteps.map(({ step, index }, visualIndex) => (
                      <li key={`${index}-${step.title}`} data-state={step.state}>
                        <div className="tracking-timeline-marker">
                          <span className="tracking-timeline-dot">
                            {step.state === "pending" ? (
                              <Clock3 className="tracking-info-ico" />
                            ) : (
                              <CheckCircle2 className="tracking-info-ico" />
                            )}
                          </span>
                          {visualIndex < visibleSteps.length - 1 && (
                            <span className="tracking-timeline-line" aria-hidden="true" />
                          )}
                        </div>

                        <div className="tracking-timeline-body">
                          <div className="tracking-timeline-heading">
                            <p className="tracking-timeline-title">{step.title}</p>
                            <p className="tracking-timeline-date">{step.date}</p>
                          </div>
                          <p className="tracking-timeline-text">
                            {index === 0 && orderLookup?.name
                              ? `Pagamento do pedido de ${orderLookup.name} aprovado no sistema da loja.`
                              : step.description}
                          </p>
                          <p className="tracking-timeline-place">{step.location}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          {recentResults.length > 0 && (
            <div className="tracking-recent">
              <p className="tracking-recent-kicker">Consultas recentes</p>
              <div className="tracking-recent-list">
                {recentResults.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => openRecent(item)}
                    className="tracking-recent-chip"
                  >
                    {item.displayCode}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="tracking-support">
            <div>
              <p className="tracking-support-title">Precisa de ajuda?</p>
              <p className="tracking-support-text">Envie o número do pedido para o atendimento.</p>
            </div>
            <a href="mailto:suportepedidos@brinkabrinquedos.shop" className="tracking-support-btn">
              <Mail className="tracking-btn-ico" />
              Atendimento
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({ icon, label, value }) {
  return (
    <div className="tracking-info-block">
      <div className="tracking-info-head">
        {icon}
        <span>{label}</span>
      </div>
      <p>{value}</p>
    </div>
  );
}
