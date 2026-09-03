import LegalPage from "@/components/LegalPage";
import { ContactForm } from "@/components/Forms";

export const metadata = {
  title: "Central de Atendimento | BRINKA Brinquedos",
  description: "Fale com a BRINKA Brinquedos: e-mail, WhatsApp, telefone, horários e endereço.",
};

export default function CentralDeAtendimento() {
  return (
    <LegalPage
      crumb="Central de Atendimento"
      title="Central de Atendimento"
      updated="Estamos aqui para ajudar"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16v12H8l-4 4z" />
        </svg>
      }
      toc={{
        items: [
          { href: "#canais", label: "Canais de contato" },
          { href: "#horario", label: "Horário de atendimento" },
          { href: "#empresa", label: "Dados da empresa" },
          { href: "#msg", label: "Enviar mensagem" },
        ],
      }}
      intro="Precisa de ajuda com um pedido, troca, garantia ou dúvida sobre um produto? Escolha o canal que preferir — respondemos rápido."
    >
      <section id="canais">
        <h2>
          <span className="num">01</span> Canais de contato
        </h2>
        <div className="contact-grid">
          <div className="cc">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 5h18v14H3z" />
                <path d="m3 6 9 7 9-7" />
              </svg>
            </div>
            <h3>E-mail</h3>
            <p>
              <a href="mailto:contato@brinkabrinquedos.com.br">contato@brinkabrinquedos.com.br</a>
            </p>
          </div>
          <div className="cc">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 15.5a9 9 0 1 1-4.5-4.5" />
                <path d="M21 3l-6 6" />
              </svg>
            </div>
            <h3>WhatsApp</h3>
            <p>
              <a href="#">(11) 90000-0000</a>
            </p>
          </div>
          <div className="cc">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
              </svg>
            </div>
            <h3>Telefone / SAC</h3>
            <p>
              <a href="tel:+551130000000">(11) 3000-0000</a>
            </p>
          </div>
        </div>
      </section>

      <section id="horario">
        <h2>
          <span className="num">02</span> Horário de atendimento
        </h2>
        <table className="legal-table">
          <tbody>
            <tr><th>Dia</th><th>Horário</th></tr>
            <tr><td>Segunda a sexta</td><td>09h às 18h</td></tr>
            <tr><td>Sábado</td><td>09h às 13h</td></tr>
            <tr><td>Domingos e feriados</td><td>Fechado (respondemos por e-mail)</td></tr>
          </tbody>
        </table>
        <div className="callout green">
          Tempo médio de resposta: <b>até 24 horas úteis</b> por e-mail e WhatsApp.
        </div>
      </section>

      <section id="empresa">
        <h2>
          <span className="num">03</span> Dados da empresa
        </h2>
        <p>
          <b>BRINKA Brinquedos Ltda</b>
          <br />
          CNPJ: 00.000.000/0001-00
          <br />
          Endereço: Rua Exemplo, 000 — Bairro, São Paulo/SP, CEP 00000-000
        </p>
        <div className="callout">
          ⚠️ Placeholder: substitua razão social, CNPJ, e-mail, telefone e endereço pelos
          dados reais da sua empresa. O Google Ads exige informações de contato
          verdadeiras e verificáveis para aprovar a loja.
        </div>
      </section>

      <section id="msg">
        <h2>
          <span className="num">04</span> Envie uma mensagem
        </h2>
        <ContactForm />
      </section>
    </LegalPage>
  );
}
