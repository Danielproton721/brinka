import Link from "next/link";
import LegalPage, { ClockIcon } from "@/components/LegalPage";

export const metadata = {
  title: "Termos de Uso | BRINKA Brinquedos",
  description: "Termos e condições de uso da loja BRINKA Brinquedos.",
};

export default function TermosDeUso() {
  return (
    <LegalPage
      crumb="Termos de Uso"
      title="Termos e Condições de Uso"
      updated="Última atualização: 19 de julho de 2026"
      updatedIcon={<ClockIcon />}
      toc={{
        items: [
          { href: "#aceite", label: "1. Aceitação" },
          { href: "#cadastro", label: "2. Cadastro" },
          { href: "#produtos", label: "3. Produtos e preços" },
          { href: "#pedido", label: "4. Pedidos e pagamento" },
          { href: "#propriedade", label: "5. Propriedade intelectual" },
          { href: "#responsa", label: "6. Responsabilidades" },
          { href: "#foro", label: "7. Legislação e foro" },
        ],
      }}
      intro={
        <>
          Ao acessar e utilizar o site da <b>BRINKA Brinquedos Ltda</b> e realizar compras,
          você concorda com os termos e condições descritos abaixo. Leia com atenção antes
          de finalizar seu pedido.
        </>
      }
    >
      <section id="aceite">
        <h2>
          <span className="num">01</span> Aceitação dos termos
        </h2>
        <p>
          O uso deste site implica na aceitação integral destes Termos de Uso e da nossa{" "}
          <Link className="inline" href="/politica-de-privacidade">
            Política de Privacidade
          </Link>
          . Caso não concorde com qualquer condição, recomendamos que não utilize o site.
        </p>
      </section>

      <section id="cadastro">
        <h2>
          <span className="num">02</span> Cadastro e informações
        </h2>
        <p>
          Para concluir uma compra, o cliente deve fornecer informações verdadeiras,
          completas e atualizadas. O cliente é responsável pela veracidade dos dados
          informados e pela guarda de eventuais senhas de acesso.
        </p>
      </section>

      <section id="produtos">
        <h2>
          <span className="num">03</span> Produtos, preços e disponibilidade
        </h2>
        <ul>
          <li>Nos empenhamos para exibir descrições, imagens e preços corretos. Podem ocorrer erros de digitação ou de sistema; nesses casos, a BRINKA reserva-se o direito de corrigir a informação ou cancelar o pedido, comunicando o cliente e restituindo eventuais valores.</li>
          <li>As imagens são ilustrativas e podem apresentar pequenas variações em relação ao produto físico.</li>
          <li>Preços e promoções são válidos apenas para compras realizadas neste site e podem ser alterados sem aviso prévio, respeitando os pedidos já confirmados.</li>
        </ul>
      </section>

      <section id="pedido">
        <h2>
          <span className="num">04</span> Pedidos e pagamento
        </h2>
        <p>
          O pedido é confirmado após a aprovação do pagamento pela instituição financeira ou
          provedor responsável. A BRINKA pode recusar ou cancelar pedidos em casos de suspeita
          de fraude, indisponibilidade de estoque ou erro de informação.
        </p>
      </section>

      <section id="propriedade">
        <h2>
          <span className="num">05</span> Propriedade intelectual
        </h2>
        <p>
          Todo o conteúdo deste site — marca, logotipo, textos, imagens e layout — é de
          propriedade da BRINKA Brinquedos ou licenciado a ela, sendo protegido pela
          legislação de propriedade intelectual. É proibida a reprodução sem autorização.
        </p>
      </section>

      <section id="responsa">
        <h2>
          <span className="num">06</span> Responsabilidades e uso do produto
        </h2>
        <div className="callout">
          Os produtos vendidos são brinquedos e devem ser utilizados dentro da faixa etária
          indicada na embalagem e sob supervisão de um adulto responsável. Itens que
          acompanham peças pequenas — como os carrinhos de metal — devem ser mantidos longe
          de crianças menores de 3 anos, pelo risco de engasgo. A BRINKA não se
          responsabiliza por danos decorrentes de uso indevido, imprudência ou ausência de
          supervisão.
        </div>
      </section>

      <section id="foro">
        <h2>
          <span className="num">07</span> Legislação aplicável e foro
        </h2>
        <p>
          Estes termos são regidos pelas leis brasileiras, incluindo o{" "}
          <b>Código de Defesa do Consumidor (Lei nº 8.078/1990)</b>. Fica eleito o foro do
          domicílio do consumidor para dirimir eventuais controvérsias.
        </p>
        <p>
          Dúvidas? Fale com a nossa{" "}
          <Link className="inline" href="/central-de-atendimento">
            Central de Atendimento
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
