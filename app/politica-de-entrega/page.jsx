import Link from "next/link";
import LegalPage, { ClockIcon } from "@/components/LegalPage";

export const metadata = {
  title: "Política de Entrega | BRINKA Brinquedos",
  description: "Prazos, valores e condições de entrega da BRINKA Brinquedos.",
};

export default function PoliticaDeEntrega() {
  return (
    <LegalPage
      crumb="Política de Entrega"
      title="Política de Entrega"
      updated="Última atualização: 19 de julho de 2026"
      updatedIcon={<ClockIcon />}
      toc={{
        items: [
          { href: "#processamento", label: "1. Processamento" },
          { href: "#prazos", label: "2. Prazos e frete" },
          { href: "#rastreio", label: "3. Rastreamento" },
          { href: "#recebimento", label: "4. No recebimento" },
          { href: "#atraso", label: "5. Atrasos e ausência" },
        ],
      }}
      intro={
        <>
          Entregamos para <b>todo o Brasil</b> com <b>frete grátis</b>. Abaixo você
          encontra os prazos, o funcionamento do rastreamento e o que fazer no recebimento.
        </>
      }
    >
      <section id="processamento">
        <h2>
          <span className="num">01</span> Processamento do pedido
        </h2>
        <p>
          Após a confirmação do pagamento, o pedido é separado e postado em até{" "}
          <b>2 dias úteis</b>. Pagamentos via Pix são aprovados na hora; cartão e boleto
          podem levar de algumas horas a 3 dias úteis para compensar.
        </p>
      </section>

      <section id="prazos">
        <h2>
          <span className="num">02</span> Prazos e valores de frete
        </h2>
        <p>O prazo é contado a partir da postagem e varia conforme a região:</p>
        <table className="legal-table">
          <tbody>
            <tr><th>Região</th><th>Prazo estimado</th><th>Frete</th></tr>
            <tr><td>Sudeste</td><td>3 a 6 dias úteis</td><td>Grátis</td></tr>
            <tr><td>Sul e Centro-Oeste</td><td>4 a 8 dias úteis</td><td>Grátis</td></tr>
            <tr><td>Nordeste</td><td>6 a 10 dias úteis</td><td>Grátis</td></tr>
            <tr><td>Norte</td><td>8 a 14 dias úteis</td><td>Grátis</td></tr>
          </tbody>
        </table>
        <div className="callout">
          Os prazos são estimativas fornecidas pela transportadora e podem variar em datas
          de alta demanda (Black Friday, feriados) ou em localidades de difícil acesso.
        </div>
      </section>

      <section id="rastreio">
        <h2>
          <span className="num">03</span> Rastreamento
        </h2>
        <p>
          Assim que o pedido for postado, você receberá o <b>código de rastreamento</b> por
          e-mail. Acompanhe o status na página{" "}
          <Link className="inline" href="/rastrear-pedido">
            Rastrear Pedido
          </Link>
          .
        </p>
      </section>

      <section id="recebimento">
        <h2>
          <span className="num">04</span> No recebimento
        </h2>
        <ul>
          <li>Confira a embalagem antes de assinar o comprovante;</li>
          <li>Em caso de volume violado ou danificado, recuse a entrega e registre a ocorrência;</li>
          <li>Recomendamos gravar um vídeo ao abrir o pacote para agilizar eventuais solicitações.</li>
        </ul>
      </section>

      <section id="atraso">
        <h2>
          <span className="num">05</span> Atrasos e ausência no endereço
        </h2>
        <p>
          Se ninguém estiver no local, a transportadora realiza novas tentativas. Após o
          limite de tentativas, o produto pode retornar ao remetente — nesse caso,
          entraremos em contato para reenvio. Havendo atraso relevante, fale com a nossa{" "}
          <Link className="inline" href="/central-de-atendimento">
            Central de Atendimento
          </Link>{" "}
          que acionamos a transportadora.
        </p>
      </section>
    </LegalPage>
  );
}
