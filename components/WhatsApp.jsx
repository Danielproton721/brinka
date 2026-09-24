"use client";

import { useEffect, useState } from "react";

// O site é estático: se o rodapé/layout lessem o KV, toda página viraria
// dinâmica. Então a configuração vem por fetch (resposta cacheada por 1 min, o
// que faz o botão e o rodapé dividirem a mesma requisição).
function useWhatsApp() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/whatsapp")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && d && setCfg(d))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return cfg;
}

function IconeWhatsApp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.53 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.21-8.24 8.21Z" />
    </svg>
  );
}

/** Botão flutuante no canto da tela, em todas as páginas. */
export function WhatsAppFloat() {
  const cfg = useWhatsApp();
  if (!cfg?.botao) return null;

  return (
    <a
      href={cfg.link}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-float"
      aria-label={`Falar no WhatsApp: ${cfg.legivel}`}
    >
      <IconeWhatsApp className="wa-float-ico" />
      <span className="wa-float-texto">Fale conosco</span>
    </a>
  );
}

/** Link do rodapé, na coluna de ajuda. */
export function WhatsAppFooterLink() {
  const cfg = useWhatsApp();
  if (!cfg?.rodape) return null;

  return (
    <a href={cfg.link} target="_blank" rel="noopener noreferrer" className="wa-rodape">
      <IconeWhatsApp className="wa-rodape-ico" />
      WhatsApp {cfg.legivel}
    </a>
  );
}
