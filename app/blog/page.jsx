import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Blog | BRINKA Brinquedos",
  description: "Dicas de uso, segurança infantil, cuidados com os brinquedos e novidades BRINKA.",
};

export default function Blog() {
  return (
    <LegalPage
      crumb="Blog"
      title="Blog da BRINKA"
      updated="Dicas e novidades"
      updatedIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 5h16M4 12h16M4 19h10" />
        </svg>
      }
      toc={{
        heading: "Categorias",
        items: [
          { href: "#dicas", label: "Dicas de uso" },
          { href: "#seg", label: "Segurança" },
          { href: "#manut", label: "Manutenção" },
        ],
      }}
      intro="Conteúdo para a criança aproveitar melhor os brinquedos e brincar com segurança. Novos artigos toda semana."
    >
      <section id="dicas">
        <h2>
          <span className="num">01</span> Como montar a pista de 157cm no espaço que você tem
        </h2>
        <p>
          A pista aberta pede um corredor livre de cerca de 1,60m. Piso liso e plano faz o
          carrinho de metal correr mais longe — em tapete ele perde velocidade e não chega
          ao fim da raia. Se o espaço for curto, dá para brincar com a pista dobrada pela
          metade, usando só o modo lançador.
        </p>
      </section>

      <section id="seg">
        <h2>
          <span className="num">02</span> Brincadeira segura com carrinhos de metal
        </h2>
        <p>
          Os carrinhos de liga metálica são resistentes, mas por serem pequenos exigem
          atenção com irmãos menores de 3 anos. Guarde-os dentro do próprio caminhão depois
          de brincar — é para isso que existem os três andares — e supervisione o modo
          lançador, que dispara o carrinho com força.
        </p>
      </section>

      <section id="manut">
        <h2>
          <span className="num">03</span> Manutenção básica em casa
        </h2>
        <p>
          Limpe com pano levemente úmido e seque na hora; nunca lave sob água corrente.
          Verifique periodicamente os encaixes da pista e a trava da mandíbula, e guarde em
          local seco, longe de sol direto prolongado, que resseca o ABS.
        </p>
        <div className="callout">
          ⚠️ Conteúdo de exemplo. Substitua por artigos reais do seu blog quando for
          publicar.
        </div>
      </section>
    </LegalPage>
  );
}
