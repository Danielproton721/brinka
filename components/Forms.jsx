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

/* Busca de rastreamento (Rastrear Pedido) */
export function TrackForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);

  function track() {
    const v = code.trim();
    setResult(
      v ? (
        <>
          <b>Pedido {v}</b>
          <br />
          Status: <b>Em trânsito</b> — última atualização: centro de distribuição São
          Paulo/SP. Previsão de entrega em 3 a 6 dias úteis.
        </>
      ) : (
        "Digite um código para consultar."
      )
    );
  }

  return (
    <>
      <div className="form-row">
        <input
          type="text"
          placeholder="Código de rastreio ou nº do pedido"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="button" onClick={track}>Rastrear</button>
      </div>
      <div className={`trackres${result !== null ? " show" : ""}`}>{result}</div>
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
        Recebido! Envie seu currículo para vagas@brinkabrinquedos.com.br com o assunto da
        área de interesse.
      </div>
    </>
  );
}
