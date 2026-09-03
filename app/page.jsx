import ProductPage from "@/components/ProductPage";
import { products } from "@/lib/products";
import { applyOverlayOne } from "@/lib/catalog-runtime";

export const metadata = {
  title: "Caminhão Dinossauro Engole Carrinhos — Versão Pista ou Canhão | BRINKA",
  description:
    "Cegonha dinossauro que engole carrinhos pela boca, em duas versões. Pista: abre em 157cm com corrida de 2 jogadores. Canhão: dispara 6 bolinhas de futebol e expulsa o carrinho. As duas com 6 carrinhos de metal inclusos. Frete grátis para todo o Brasil.",
};

export default async function Home() {
  // Lê o catálogo já com o overlay do painel /admin aplicado, para que uma
  // edição de preço/nome no painel apareça aqui sem precisar de novo deploy.
  const product = (await applyOverlayOne(products[0])) ?? products[0];
  return <ProductPage product={product} />;
}
