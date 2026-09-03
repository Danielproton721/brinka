import Link from "next/link";
import Logo from "./Logo";

export default function SiteHeader() {
  return (
    <>
      <div className="announce">
        🦖 <b>FRETE GRÁTIS</b> para todo o Brasil <span className="sep">•</span>
        <span className="hide-sm">
          Parcele em <b>12x sem juros</b>
        </span>{" "}
        <span className="sep">•</span> Garantia de <b>12 meses</b>
      </div>
      <header>
        <div className="wrap nav">
          <Logo priority />
          <nav className="menu">
            <Link href="/">Início</Link>
            <Link href="/">Cegonhas</Link>
            <Link href="/">Pistas</Link>
            <Link href="/perguntas-frequentes">Ajuda</Link>
            <Link href="/central-de-atendimento">Contato</Link>
          </nav>
          <div className="spacer" />
          <div className="icons">
            <Link className="iconbtn" href="/" aria-label="Loja">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L22 8H6" />
                <circle cx="10" cy="21" r="1.4" />
                <circle cx="18" cy="21" r="1.4" />
              </svg>
            </Link>
            <button className="iconbtn burger" aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
