import Script from "next/script";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { CartDrawer } from "@/components/store/cart-drawer";
import "./globals.css";

// Tag base do Google Ads. Sem a env definida, nada é carregado — mesma
// proteção usada no disparo da conversão em app/checkout/page.tsx: melhor
// não medir do que medir na conta de anúncio errada.
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "BRINKA Brinquedos",
  description:
    "Brinquedo bom é o que a criança volta a pegar no dia seguinte. Cegonhas transformáveis, pistas e carrinhos de metal com garantia, frete grátis e suporte de verdade.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        {GOOGLE_ADS_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-ads-base" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
            </Script>
          </>
        ) : null}
        {/* O carrinho envolve o site inteiro para que a página do produto e o
            checkout compartilhem o mesmo estado. O CartDrawer fica fora do
            fluxo (painel lateral), então não altera o layout das páginas. */}
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
