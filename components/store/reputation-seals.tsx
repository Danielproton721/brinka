// Selos de reputação REAIS da loja em caixas ESCURAS (fundo do rodapé é escuro).
// Caixa 1: Loja Protegida. Caixa 2: selo RA1000 (esquerda) + logo Reclame Aqui
// (direita), juntos. object-contain + w-auto garantem que nada estica/deforma.
const BOX = "flex items-center justify-center rounded-xl border border-white/10 bg-[#232323] px-3 py-4"

export function ReputationSeals({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <div className={BOX}>
        <img
          src="/selos/loja-protegida.png"
          alt="Loja Protegida — Compra 100% Segura"
          width={276}
          height={60}
          className="h-auto max-h-8 w-auto max-w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className={`${BOX} gap-2.5`}>
        <img
          src="/selos/ra1000.png"
          alt="Selo RA1000 — melhor reputação no Reclame Aqui"
          width={40}
          height={40}
          className="h-11 w-auto shrink-0 object-contain"
          loading="lazy"
        />
        <img
          src="/selos/reclame-aqui.png"
          alt="Reclame Aqui"
          width={257}
          height={41}
          className="h-auto max-h-6 w-auto max-w-full object-contain"
          loading="lazy"
        />
      </div>
    </div>
  )
}
