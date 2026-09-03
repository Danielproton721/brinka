import Link from "next/link";
import LegalPage, { ClockIcon } from "@/components/LegalPage";

export const metadata = {
  title: "Política de Privacidade | BRINKA Brinquedos",
  description:
    "Como a BRINKA Brinquedos coleta, usa, armazena e protege seus dados pessoais, em conformidade com a LGPD.",
};

export default function PoliticaDePrivacidade() {
  return (
    <LegalPage
      crumb="Política de Privacidade"
      title="Política de Privacidade"
      updated="Última atualização: 19 de julho de 2026"
      updatedIcon={<ClockIcon />}
      toc={{
        items: [
          { href: "#quem", label: "1. Quem somos" },
          { href: "#dados", label: "2. Dados que coletamos" },
          { href: "#uso", label: "3. Como usamos" },
          { href: "#cookies", label: "4. Cookies e rastreamento" },
          { href: "#compart", label: "5. Compartilhamento" },
          { href: "#direitos", label: "6. Seus direitos (LGPD)" },
          { href: "#seg", label: "7. Segurança" },
          { href: "#contato", label: "8. Encarregado (DPO)" },
        ],
      }}
      intro={
        <>
          A sua privacidade é prioridade para a <b>BRINKA Brinquedos Ltda</b>. Esta política
          explica, de forma transparente, quais dados pessoais coletamos, por que coletamos,
          como os utilizamos e quais são os seus direitos, em conformidade com a{" "}
          <b>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD)</b>.
        </>
      }
    >
      <section id="quem">
        <h2>
          <span className="num">01</span> Quem somos
        </h2>
        <p>
          Este site é operado pela BRINKA Brinquedos Ltda, inscrita no CNPJ nº
          00.000.000/0001-00, com sede na Rua Exemplo, 000, São Paulo/SP, CEP 00000-000.
          Somos os controladores dos dados pessoais tratados neste site.
        </p>
      </section>

      <section id="dados">
        <h2>
          <span className="num">02</span> Dados que coletamos
        </h2>
        <p>Coletamos apenas os dados necessários para operar a loja e concluir seu pedido:</p>
        <ul>
          <li><b>Dados de identificação e contato:</b> nome, CPF, e-mail, telefone.</li>
          <li><b>Dados de entrega e cobrança:</b> endereço completo e CEP.</li>
          <li><b>Dados de pagamento:</b> processados diretamente pelo provedor de pagamento; <b>não armazenamos</b> os dados completos do seu cartão.</li>
          <li><b>Dados de navegação:</b> endereço IP, tipo de dispositivo, navegador, páginas visitadas e origem de acesso, coletados via cookies e pixels.</li>
        </ul>
      </section>

      <section id="uso">
        <h2>
          <span className="num">03</span> Como usamos os seus dados
        </h2>
        <ul>
          <li>Processar, faturar e entregar seus pedidos;</li>
          <li>Prestar atendimento e suporte pós-venda;</li>
          <li>Prevenir fraudes e garantir a segurança das transações;</li>
          <li>Cumprir obrigações legais e fiscais;</li>
          <li>Com o seu consentimento, enviar ofertas e novidades por e-mail ou mensagem, e personalizar anúncios.</li>
        </ul>
      </section>

      <section id="cookies">
        <h2>
          <span className="num">04</span> Cookies e tecnologias de rastreamento
        </h2>
        <p>
          Utilizamos cookies e pixels para lembrar suas preferências, medir o desempenho da
          loja e exibir anúncios relevantes. Isso inclui ferramentas de terceiros como{" "}
          <b>Google Analytics</b> e <b>Google Ads</b>, que podem usar cookies para mensurar
          campanhas e remarketing.
        </p>
        <div className="callout">
          Você pode gerenciar ou desativar cookies a qualquer momento nas configurações do
          seu navegador. Para anúncios do Google, consulte{" "}
          <a className="inline" href="https://adssettings.google.com" target="_blank" rel="noopener">
            Configurações de anúncios do Google
          </a>{" "}
          e a{" "}
          <a className="inline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">
            política de parceiros do Google
          </a>
          .
        </div>
      </section>

      <section id="compart">
        <h2>
          <span className="num">05</span> Com quem compartilhamos
        </h2>
        <p>Não vendemos seus dados. Compartilhamos apenas o necessário com:</p>
        <ul>
          <li><b>Transportadoras e Correios</b>, para entregar seu pedido;</li>
          <li><b>Provedores de pagamento</b>, para processar a transação;</li>
          <li><b>Plataformas de tecnologia e marketing</b> (ex.: Google), para hospedagem, análise e publicidade;</li>
          <li><b>Autoridades públicas</b>, quando exigido por lei ou ordem judicial.</li>
        </ul>
      </section>

      <section id="direitos">
        <h2>
          <span className="num">06</span> Seus direitos como titular
        </h2>
        <p>Nos termos da LGPD, você pode a qualquer momento:</p>
        <ul>
          <li>Confirmar a existência de tratamento e acessar seus dados;</li>
          <li>Corrigir dados incompletos ou desatualizados;</li>
          <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Revogar o consentimento e solicitar a exclusão dos dados tratados com base nele;</li>
          <li>Solicitar a portabilidade dos dados.</li>
        </ul>
        <p>
          Para exercer seus direitos, entre em contato pelo e-mail abaixo. Responderemos em
          até 15 dias.
        </p>
      </section>

      <section id="seg">
        <h2>
          <span className="num">07</span> Segurança e retenção
        </h2>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
          não autorizado, perda ou vazamento, incluindo criptografia SSL/TLS. Mantemos os
          dados apenas pelo tempo necessário para as finalidades descritas ou para cumprir
          obrigações legais.
        </p>
      </section>

      <section id="contato">
        <h2>
          <span className="num">08</span> Encarregado de dados (DPO) e contato
        </h2>
        <p>
          Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser
          enviadas ao nosso Encarregado de Proteção de Dados:
        </p>
        <div className="callout green">
          <b>E-mail:</b> privacidade@brinkabrinquedos.com.br &nbsp;·&nbsp;{" "}
          <b>Atendimento:</b>{" "}
          <Link className="inline" href="/central-de-atendimento">
            Central de Atendimento
          </Link>
        </div>
        <p>
          Esta política pode ser atualizada periodicamente. A data da última revisão está
          indicada no topo desta página.
        </p>
      </section>
    </LegalPage>
  );
}
