import Link from "next/link";
import Logo from "./Logo";
import { PaymentFlags } from "./store/payment-flags";

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="fcols">
          <div>
            <Logo variant="light" />
            <p>
              Brinquedo bom é o que a criança volta a pegar no dia seguinte. Cegonhas
              transformáveis, pistas e carrinhos de metal com garantia, frete grátis e
              suporte de verdade.
            </p>
            <PaymentFlags className="pays" />
          </div>
          <div className="fcol">
            <h4>Institucional</h4>
            <Link href="/sobre">Sobre a BRINKA</Link>
            <Link href="/nossas-lojas">Nossas lojas</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/trabalhe-conosco">Trabalhe conosco</Link>
          </div>
          <div className="fcol">
            <h4>Ajuda</h4>
            <Link href="/central-de-atendimento">Central de atendimento</Link>
            <Link href="/rastrear-pedido">Rastrear pedido</Link>
            <Link href="/politica-de-trocas-e-devolucoes">Trocas e devoluções</Link>
            <Link href="/politica-de-garantia">Garantia</Link>
            <Link href="/perguntas-frequentes">Perguntas frequentes</Link>
          </div>
          <div className="fcol">
            <h4>Receba as ofertas</h4>
            <p style={{ fontSize: 13 }}>Cupons e lançamentos no seu e-mail.</p>
            <div className="news">
              <input type="email" placeholder="seu@email.com" />
              <button type="button">Assinar</button>
            </div>
          </div>
        </div>
        <div className="legalrow">
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>
          <Link href="/termos-de-uso">Termos de Uso</Link>
          <Link href="/politica-de-entrega">Política de Entrega</Link>
          <Link href="/politica-de-trocas-e-devolucoes">Trocas e Devoluções</Link>
          <Link href="/politica-de-garantia">Garantia</Link>
        </div>
        <div className="fbottom">
          <div>© 2026 BRINKA Brinquedos Ltda · CNPJ 00.000.000/0001-00 · Todos os direitos reservados</div>
          <div className="seals">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
              </svg>
              Site Seguro SSL
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Compra Garantida
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
