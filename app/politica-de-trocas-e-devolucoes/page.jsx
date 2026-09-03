import Link from "next/link";
import LegalPage, { ClockIcon } from "@/components/LegalPage";

export const metadata = {
  title: "Trocas e Devoluções | BRINKA Brinquedos",
  description:
    "Política de trocas, devoluções e direito de arrependimento da BRINKA Brinquedos, conforme o Código de Defesa do Consumidor.",
};

export default function PoliticaDeTrocas() {
  return (
    <LegalPage
      crumb="Trocas e Devoluções"
      title="Política de Trocas e Devoluções"
      updated="Última atualização: 19 de julho de 2026"
      updatedIcon={<ClockIcon />}
      toc={{
        items: [
          { href: "#arrependimento", label: "1. Direito de arrependimento" },
          { href: "#defeito", label: "2. Produto com defeito" },
          { href: "#como", label: "3. Como solicitar" },
          { href: "#condicoes", label: "4. Condições" },
          { href: "#reembolso", label: "5. Reembolso" },
          { href: "#prazos", label: "6. Resumo dos prazos" },
        ],
      }}
      intro={
        <>
          Sua satisfação é garantida. Esta política segue o{" "}
          <b>Código de Defesa do Consumidor (Lei nº 8.078/1990)</b> e descreve como
          solicitar troca, devolução ou reembolso do seu pedido.
        </>
      }
    >
      <section id="arrependimento">
        <h2>
          <span className="num">01</span> Direito de arrependimento (7 dias)
        </h2>
        <div className="callout green">
          Conforme o <b>art. 49 do CDC</b>, você pode desistir da compra em até{" "}
          <b>7 dias corridos</b> após o recebimento do produto, sem necessidade de
          justificativa, e receber o valor integral de volta — inclusive o frete.
        </div>
        <p>
          O produto deve ser devolvido em sua embalagem original, com todos os acessórios e
          sem sinais de uso.
        </p>
      </section>

      <section id="defeito">
        <h2>
          <span className="num">02</span> Produto com defeito ou avaria
        </h2>
        <p>
          Se o produto apresentar defeito de fabricação ou chegar avariado, você tem até{" "}
          <b>90 dias</b> (art. 26 do CDC, para bens duráveis) para reportar. Providenciaremos,
          conforme o caso, o reparo, a troca por um novo ou a devolução do valor.
        </p>
        <p>
          Recomendamos gravar um vídeo ao abrir a embalagem — isso agiliza a análise em caso
          de avaria no transporte.
        </p>
      </section>

      <section id="como">
        <h2>
          <span className="num">03</span> Como solicitar
        </h2>
        <ol>
          <li>
            Entre em contato pela{" "}
            <Link className="inline" href="/central-de-atendimento">
              Central de Atendimento
            </Link>{" "}
            informando o número do pedido e o motivo;
          </li>
          <li>Nossa equipe responderá em até 2 dias úteis com as instruções e o código de postagem;</li>
          <li>Poste o produto na agência dos Correios (o custo de devolução por arrependimento/defeito é por nossa conta);</li>
          <li>Após recebermos e conferirmos o produto, processamos a troca ou o reembolso.</li>
        </ol>
      </section>

      <section id="condicoes">
        <h2>
          <span className="num">04</span> Condições para aceitação
        </h2>
        <ul>
          <li>Produto na embalagem original, com manuais e acessórios (incluindo o brinde, quando houver);</li>
          <li>Sem sinais de uso além do necessário para a experimentação;</li>
          <li>Acompanhado da nota fiscal.</li>
        </ul>
      </section>

      <section id="reembolso">
        <h2>
          <span className="num">05</span> Reembolso
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Forma de pagamento</th><th>Prazo do estorno</th></tr>
            <tr><td>Pix</td><td>Até 5 dias úteis após a conferência</td></tr>
            <tr><td>Cartão de crédito</td><td>Em até 2 faturas, conforme a operadora</td></tr>
            <tr><td>Boleto</td><td>Depósito em conta em até 10 dias úteis</td></tr>
          </tbody>
        </table>
      </section>

      <section id="prazos">
        <h2>
          <span className="num">06</span> Resumo dos prazos
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Situação</th><th>Prazo</th><th>Custo do frete</th></tr>
            <tr><td>Arrependimento</td><td>7 dias corridos</td><td>Por conta da BRINKA</td></tr>
            <tr><td>Defeito / avaria</td><td>Até 90 dias</td><td>Por conta da BRINKA</td></tr>
            <tr><td>Troca por outra cor</td><td>7 dias corridos</td><td>A combinar</td></tr>
          </tbody>
        </table>
      </section>
    </LegalPage>
  );
}
