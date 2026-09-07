"use client";

import { useEffect, useRef } from "react";

/* Carrossel de vídeo que anda sozinho e não para.

   A lista entra DUAS vezes na faixa e a animação percorre exatamente metade da
   largura. Ao reiniciar, o primeiro clone está no lugar do original — a emenda
   não aparece. Por isso o espaçamento é margin-right em todo item, e não gap:
   com gap, "metade" não cai no ponto de emenda e a volta dá um pulo.

   Sobre a reprodução: o atributo autoPlay sozinho não é confiável. O navegador
   decide se honra ou não, e há casos em que ele simplesmente não inicia — React
   montando o elemento depois do parse, aba que abriu em segundo plano, economia
   de energia, retorno de outra aba. Como aqui não existe controle para o
   visitante dar play, um vídeo parado fica parado para sempre. Então o play é
   pedido por código, e re-pedido nos momentos em que o navegador costuma
   suspender: volta de visibilidade, foco na janela, e o próprio evento de pause.
*/
export default function VideoCarousel({ videos = [], label }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const vids = Array.from(box.querySelectorAll("video"));
    if (!vids.length) return;

    // play() rejeita quando o navegador bloqueia; engolir é proposital — sem
    // controles não há o que oferecer ao visitante, e a próxima tentativa vem
    // no próximo evento.
    const tocar = () => {
      for (const v of vids) {
        v.muted = true; // garante o mudo: sem ele o autoplay é barrado
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };

    tocar();

    // Se o navegador pausar por conta própria, retoma.
    const aoPausar = (e) => {
      const v = e.target;
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    for (const v of vids) v.addEventListener("pause", aoPausar);

    const aoVoltar = () => {
      if (document.visibilityState === "visible") tocar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", tocar);
    window.addEventListener("pageshow", tocar);

    return () => {
      for (const v of vids) v.removeEventListener("pause", aoPausar);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", tocar);
      window.removeEventListener("pageshow", tocar);
    };
  }, [videos]);

  if (!videos.length) return null;

  return (
    <div
      ref={boxRef}
      className="vcarousel"
      style={{ "--n": videos.length }}
      aria-label={label}
    >
      <div className="vtrack">
        {[...videos, ...videos].map((src, i) => (
          <video
            key={`${src}-${i}`}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            // preload="auto": o clipe precisa estar pronto quando a faixa o
            // trouxer pra tela. Com "metadata" ele chegaria congelado no
            // primeiro quadro e só destravaria depois.
            preload="auto"
            tabIndex={-1}
            aria-hidden={i >= videos.length}
          />
        ))}
      </div>
    </div>
  );
}
