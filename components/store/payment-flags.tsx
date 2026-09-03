// Bandeiras aceitas — usadas no rodapé do site e no resumo do checkout.
//
// Os SVGs ficam em public/bandeiras/. Antes o checkout apontava direto para
// icons.yampi.me: nove requisições a um domínio de terceiro no meio do fluxo de
// pagamento, que quebram a página se o CDN cair e ainda vazam a visita. Agora
// saem do próprio domínio.
//
// Cada arquivo já vem com o cartãozinho branco de fundo, então funciona tanto no
// rodapé escuro quanto no checkout claro sem tratamento extra.
const BANDEIRAS = [
  { slug: "pix", nome: "Pix" },
  { slug: "visa", nome: "Visa" },
  { slug: "mastercard", nome: "Mastercard" },
  { slug: "elo", nome: "Elo" },
  { slug: "amex", nome: "American Express" },
  { slug: "hiper", nome: "Hipercard" },
  { slug: "diners", nome: "Diners Club" },
  { slug: "discover", nome: "Discover" },
  { slug: "aura", nome: "Aura" },
] as const

export function PaymentFlags({ className = "" }: { className?: string }) {
  return (
    <div className={`pay-flags ${className}`.trim()}>
      {BANDEIRAS.map((b) => (
        <img
          key={b.slug}
          src={`/bandeiras/${b.slug}.svg`}
          alt={b.nome}
          width={34}
          height={23}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  )
}
