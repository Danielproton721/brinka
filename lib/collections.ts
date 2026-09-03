// Coleções da loja BRINKA.
export interface Collection {
  slug: string;
  name: string;
  image: string;
  productCount: number;
  description: string;
}

export const collections: Collection[] = [
  {
    slug: "cegonhas-e-pistas",
    name: "Cegonhas e Pistas",
    image: "/fotos/pista/cegonha-dino.jpg",
    productCount: 1,
    description: "Caminhões cegonha transformáveis, pistas, canhões e carrinhos de metal",
  },
];
