import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

/**
 * Estrutura compartilhada das páginas institucionais:
 * hero escuro + sumário lateral + conteúdo.
 */
export default function LegalPage({ crumb, title, updated, updatedIcon, toc, intro, children }) {
  return (
    <>
      <SiteHeader />

      <div className="legal-hero">
        <div className="wrap">
          <nav className="crumb">
            <Link href="/">Início</Link>
            <span>/</span>
            {crumb}
          </nav>
          <h1>{title}</h1>
          <div className="updated">
            {updatedIcon}
            {" "}
            {updated}
          </div>
        </div>
      </div>

      <div className="wrap legal-wrap">
        <aside className="toc">
          <h4>{toc.heading || "Nesta página"}</h4>
          {toc.items.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </aside>

        <article className="legal-content">
          {intro && <p className="intro">{intro}</p>}
          {children}
        </article>
      </div>

      <SiteFooter />
    </>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
