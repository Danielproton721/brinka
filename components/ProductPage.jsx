"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import Logo from "./Logo";
import SiteFooter from "./SiteFooter";

/* Formata 90 -> "90" e 489.93 -> "489,93" (padrão brasileiro). */
function brl(value) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* Contagem de avaliações com separador de milhar: 1192 -> "1.192". */
function num(value) {
  return Number(value ?? 0).toLocaleString("pt-BR");
}

/* Os textos das versões moram em lib/products.ts, que é um arquivo de dados —
   por isso o destaque vai como `**assim**` em vez de JSX, e vira <b> aqui. */
function rich(text) {
  return String(text ?? "")
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

// Vídeos do produto (seção "Em ação"). Coloque os MP4 em public/videos/ e
// liste os caminhos aqui — ex.: ["/videos/engole-carrinho.mp4", "/videos/corrida.mp4"].
// Com a lista vazia a seção inteira some da página.
const VIDEOS = [];

// Avaliações reais do anúncio de origem (TikTok Shop, vendedor Candystar).
// Texto copiado na íntegra, sem retoque. A plataforma só expõe o nome mascarado
// de quem avalia — então aqui também não se inventa nome: fica a máscara, igual
// à fonte. As três fotos são de compradores reais e mostram só o produto.
const REVIEWS = [
  {
    name: "r**4",
    meta: "Brasil · 08/07/2026",
    stars: 5,
    text: "Meu filho adorou presente é bonito e resistente",
    photo: "/fotos-clientes/cliente-1.webp",
    photoAlt: "Foto enviada por um comprador",
    helpful: 4,
  },
  {
    name: "E**n B**a",
    meta: "Brasil · 02/07/2026",
    stars: 5,
    text: "É lindo demais, meus filhos amaram, podem comprar vai fazer a alegria da criançada! Aparência: Lindo perfeito! Material: Ótima qualidade, resistente! Flexibilidade: É bem flexível ao abrir a pista de carrinho.",
    photo: "/fotos-clientes/cliente-2.webp",
    photoAlt: "Foto enviada por um comprador",
    helpful: 2,
  },
  {
    name: "g**_",
    meta: "Brasil · 24/07/2026",
    stars: 5,
    text: "Aparência: Igual Flexibilidade: Ótima Ótimo Material: Ótimo produto com material de qualidade ✅",
    photo: "/fotos-clientes/cliente-3.webp",
    photoAlt: "Foto enviada por um comprador",
    helpful: 1,
  },
];

// Distribuição real das 1.192 avaliações do anúncio de origem:
// 1015×5, 72×4, 41×3, 20×2, 44×1 — soma 5.610, média 4,71 → 4,7.
// Precisa fechar com o `rating` de lib/products.ts, senão as barras contam uma
// história diferente do número grande logo ao lado.
const DIST = [
  { s: "5 ★", w: "85.2%", p: "85%" },
  { s: "4 ★", w: "6%", p: "6%" },
  { s: "3 ★", w: "3.4%", p: "3%" },
  { s: "2 ★", w: "1.7%", p: "2%" },
  { s: "1 ★", w: "3.7%", p: "4%" },
];

const CartIcon = ({ w = 1.9 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}>
    <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L22 8H6" />
    <circle cx="10" cy="21" r="1.4" />
    <circle cx="18" cy="21" r="1.4" />
  </svg>
);

const Check = ({ w = 2.2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ThumbUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2l-1.5 6a2 2 0 0 1-2 1.5H7" />
  </svg>
);

function Stars({ n, size }) {
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? undefined : "off"}>★</span>
      ))}
    </span>
  );
}

export default function ProductPage({ product }) {
  const { addItem, updateQuantity, items, totalItems, openCart } = useCart();

  // As variantes vêm do catálogo (lib/products.ts), já com as edições do painel
  // /admin aplicadas por app/page.jsx. Assim, mexer no preço/nome pelo painel
  // reflete aqui sem precisar de deploy.
  const COLORS = useMemo(
    () =>
      (product?.variants ?? []).map((v) => ({
        id: v.id,
        name: v.label,
        chip: v.swatch,
        img: v.image,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        content: v.content,
      })),
    [product]
  );

  const [img, setImg] = useState(COLORS[0]?.img);
  const [swapping, setSwapping] = useState(false);
  const [color, setColor] = useState(COLORS[0]?.name);
  const [qty, setQty] = useState(1);
  const [fav, setFav] = useState(false);
  const [sticky, setSticky] = useState(false);

  const selected = COLORS.find((c) => c.name === color) ?? COLORS[0];

  // Tudo que a versão escolhida carrega: galeria, banners, números e texto.
  // Sem `content` (catálogo antigo ou variante nova sem conteúdo), a página cai
  // na galeria do produto e some com as seções que não teriam o que mostrar.
  const content = selected?.content;

  const THUMBS = useMemo(() => {
    const imgs = content?.images?.length
      ? content.images
      : product?.images?.length
        ? product.images
        : [product?.image];
    return imgs.filter(Boolean).map((src, i) => ({
      img: src,
      alt: content?.alts?.[i] ?? product?.name,
    }));
  }, [content, product]);

  // A fila do carrossel é a lista repetida 3x. As cópias são idênticas, então
  // o salto que reposiciona o scroll na cópia do meio passa despercebido — é
  // isso que dá a sensação de rolagem sem fim nos dois sentidos.
  const THUMBS_LOOP = useMemo(() => [...THUMBS, ...THUMBS, ...THUMBS], [THUMBS]);

  const price = selected?.price ?? product?.price ?? 0;
  const compareAt = selected?.compareAtPrice ?? product?.compareAtPrice ?? 0;
  const savings = Math.max(0, compareAt - price);
  const discountPct = compareAt > 0 ? Math.round((savings / compareAt) * 100) : 0;
  const installment = price / 12;

  const swapTimer = useRef(null);
  const buyNowRef = useRef(null);
  const buyboxRef = useRef(null);
  const thumbsRef = useRef(null);
  const rootRef = useRef(null);

  function changeImage(src) {
    if (src === img) return;
    setSwapping(true);
    clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      setImg(src);
      setSwapping(false);
    }, 160);
  }

  // Trocar de versão troca a galeria inteira. A foto em exibição vai para a
  // primeira da nova versão — se ficasse a anterior, a página mostraria a foto
  // de um brinquedo com o preço e o texto do outro.
  function selectVariant(c) {
    setColor(c.name);
    changeImage(c.content?.images?.[0] ?? c.img);
  }

  // Miniatura NÃO muda a versão: dentro de uma galeria, todas as fotos são do
  // mesmo brinquedo.
  function clickThumb(t) {
    changeImage(t.img);
  }

  // Joga a variante escolhida no carrinho e ABRE O CARRINHO — sem sair da
  // página. Quem for fechar o carrinho continua na PDP e pode escolher outra
  // variante; antes o botão empurrava pro /checkout, então fechar o carrinho
  // deixava o cliente preso lá dentro. Ir pro checkout é papel do "Finalizar
  // compra" do carrinho, que antes disso registra a sessão no servidor
  // (app/api/checkout/session) — coisa que o atalho daqui pulava.
  //
  // O id enviado é o da VARIANTE: é por ele que o servidor confere o preço e
  // que o pedido aparece no painel /admin.
  //
  // "Comprar agora" também NÃO é "adicionar mais um": se a variante já está no
  // carrinho, a quantidade passa a ser a do seletor em vez de somar. Sem isso,
  // voltar pra página e clicar de novo empilhava 1, 2, 3… sem o cliente pedir.
  function buyNow() {
    if (!selected) return;
    const noCarrinho = items.find((i) => i.id === selected.id);
    if (noCarrinho) {
      if (noCarrinho.quantity !== qty) updateQuantity(selected.id, qty);
      openCart();
    } else {
      addItem(
        {
          id: selected.id,
          slug: product.slug,
          name: `${product.name} — ${selected.name}`,
          price: selected.price,
          compareAtPrice: selected.compareAtPrice,
          image: selected.img,
        },
        qty
      );
    }
  }

  // Loop do carrossel de miniaturas. Começa na cópia do meio e, sempre que o
  // scroll passa da metade de uma cópia para qualquer lado, volta um bloco —
  // como o conteúdo se repete, a posição visual não muda e nunca há "fim".
  useEffect(() => {
    const el = thumbsRef.current;
    if (!el || THUMBS.length === 0) return;

    const setWidth = () => el.scrollWidth / 3;
    el.scrollLeft = setWidth();

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = setWidth();
        if (w <= 0) return;
        if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
        else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [THUMBS]);

  useEffect(() => {
    const btn = buyNowRef.current;
    if (!btn) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) =>
          setSticky(!x.isIntersecting && window.innerWidth <= 960)
        ),
      { threshold: 0 }
    );
    io.observe(btn);

    const ro = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            ro.unobserve(x.target);
          }
        }),
      { threshold: 0.12 }
    );
    rootRef.current?.querySelectorAll(".reveal").forEach((el) => ro.observe(el));

    return () => {
      io.disconnect();
      ro.disconnect();
      clearTimeout(swapTimer.current);
    };
  }, []);

  return (
    <div ref={rootRef}>
      <div className="announce">
        🦖 <b>FRETE GRÁTIS</b> para todo o Brasil <span className="sep">•</span>
        <span className="hide-sm">
          Parcele em <b>12x sem juros</b>
        </span>{" "}
        <span className="sep">•</span> Garantia de <b>12 meses</b>
      </div>

      <header>
        <div className="wrap nav">
          <Logo priority />
          <nav className="menu">
            <Link href="/">Início</Link>
            <Link href="/">Cegonhas</Link>
            <Link href="/">Pistas</Link>
            <a href="#reviews">Avaliações</a>
            <Link href="/central-de-atendimento">Contato</Link>
          </nav>
          <div className="spacer" />
          <div className="icons">
            <button className="iconbtn" aria-label="Carrinho" onClick={openCart}>
              <CartIcon />
              <span className="cart-count">{totalItems}</span>
            </button>
            <button className="iconbtn burger" aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="crumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <Link href="/">Cegonhas e Pistas</Link>
          <span>/</span>Caminhão Dinossauro <span>/</span>
          {color}
        </div>
      </div>

      <div className="wrap product">
        {/* GALLERY */}
        <div className="gallery">
          <div className="stage">
            <div className="badge-disc">
              -{discountPct}%<small>OFF</small>
            </div>
            <button
              className={`fav${fav ? " on" : ""}`}
              aria-label="Favoritar"
              onClick={() => setFav((f) => !f)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 21s-7.5-4.7-10-9.3C.3 8.4 1.8 4.7 5.2 4.2 7.4 3.9 9.2 5 12 7.8 14.8 5 16.6 3.9 18.8 4.2c3.4.5 4.9 4.2 3.2 7.5C19.5 16.3 12 21 12 21Z" />
              </svg>
            </button>
            <img
              className={swapping ? "swap" : undefined}
              src={img}
              alt={THUMBS.find((t) => t.img === img)?.alt ?? product.name}
            />
          </div>
          <div className="thumbs" ref={thumbsRef}>
            {THUMBS_LOOP.map((t, i) => (
              <button
                key={i}
                className={`thumb${t.video ? " video" : ""}${!t.video && t.img === img ? " active" : ""}`}
                onClick={() => clickThumb(t)}
                // As cópias 2 e 3 são decorativas: só a primeira volta é lida
                // por leitor de tela, para não repetir 3x a mesma miniatura.
                aria-hidden={i >= THUMBS.length || undefined}
                tabIndex={i >= THUMBS.length ? -1 : undefined}
              >
                <img src={t.img} alt={t.alt} />
              </button>
            ))}
          </div>
        </div>

        {/* BUY BOX */}
        <div className="buybox" ref={buyboxRef}>
          <h1 className="title">{product.name}</h1>
          <div className="ratingline">
            <Stars n={Math.round(product.rating ?? 5)} />
            <span className="val">{product.rating ?? 5}</span>
            <a href="#reviews">{num(product.reviews)} avaliações</a>
          </div>

          <div className="pricecard">
            <div className="price-row">
              <div className="price-now">
                <span className="rs">R$</span>
                {Math.floor(price)}
                <span className="cents">
                  ,{brl(price).split(",")[1]}
                </span>
              </div>
              {compareAt > price && <div className="price-old">R$ {brl(compareAt)}</div>}
              {savings > 0 && (
                <div className="save-pill">Você economiza R$ {brl(savings)}</div>
              )}
            </div>
            <div className="installments">
              ou <b>12x de R$ {brl(installment)}</b> sem juros no cartão
            </div>
          </div>

          {/* SELETOR DE VERSÃO — cada opção é um brinquedo diferente, então o
              cartão mostra a foto, o que muda e o preço de cada uma. Com uma
              variante só, vira apenas a linha do modelo enviado. */}
          <div className="block">
            <div className="lbl">
              Versão: <b>{color}</b>
            </div>
            {COLORS.length > 1 && (
              <div className="versions">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    className={`version${c.name === color ? " active" : ""}`}
                    onClick={() => selectVariant(c)}
                    aria-pressed={c.name === color}
                  >
                    <img src={c.content?.images?.[0] ?? c.img} alt="" aria-hidden="true" />
                    <span className="v-txt">
                      <span className="v-name">{c.name}</span>
                      {c.content?.tagline && <small>{c.content.tagline}</small>}
                    </span>
                    <span className="v-price">R$ {brl(c.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* qty + cta */}
          <div className="buy">
            <div className="qty">
              <button aria-label="Diminuir" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <input value={qty} readOnly />
              <button aria-label="Aumentar" onClick={() => setQty((q) => Math.min(9, q + 1))}>
                +
              </button>
            </div>
            <button className="buynow" ref={buyNowRef} onClick={buyNow}>
              Comprar agora
            </button>
          </div>

          <div className="trust">
            <div className="t">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7h13v10H3zM16 10h4l1 3v4h-5" />
                <circle cx="7" cy="18" r="1.6" />
                <circle cx="18" cy="18" r="1.6" />
              </svg>
              Frete grátis Brasil
            </div>
            <div className="t">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
              </svg>
              Garantia 12 meses
            </div>
            <div className="t">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 9h11l-2-2M20 15H9l2 2" />
              </svg>
              7 dias para troca
            </div>
            <div className="t">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Pagamento seguro
            </div>
          </div>

          {content?.gift && (
            <div className="gift">
              <img src={content.gift.image} alt={content.gift.title} />
              <div>
                <div className="g-t">{content.gift.title}</div>
                <div className="g-s">{content.gift.text}</div>
              </div>
              <span className="tag">{content.gift.tag}</span>
            </div>
          )}
        </div>
      </div>

      {/* SPEC STRIP */}
      <div className="specs">
        <div className="wrap">
          {(content?.specs ?? []).map((s) => (
            <div className="spec" key={s.k}>
              <div className="n">
                {s.n}
                <span>{s.unit}</span>
              </div>
              <div className="k">{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DESCRIPTION */}
      <section className="section">
        <div className="wrap reveal">
          <span className="eyebrow">Sobre a {color}</span>
          <h2>{content?.headline}</h2>

          {/* Banners da descrição — empilhados, vêm antes do texto. Trocam junto
              com a versão: são as imagens do anúncio daquele modelo. */}
          <div className="desc-shots">
            {(content?.descShots ?? []).map((s) => (
              <img key={s.src} src={s.src} alt={s.alt} loading="lazy" decoding="async" />
            ))}
          </div>

          <div className="desc-grid">
            <div className="desc-body">
              {(content?.intro ?? []).map((p, i) => (
                <p key={i}>{rich(p)}</p>
              ))}
              {(content?.features ?? []).map((f) => (
                <div className="feat" key={f.title}>
                  <h3>{f.title}</h3>
                  <p>{rich(f.body)}</p>
                </div>
              ))}
            </div>
            <aside className="hl">
              <h3>✅ Destaques</h3>
              <ul>
                {(content?.highlights ?? []).map((h, i) => (
                  <li key={i}>
                    <Check />
                    <span>{rich(h)}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {/* VIDEOS — a seção só aparece quando houver vídeo. Para ligar: jogue os
          MP4 em public/videos/ e liste os caminhos aqui em VIDEOS (topo do
          arquivo). Enquanto a lista estiver vazia, nada é renderizado. */}
      {VIDEOS.length > 0 && (
        <section className="section alt">
          <div className="wrap reveal">
            <span className="eyebrow">Em ação</span>
            <h2>Veja a cegonha dinossauro funcionando</h2>
            <p className="lead">
              Vídeos reais do produto — a boca engolindo o carrinho, a pista abrindo e a
              corrida em duas raias.
            </p>
            <div className="videos">
              {VIDEOS.map((src) => (
                <video key={src} src={src} controls preload="metadata" playsInline />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      <section className="section" id="reviews">
        <div className="wrap reveal">
          <span className="eyebrow">O que dizem os clientes</span>
          <h2>Avaliações verificadas</h2>
          <div className="rev-head">
            <div className="score">
              <div className="big">{product.rating ?? 5}</div>
              <Stars n={5} size={20} />
              <div className="cnt">{num(product.reviews)} avaliações</div>
            </div>
            <div className="dist">
              {DIST.map((d) => (
                <div className="row" key={d.s}>
                  <span className="s">{d.s}</span>
                  <div className="bar">
                    <span style={{ width: d.w }} />
                  </div>
                  <span className="p">{d.p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews">
            {REVIEWS.map((r, i) => (
              <article className="review" key={i}>
                <div className="who">
                  <span className="anon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </span>
                  <div>
                    <div className="nm">
                      {r.name}{" "}
                      <span className="verif">
                        <Check w={3} />
                        Verificado
                      </span>
                    </div>
                    <div className="meta">{r.meta}</div>
                  </div>
                </div>
                <div className="rv-stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= r.stars ? undefined : "off"}>★</span>
                  ))}
                </div>
                <p>{r.text}</p>
                {r.photo && (
                  <div className="rphoto">
                    <img src={r.photo} alt={r.photoAlt} />
                  </div>
                )}
                <div className="foot">
                  <button>
                    <ThumbUp />
                    Útil ({r.helpful})
                  </button>
                  <span>Compra verificada</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* sticky mobile buy */}
      <div className={`stickybuy${sticky ? " show" : ""}`}>
        <div className="p">
          R$ {brl(price)}
          {compareAt > price && <small>R$ {brl(compareAt)}</small>}
        </div>
        <button onClick={() => buyboxRef.current?.scrollIntoView({ behavior: "smooth" })}>
          Comprar agora
        </button>
      </div>
    </div>
  );
}
