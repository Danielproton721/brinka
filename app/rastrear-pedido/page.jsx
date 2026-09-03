import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { TrackForm } from "@/components/Forms";

export const metadata = {
  title: "Rastrear Pedido | BRINKA Brinquedos",
  description: "Acompanhe o status e a localização do seu pedido BRINKA.",
};

export default function RastrearPedido() {
  return (
    <LegalPage
      crumb="Rastrear Pedido"
      title="Rastrear meu pedido"
      updated="Acompanhe sua entrega"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h13v10H3zM16 10h4l1 3v4h-5" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="18" cy="18" r="1.6" />
        </svg>
      }
      toc={{
        items: [
          { href: "#buscar", label: "Buscar pedido" },
          { href: "#status", label: "Entenda os status" },
          { href: "#ajuda", label: "Precisa de ajuda?" },
        ],
      }}
      intro="Digite o código de rastreamento que enviamos por e-mail (ou o número do seu pedido) para ver a situação da entrega."
    >
      <section id="buscar">
        <h2>
          <span className="num">01</span> Buscar pedido
        </h2>
        <TrackForm />
        <div className="callout">
          Este é um rastreio ilustrativo. Em produção, integre com a API dos
          Correios/transportadora ou com sua plataforma de e-commerce.
        </div>
      </section>

      <section id="status">
        <h2>
          <span className="num">02</span> Entenda os status
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Status</th><th>O que significa</th></tr>
            <tr><td>Pagamento aprovado</td><td>Recebemos seu pagamento; o pedido entrou na fila de separação.</td></tr>
            <tr><td>Em preparação</td><td>Seu produto está sendo embalado.</td></tr>
            <tr><td>Postado</td><td>O pedido foi entregue à transportadora.</td></tr>
            <tr><td>Em trânsito</td><td>A caminho do seu endereço.</td></tr>
            <tr><td>Saiu para entrega</td><td>Chega hoje — fique atento.</td></tr>
            <tr><td>Entregue</td><td>Pedido recebido no destino.</td></tr>
          </tbody>
        </table>
      </section>

      <section id="ajuda">
        <h2>
          <span className="num">03</span> Precisa de ajuda?
        </h2>
        <p>
          Se o rastreio estiver parado há mais de 5 dias úteis, fale com a nossa{" "}
          <Link className="inline" href="/central-de-atendimento">
            Central de Atendimento
          </Link>{" "}
          que acionamos a transportadora para você.
        </p>
      </section>
    </LegalPage>
  );
}
