import LegalPage from "@/components/LegalPage";
import { CvForm } from "@/components/Forms";

export const metadata = {
  title: "Trabalhe Conosco | BRINKA Brinquedos",
  description: "Faça parte do time BRINKA Brinquedos.",
};

export default function TrabalheConosco() {
  return (
    <LegalPage
      crumb="Trabalhe Conosco"
      title="Venha pedalar (ou empurrar) com a gente"
      updated="Faça parte do time"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      }
      toc={{
        items: [
          { href: "#vagas", label: "Áreas" },
          { href: "#cv", label: "Enviar currículo" },
        ],
      }}
      intro="A BRINKA está sempre em busca de gente boa que ame tecnologia, atendimento e mobilidade. Não temos vaga aberta para a sua área? Deixe seu currículo — chamamos quando surgir."
    >
      <section id="vagas">
        <h2>
          <span className="num">01</span> Áreas que costumamos contratar
        </h2>
        <ul>
          <li>Atendimento e sucesso do cliente</li>
          <li>Logística e expedição</li>
          <li>Marketing e performance (tráfego pago)</li>
          <li>Tecnologia e e-commerce</li>
        </ul>
      </section>

      <section id="cv">
        <h2>
          <span className="num">02</span> Enviar currículo
        </h2>
        <CvForm />
        <div className="callout">
          ⚠️ E-mail e textos são placeholder — ajuste para os dados reais da sua empresa.
        </div>
      </section>
    </LegalPage>
  );
}
