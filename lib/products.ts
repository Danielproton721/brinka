// Catálogo da loja BRINKA.
//
// Este arquivo é a FONTE do catálogo. O painel /admin (aba Produtos) lê estes
// dados, grava as edições num overlay na KV e consegue regenerar este arquivo
// pelo botão "Exportar products.ts" (ver lib/catalog.ts). O export serializa o
// objeto inteiro, então o `content` de cada variante sobrevive ao round-trip
// mesmo sem aparecer no editor.
import { collections, type Collection } from "./collections";
export { collections } from "./collections";
export type { Collection } from "./collections";

/** Banner da seção "Sobre o produto". */
export interface DescShot {
  src: string;
  alt: string;
}

/** Um número da faixa de destaque logo abaixo da compra. */
export interface Spec {
  /** Número grande. */
  n: string;
  /** Sufixo menor, colado no número ("cm", "em 1", "+ anos"). */
  unit: string;
  /** Legenda embaixo. */
  k: string;
}

export interface Feature {
  title: string;
  body: string;
}

// Tudo que muda quando o cliente troca de versão. Cada versão é um brinquedo
// diferente — a de pista não tem canhão, a de canhão não abre em pista — então
// galeria, banners, números e texto andam juntos com a variante, nunca soltos
// na página. Trocar a versão troca o bloco inteiro.
//
// Nos textos, `**assim**` vira negrito (ver `rich()` em components/ProductPage).
export interface VariantContent {
  /** Galeria própria. As fotos de uma versão nunca aparecem na outra. */
  images: string[];
  /** Legenda de cada foto, na mesma ordem de `images`. */
  alts: string[];
  descShots: DescShot[];
  specs: Spec[];
  /** Título da seção "Sobre o produto". */
  headline: string;
  /** Parágrafos de abertura. */
  intro: string[];
  features: Feature[];
  highlights: string[];
  gift: { image: string; title: string; text: string; tag: string };
  /** Frase curta do seletor de versão, embaixo do nome. */
  tagline: string;
}

// Variante = a versão do brinquedo. Cada uma tem o próprio id, porque o checkout
// identifica o item vendido por esse id (ver app/api/checkout/session/route.ts).
export interface ProductVariant {
  id: number;
  label: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  available?: boolean;
  /** Cor do chip exibido no seletor da página do produto. */
  swatch?: string;
  content?: VariantContent;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  category: string;
  slug: string;
  description: string;
  isTest?: boolean;
  tags?: string[];
  variants?: ProductVariant[];
}

const PISTA: VariantContent = {
  images: [
    "/fotos/pista/cegonha-dino.jpg",
    "/fotos/pista/cegonha-aberta.jpg",
    "/fotos/pista/brincando.jpg",
    "/fotos/pista/transformacao.jpg",
    "/fotos/pista/corrida.jpg",
    "/fotos/pista/tamanho.jpg",
    "/fotos/pista/medidas.jpg",
  ],
  alts: [
    "Cegonha dinossauro fechada com os 6 carrinhos de metal",
    "Carroceria aberta em três andares com a rampa de lançamento",
    "Criança brincando com a pista de 157cm montada",
    "Em pé, o caminhão revela o dinossauro; deitado, vira pista dupla",
    "Modo de corrida para dois jogadores",
    "Caminhão fechado: 40cm de comprimento por 18cm de altura",
    "Medidas da caixa, do caminhão, da pista e dos carrinhos",
  ],
  descShots: [
    { src: "/fotos-descricao/pista/01-3em1.webp", alt: "Caminhão que vira dinossauro, engole o carrinho e guarda tudo dentro" },
    { src: "/fotos-descricao/pista/02-transformacao.webp", alt: "A carroceria abre e vira pista dupla; em pé, revela o dinossauro" },
    { src: "/fotos-descricao/pista/03-corrida.webp", alt: "Modo de corrida para 2 jogadores: aperta o botão e o primeiro carro a chegar vence" },
    { src: "/fotos-descricao/pista/04-engole.webp", alt: "Passo a passo da função que engole o carrinho e devolve pela traseira" },
  ],
  specs: [
    { n: "4", unit: "em 1", k: "Modos de brincar" },
    { n: "157", unit: "cm", k: "Pista aberta" },
    { n: "6", unit: "un", k: "Carrinhos de metal" },
    { n: "3", unit: "+ anos", k: "Idade indicada" },
  ],
  headline: "Um caminhão que vira dinossauro, pista e lançador",
  tagline: "Abre em pista de 157cm · 6 carrinhos",
  intro: [
    "A **versão Pista** é uma cegonha de brinquedo que não faz só uma coisa. Fechada, é um caminhão transportador com três andares e os **6 carrinhos de metal** guardados dentro. Deitada, a carroceria abre e se estende numa **pista de 157cm**. Em pé, a cabine se transforma no dinossauro. E a boca do dino **engole o carrinho** e devolve pela porta traseira.",
    "É esse acúmulo de funções que segura a criança: quando cansa de uma brincadeira, o mesmo brinquedo já virou outra coisa. E, na hora de guardar, a pista dobra de volta e tudo cabe dentro do próprio caminhão — **40cm** fechado, sem peça solta espalhada pela casa.",
  ],
  features: [
    {
      title: "🦖 A função que engole o carrinho",
      body: "Coloque o carrinho na frente do dinossauro e empurre: a mandíbula abre, engole o carrinho e ele sai pela porta traseira em alta velocidade. É o truque que fez o brinquedo viralizar — e o primeiro que toda criança quer repetir dez vezes seguidas.",
    },
    {
      title: "🏁 Corrida em pista dupla, para dois",
      body: "A pista abre em duas raias paralelas. Cada criança posiciona o seu carrinho, aperta o botão de largada ao mesmo tempo e o primeiro a cruzar a linha vence. Dá para brincar sozinho, mas é no modo dois jogadores que ele rende tarde inteira.",
    },
    {
      title: "🧱 Material que aguenta o uso",
      body: "Corpo em **ABS ecológico** — sem cheiro, sem rebarba, com encaixes que abrem e fecham sem forçar. Os 6 carrinhos são de **liga metálica**, não de plástico: pesam na mão e não lascam na primeira queda. Produto **certificado pelo INMETRO**, indicado a partir de **3 anos**.",
    },
  ],
  highlights: [
    "**4 em 1**: caminhão, dinossauro, pista e lançador",
    "Pista que abre até **157cm** em segundos",
    "Função que **engole o carrinho** e devolve pela traseira",
    "Modo de **corrida em pista dupla** para 2 jogadores",
    "**6 carrinhos de metal** de 7cm inclusos",
    "Guarda tudo dentro e fecha em **40cm**",
    "**ABS ecológico** + liga metálica",
    "Sem peças pequenas soltas",
    "Certificado pelo **INMETRO** — a partir de **3 anos**",
  ],
  gift: {
    image: "/fotos/pista/carrinhos.jpg",
    title: "🎁 6 carrinhos de metal inclusos",
    text: "Carrinhos de liga metálica de 7cm — já vêm na caixa, sem custo extra",
    tag: "Incluso",
  },
};

const CANHAO: VariantContent = {
  images: [
    "/fotos/canhao/canhao-dino.jpg",
    "/fotos/canhao/kit-completo.jpg",
    "/fotos/canhao/brincando.jpg",
    "/fotos/canhao/lancador.jpg",
    "/fotos/canhao/escotilha.jpg",
    "/fotos/canhao/armazenamento.jpg",
  ],
  alts: [
    "Caminhão dinossauro com canhão lançador e as bolinhas de futebol",
    "Kit completo: caixa, caminhão e os carrinhos de metal",
    "Criança disparando uma bolinha com o canhão",
    "O canhão também expulsa o carrinho em alta velocidade",
    "Escotilha retrátil dos dois lados do caminhão",
    "Compartimento de armazenamento com bandeja deslizante",
  ],
  descShots: [
    { src: "/fotos-descricao/canhao/01-formas-de-brincar.webp", alt: "Três formas de brincar: engolir carrinhos, disparar bolas de futebol e lançar carrinhos" },
    { src: "/fotos-descricao/canhao/02-vantagens.webp", alt: "Vantagens do produto: expulsão e remate, escotilha retrátil e armazenamento" },
    { src: "/fotos-descricao/canhao/03-ambiente.webp", alt: "O caminhão dinossauro com canhão montado no tapete da sala" },
  ],
  specs: [
    { n: "3", unit: "em 1", k: "Modos de brincar" },
    { n: "6", unit: "un", k: "Carrinhos de metal" },
    { n: "6", unit: "bolas", k: "Munição do canhão" },
    { n: "3", unit: "+ anos", k: "Idade indicada" },
  ],
  headline: "O mesmo dinossauro, agora com canhão lançador",
  tagline: "Canhão de bolinhas · 6 carrinhos + 6 bolas",
  intro: [
    "A **versão Canhão** troca a pista por um **canhão lançador** montado nas costas do dinossauro. Ele dispara as **6 bolinhas de futebol** que acompanham o kit — e, girando o cano, também cospe o carrinho em alta velocidade. A boca do dino continua engolindo carrinhos, igual à versão Pista.",
    "A carroceria tem armazenamento **dos dois lados**, com escotilha retrátil: a criança aperta e o compartimento desliza para fora com os carrinhos alinhados. É o modelo mais completo da linha, e o que mais rende brincadeira em grupo — porque tem alvo, tiro e disputa.",
  ],
  features: [
    {
      title: "⚽ Canhão que dispara bolinhas",
      body: "Carrega a bolinha pelo cano, mira e dispara. As **6 bolinhas de futebol** já vêm na caixa, e o cano gira para mudar o ângulo do tiro — dá para montar alvo, gol ou só ver quem acerta mais longe.",
    },
    {
      title: "🦖 Engole carrinho e ainda lança",
      body: "A mandíbula engole o carrinho pela boca, como na versão Pista. A diferença é a saída: aqui o carrinho pode ser **expulso pelo canhão**, disparado para a frente em vez de simplesmente sair pela traseira.",
    },
    {
      title: "📦 Escotilha retrátil dos dois lados",
      body: "O compartimento de carrinhos abre em **duas faces**, com bandeja que desliza para fora ao apertar o botão. Guarda os 6 carrinhos e as bolinhas dentro do próprio caminhão — o brinquedo é a caixa de brinquedo.",
    },
  ],
  highlights: [
    "**3 em 1**: caminhão, dinossauro e canhão lançador",
    "**Canhão** que dispara bolinhas de futebol",
    "**6 bolinhas** de futebol inclusas",
    "Função que **engole o carrinho** pela boca",
    "Expulsa o carrinho em alta velocidade",
    "**6 carrinhos de metal** inclusos",
    "**Escotilha retrátil** com armazenamento dos dois lados",
    "**ABS ecológico** + liga metálica",
    "Indicado a partir de **3 anos**",
  ],
  gift: {
    image: "/fotos/canhao/lancador.jpg",
    title: "🎁 6 carrinhos + 6 bolinhas de futebol",
    text: "Carrinhos de liga metálica e a munição do canhão — tudo já na caixa",
    tag: "Incluso",
  },
};

export const products: Product[] = [
  {
    id: 1,
    // Sem sufixo de versão: o nome que vai pro carrinho e pro pedido é este mais
    // o label da variante ("… — Versão Canhão"), montado em components/ProductPage.
    name: "Caminhão Dinossauro Engole Carrinhos",
    price: 89.98,
    compareAtPrice: 204.98,
    image: PISTA.images[0],
    // A galeria no nível do produto é a da versão padrão (Pista) — é o que o
    // painel /admin edita e o que alimenta o card de busca. A galeria que a PDP
    // mostra vem sempre da variante escolhida.
    images: PISTA.images,
    // Nota e contagem são as do anúncio de origem da versão Pista (TikTok Shop,
    // vendedor Candystar): 4,7 com 1.192 avaliações. As avaliações são do
    // produto, não da versão — as duas dividem a mesma página. Se mexer aqui,
    // ajuste também o DIST em components/ProductPage: são as barrinhas por
    // estrela, e a média que elas representam precisa fechar com este número.
    rating: 4.7,
    reviews: 1192,
    category: "Cegonhas e Pistas",
    slug: "caminhao-dinossauro-engole-carrinhos",
    description:
      "Cegonha dinossauro que engole carrinhos pela boca, em duas versões. Versão Pista: abre numa pista de 157cm com corrida de 2 jogadores e acompanha 6 carrinhos de metal. Versão Canhão: canhão lançador que dispara 6 bolinhas de futebol e expulsa o carrinho, com escotilha retrátil dos dois lados e 6 carrinhos de metal. ABS ecológico + metal, indicado a partir de 3 anos. Frete grátis para todo o Brasil.",
    isTest: false,
    tags: ["cegonha", "dinossauro", "pista", "canhão", "carrinhos", "brinquedo"],
    variants: [
      {
        id: 101,
        label: "Versão Pista",
        price: 89.98,
        compareAtPrice: 204.98,
        image: PISTA.images[0],
        available: true,
        swatch: "#1d6fd8",
        content: PISTA,
      },
      {
        id: 102,
        label: "Versão Canhão",
        price: 109.49,
        compareAtPrice: 119.99,
        image: CANHAO.images[0],
        available: true,
        swatch: "#f4761b",
        content: CANHAO,
      },
    ],
  },
];
