import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Perguntas Frequentes | BRINKA Brinquedos",
  description:
    "Dúvidas frequentes sobre entrega, pagamento, garantia e uso dos brinquedos BRINKA.",
};

function Faq({ children, open }) {
  return (
    <details open={open}>
      <summary>
        {children[0]}
        <span className="plus" />
      </summary>
      <div className="ans">{children[1]}</div>
    </details>
  );
}

export default function PerguntasFrequentes() {
  return (
    <LegalPage
      crumb="Perguntas Frequentes"
      title="Perguntas Frequentes"
      updated="Tire suas dúvidas em segundos"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3 2.4c-.8.3-1 .8-1 1.6M12 17h.01" />
        </svg>
      }
      toc={{
        heading: "Categorias",
        items: [
          { href: "#pedidos", label: "Pedidos e pagamento" },
          { href: "#entrega", label: "Entrega" },
          { href: "#produto", label: "Produto e uso" },
          { href: "#pos", label: "Pós-venda" },
        ],
      }}
      intro={
        <>
          Reunimos as perguntas mais comuns dos nossos clientes. Não encontrou o que
          procurava? Fale com a{" "}
          <Link className="inline" href="/central-de-atendimento">
            Central de Atendimento
          </Link>
          .
        </>
      }
    >
      <section id="pedidos">
        <h2>
          <span className="num">01</span> Pedidos e pagamento
        </h2>
        <div className="faq">
          <Faq open>
            {["Quais formas de pagamento vocês aceitam?", "Aceitamos Pix (aprovação na hora), cartão de crédito em até 12x sem juros e boleto bancário."]}
          </Faq>
          <Faq>
            {["O pagamento é seguro?", "Sim. As transações são processadas em ambiente criptografado (SSL) por provedores de pagamento certificados. Não armazenamos os dados do seu cartão."]}
          </Faq>
          <Faq>
            {[
              "Posso cancelar meu pedido?",
              <>
                Sim, antes do envio o cancelamento é imediato. Após o envio, aplica-se a{" "}
                <Link className="inline" href="/politica-de-trocas-e-devolucoes">
                  política de trocas e devoluções
                </Link>
                .
              </>,
            ]}
          </Faq>
        </div>
      </section>

      <section id="entrega">
        <h2>
          <span className="num">02</span> Entrega
        </h2>
        <div className="faq">
          <Faq>
            {[
              "Qual o prazo de entrega?",
              <>
                De 3 a 14 dias úteis após a postagem, conforme a região. Veja os detalhes na{" "}
                <Link className="inline" href="/politica-de-entrega">
                  Política de Entrega
                </Link>
                .
              </>,
            ]}
          </Faq>
          <Faq>
            {["O frete é grátis mesmo?", "Sim, oferecemos frete grátis para todo o Brasil."]}
          </Faq>
          <Faq>
            {[
              "Como acompanho meu pedido?",
              <>
                Enviamos o código de rastreamento por e-mail. Você também pode acompanhar em{" "}
                <Link className="inline" href="/rastrear-pedido">
                  Rastrear Pedido
                </Link>
                .
              </>,
            ]}
          </Faq>
        </div>
      </section>

      <section id="produto">
        <h2>
          <span className="num">03</span> Produto e uso
        </h2>
        <div className="faq">
          <Faq>
            {["Para que idade é indicado?", "A partir de 3 anos. Os 6 carrinhos que acompanham são peças pequenas de metal — e, na versão Canhão, as bolinhas também — então mantenha o brinquedo longe de crianças menores de 3 anos e supervisione o lançador."]}
          </Faq>
          <Faq>
            {["Qual a diferença entre a versão Pista e a versão Canhão?", "As duas engolem carrinhos pela boca do dinossauro e acompanham 6 carrinhos de metal. A versão Pista abre a carroceria numa pista de 157 cm, com corrida em duas raias para 2 jogadores. A versão Canhão troca a pista por um canhão lançador que dispara 6 bolinhas de futebol (inclusas) e também expulsa o carrinho, com armazenamento e escotilha retrátil dos dois lados. Você escolhe a versão na própria página do produto."]}
          </Faq>
          <Faq>
            {["Quanto mede a pista e o caminhão?", "Na versão Pista, a pista aberta chega a 157 cm; fechado, o caminhão tem 40 cm de comprimento, 18 cm de altura e 9 cm de largura, e guarda os 6 carrinhos dentro dos três andares. Cada carrinho de metal mede cerca de 7 x 3 x 3 cm."]}
          </Faq>
          <Faq>
            {["Precisa de pilha ou bateria?", "Não. Todas as funções são mecânicas — a mandíbula que engole o carrinho, a abertura da pista, os botões de largada e o canhão lançador funcionam sem pilha nenhuma."]}
          </Faq>
          <Faq>
            {["De que material é feito?", "Corpo em ABS ecológico, sem cheiro e sem rebarba; os 6 carrinhos são de liga metálica, não de plástico. Produto certificado pelo INMETRO."]}
          </Faq>
        </div>
      </section>

      <section id="pos">
        <h2>
          <span className="num">04</span> Pós-venda
        </h2>
        <div className="faq">
          <Faq>
            {[
              "Qual o prazo de garantia?",
              <>
                12 meses contra defeitos de fabricação. Detalhes na{" "}
                <Link className="inline" href="/politica-de-garantia">
                  Política de Garantia
                </Link>
                .
              </>,
            ]}
          </Faq>
          <Faq>
            {[
              "Como faço uma troca ou devolução?",
              <>
                Você tem 7 dias corridos para arrependimento. Basta abrir a solicitação na{" "}
                <Link className="inline" href="/central-de-atendimento">
                  Central de Atendimento
                </Link>
                . Veja a{" "}
                <Link className="inline" href="/politica-de-trocas-e-devolucoes">
                  política completa
                </Link>
                .
              </>,
            ]}
          </Faq>
        </div>
      </section>
    </LegalPage>
  );
}
