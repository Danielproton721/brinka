// Selos do checkout.
//
// Só entra aqui o que é VERIFICÁVEL sobre esta loja: o site tem HTTPS de fato, e
// o direito de arrependimento de 7 dias é lei (CDC art. 49) para toda compra
// online. Nada de RA1000, Reclame Aqui ou "Loja Protegida" — são certificação e
// serviço de terceiro, e exibir sem ter é marca alheia simulando reputação que
// a loja não tem.
//
// Desenho em SVG inline, sem arquivo em public/: a versão anterior apontava
// para /selos/*.png, que nunca existiu, e o checkout ficava com dois retângulos
// escuros vazios.

const CAIXA =
  "flex items-center gap-2.5 rounded-xl border border-[#e6e0d5] bg-white px-3 py-3"

function Cadeado() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-[#047857]"
      aria-hidden="true"
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <circle cx="12" cy="15.5" r="1.3" />
    </svg>
  )
}

function Escudo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-[#047857]"
      aria-hidden="true"
    >
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function ReputationSeals({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`}>
      <div className={CAIXA}>
        <Cadeado />
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold leading-tight text-[#171310]">
            Site seguro
          </div>
          <div className="text-[11px] leading-snug text-[#8b8378]">
            Conexão HTTPS — seus dados vão criptografados
          </div>
        </div>
      </div>

      <div className={CAIXA}>
        <Escudo />
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold leading-tight text-[#171310]">
            Compra garantida
          </div>
          <div className="text-[11px] leading-snug text-[#8b8378]">
            7 dias para desistir, garantidos pelo CDC
          </div>
        </div>
      </div>
    </div>
  )
}
