import { useEffect, type ComponentType } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import About from "@/components/About";
import CareAreas from "@/components/CareAreas";
import Marquee from "@/components/Marquee";
import Procedures from "@/components/Procedures";
import Technology from "@/components/Technology";
import Testimonials from "@/components/Testimonials";
import Appointment from "@/components/Appointment";
import Footer from "@/components/Footer";
import Theme from "@/components/Theme";
import { avisarPainel } from "@/lib/previa";

/**
 * A página que o editor do painel embute como prévia.
 *
 * Desenha só a seção que está sendo editada, com os mesmos componentes da
 * landing — a prévia é o site, não uma imitação dele. O conteúdo chega por
 * `postMessage` (ver `lib/previa.ts`) e entra por cima do publicado.
 *
 * "Cores" mostra a página inteira: a paleta muda tudo de uma vez, e ver uma
 * seção só esconderia onde a cor nova ficou ruim.
 */
const PAGINA: ComponentType[] = [Header, Hero, TrustBar, About, CareAreas, Marquee, Procedures, Technology, Testimonials, Appointment, Footer];

const POR_SECAO: Record<string, ComponentType[]> = {
  /* O cabeçalho vem junto com o hero porque fica por cima dele: sem ele o
     título apareceria mais alto do que no site. */
  HERO: [Header, Hero],
  TRUST: [TrustBar],
  ABOUT: [About],
  CARE: [CareAreas],
  VALUES: [Marquee],
  PROCEDURES: [Procedures],
  TECHNOLOGY: [Technology],
  TESTIMONIALS: [Testimonials],
  APPOINTMENT: [Appointment],
  FOOTER: [Footer],
  THEME: PAGINA,
};

export default function Previa() {
  const secao = new URLSearchParams(window.location.search).get("secao")?.toUpperCase() ?? "THEME";
  const partes = POR_SECAO[secao] ?? PAGINA;

  useEffect(() => {
    /* A prévia não é página para o Google. */
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);

    avisarPainel({ tipo: "landing-previa-pronta" });
    /* A moldura do painel acompanha a altura da seção, para não haver barra de
       rolagem dentro da prévia nem espaço sobrando embaixo. */
    const informar = () => avisarPainel({ tipo: "landing-previa-altura", altura: document.documentElement.scrollHeight });
    const observador = new ResizeObserver(informar);
    observador.observe(document.body);
    informar();
    return () => {
      observador.disconnect();
      robots.remove();
    };
  }, []);

  return (
    <div>
      <Theme />
      {partes.map((Parte, i) => (
        <Parte key={i} />
      ))}
    </div>
  );
}
