import Link from "next/link";
import Image from "next/image";

// Logo da marca. A arte já traz o símbolo E a palavra BRINKA, então aqui não
// existe mais texto solto — o nome vem no `alt`, que é o que leitor de tela e
// buscador leem.
//
// Duas variantes do mesmo arquivo porque o rodapé tem fundo escuro (--ink) e a
// palavra do logo é quase preta: no escuro ela sumiria. A versão "light" tem
// só o lettering reclareado; o laranja e o azul do símbolo seguem iguais.
export default function Logo({ href = "/", variant = "dark", priority = false }) {
  // WebP: o next.config usa images.unoptimized, entao o arquivo vai cru pro
  // browser — 12 KB em vez de 50 KB do PNG, num asset que carrega em toda pagina.
  // Os .png ficam no public pra uso em e-mail, que nao le webp direito.
  const src = variant === "light" ? "/brinka-logo-light.webp" : "/brinka-logo.webp";
  return (
    <Link href={href} className="logo" aria-label="BRINKA — página inicial">
      <Image
        src={src}
        alt="BRINKA"
        width={450}
        height={120}
        priority={priority}
        // Altura manda; a largura acompanha a proporção 450x120 pelo CSS.
        className="logo-img"
      />
    </Link>
  );
}
