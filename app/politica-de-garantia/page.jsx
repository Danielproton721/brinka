import Link from "next/link";
import LegalPage, { ClockIcon } from "@/components/LegalPage";

export const metadata = {
  title: "Política de Garantia | BRINKA Brinquedos",
  description: "Cobertura, prazos e acionamento da garantia dos produtos BRINKA Brinquedos.",
};

export default function PoliticaDeGarantia() {
  return (
    <LegalPage
      crumb="Política de Garantia"
      title="Política de Garantia"
      updated="Última atualização: 19 de julho de 2026"
      updatedIcon={<ClockIcon />}
      toc={{
        items: [
          { href: "#cobertura", label: "1. O que a garantia cobre" },
          { href: "#prazo", label: "2. Prazo de garantia" },
          { href: "#excludente", label: "3. O que não é coberto" },
          { href: "#acionar", label: "4. Como acionar" },
        ],
      }}
      intro={
        <>
          Todos os produtos BRINKA possuem <b>garantia de 12 meses</b> contra defeitos de
          fabricação, somada à garantia legal prevista no{" "}
          <b>Código de Defesa do Consumidor</b>.
        </>
      }
    >
      <section id="cobertura">
        <h2>
          <span className="num">01</span> O que a garantia cobre
        </h2>
        <ul>
          <li>Defeitos de fabricação em motor, controladora e painel;</li>
          <li>Falhas na bateria que não decorram de uso indevido;</li>
          <li>Problemas estruturais de solda e componentes originais.</li>
        </ul>
      </section>

      <section id="prazo">
        <h2>
          <span className="num">02</span> Prazo de garantia
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Cobertura</th><th>Prazo</th></tr>
            <tr><td>Garantia legal (CDC)</td><td>90 dias</td></tr>
            <tr><td>Garantia contratual BRINKA</td><td>12 meses</td></tr>
            <tr><td>Itens de desgaste (pneus, pastilhas)</td><td>3 meses</td></tr>
          </tbody>
        </table>
        <p>O prazo é contado a partir da data de recebimento indicada na nota fiscal.</p>
      </section>

      <section id="excludente">
        <h2>
          <span className="num">03</span> O que não é coberto
        </h2>
        <div className="callout">
          A garantia <b>não</b> cobre danos por mau uso, quedas, batidas, exposição à chuva
          além do especificado, sobrecarga acima de 120 kg, violação do lacre, reparos por
          terceiros não autorizados ou desgaste natural de itens consumíveis.
        </div>
      </section>

      <section id="acionar">
        <h2>
          <span className="num">04</span> Como acionar a garantia
        </h2>
        <ol>
          <li>
            Entre em contato com a{" "}
            <Link className="inline" href="/central-de-atendimento">
              Central de Atendimento
            </Link>{" "}
            com o número do pedido e a descrição (fotos/vídeo ajudam);
          </li>
          <li>
            Nossa equipe fará uma triagem e, se necessário, solicitará o envio do produto
            para análise técnica;
          </li>
          <li>
            Confirmado o defeito de fabricação, providenciamos o reparo, a troca do
            componente ou a substituição do produto, sem custo.
          </li>
        </ol>
      </section>
    </LegalPage>
  );
}
