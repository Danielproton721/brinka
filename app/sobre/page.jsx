import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Sobre a BRINKA | BRINKA Brinquedos",
  description:
    "Conheça a BRINKA Brinquedos: nossa missão de levar brinquedo bom, seguro e acessível para a criançada.",
};

export default function Sobre() {
  return (
    <LegalPage
      crumb="Sobre a BRINKA"
      title="Tiramos a criançada da tela e botamos no chão da sala"
      updated="Nossa história"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3-5.6-3.2-5.6 3.2 1.3-6.3L2.9 9.1l6.4-.7L12 2.5Z" />
        </svg>
      }
      toc={{
        items: [
          { href: "#missao", label: "Nossa missão" },
          { href: "#valores", label: "Nossos valores" },
          { href: "#numeros", label: "Em números" },
        ],
      }}
      intro={
        <>
          A <b>BRINKA Brinquedos</b> nasceu para resolver um problema simples: brinquedo
          bom não deveria custar caro nem quebrar na primeira semana. Selecionamos e
          vendemos brinquedos que unem diversão, resistência e certificação — com preço
          justo e suporte de gente de verdade.
        </>
      }
    >
      <section id="missao">
        <h2>
          <span className="num">01</span> Nossa missão
        </h2>
        <p>
          Tornar o brinquedo bom acessível a todas as famílias brasileiras, oferecendo
          produtos confiáveis e certificados, garantia real e um atendimento que resolve.
          Acreditamos que a infância fica melhor quando a criança tem o que montar,
          desmontar e inventar com as próprias mãos.
        </p>
      </section>

      <section id="valores">
        <h2>
          <span className="num">02</span> Nossos valores
        </h2>
        <ul>
          <li><b>Transparência</b> — preço claro, sem letra miúda.</li>
          <li><b>Segurança</b> — produtos certificados pelo INMETRO, sem peça pequena solta.</li>
          <li><b>Suporte real</b> — atendimento humano antes e depois da compra.</li>
          <li><b>Brincadeira de verdade</b> — menos tela, mais chão de sala.</li>
        </ul>
      </section>

      <section id="numeros">
        <h2>
          <span className="num">03</span> A BRINKA em números
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Indicador</th><th>Valor</th></tr>
            <tr><td>Clientes atendidos</td><td>+30.000</td></tr>
            <tr><td>Avaliação média</td><td>4,9 / 5,0</td></tr>
            <tr><td>Estados atendidos</td><td>Todos (26 + DF)</td></tr>
            <tr><td>Garantia dos produtos</td><td>12 meses</td></tr>
          </tbody>
        </table>
        <div className="callout">
          ⚠️ Números e textos são ilustrativos — ajuste para a realidade da sua operação
          antes de publicar.
        </div>
      </section>
    </LegalPage>
  );
}
