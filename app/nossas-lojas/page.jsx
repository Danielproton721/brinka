import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Nossas Lojas | BRINKA Brinquedos",
  description: "Onde encontrar a BRINKA Brinquedos.",
};

export default function NossasLojas() {
  return (
    <LegalPage
      crumb="Nossas Lojas"
      title="Onde nos encontrar"
      updated="Loja online + suporte"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21c-5-5-7-8-7-11a7 7 0 0 1 14 0c0 3-2 6-7 11Z" />
        </svg>
      }
      toc={{
        items: [
          { href: "#online", label: "Loja online" },
          { href: "#fisica", label: "Central e logística" },
        ],
      }}
      intro={
        <>
          A BRINKA é uma loja <b>100% online</b>, com entrega para todo o Brasil e frete
          grátis. Nosso atendimento e a nossa central de distribuição funcionam nos
          endereços abaixo.
        </>
      }
    >
      <section id="online">
        <h2>
          <span className="num">01</span> Loja online
        </h2>
        <p>
          Compre 24h por dia com segurança em nosso site. Todos os pedidos contam com nota
          fiscal, garantia de 12 meses e suporte por e-mail e WhatsApp.
        </p>
        <div className="callout green">
          🛒{" "}
          <Link className="inline" href="/">
            Ver produtos disponíveis
          </Link>
        </div>
      </section>

      <section id="fisica">
        <h2>
          <span className="num">02</span> Central de atendimento e logística
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Unidade</th><th>Endereço</th></tr>
            <tr><td>Sede administrativa</td><td>Rua Exemplo, 000 — São Paulo/SP</td></tr>
            <tr><td>Centro de distribuição</td><td>Av. Exemplo Logística, 000 — São Paulo/SP</td></tr>
          </tbody>
        </table>
        <div className="callout">
          ⚠️ Endereços ilustrativos — substitua pelos endereços reais da sua empresa.
        </div>
      </section>
    </LegalPage>
  );
}
