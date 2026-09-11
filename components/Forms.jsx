"use client";

import { useState } from "react";

/* Formulário de contato (Central de Atendimento) */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <div className="form-row">
        <input type="text" placeholder="Seu nome" />
        <input type="email" placeholder="Seu e-mail" />
      </div>
      <div className="form-row">
        <input type="text" placeholder="Número do pedido (opcional)" />
      </div>
      <div className="form-row">
        <input type="text" placeholder="Como podemos ajudar?" style={{ minWidth: "100%" }} />
      </div>
      <div className="form-row">
        <button type="button" onClick={() => setSent(true)}>Enviar mensagem</button>
      </div>
      <div className={`trackres${sent ? " show" : ""}`}>
        Mensagem enviada! Responderemos no e-mail informado em até 24h úteis.
      </div>
    </>
  );
}

/* Envio de currículo (Trabalhe Conosco) */
export function CvForm() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <div className="form-row">
        <input type="text" placeholder="Seu nome" />
        <input type="email" placeholder="Seu e-mail" />
      </div>
      <div className="form-row">
        <input type="text" placeholder="Área de interesse" style={{ minWidth: "100%" }} />
      </div>
      <div className="form-row">
        <button type="button" onClick={() => setSent(true)}>Enviar</button>
      </div>
      <div className={`trackres${sent ? " show" : ""}`}>
        Recebido! Envie seu currículo para suportepedidos@brinkabrinquedos.shop com o assunto da
        área de interesse.
      </div>
    </>
  );
}
