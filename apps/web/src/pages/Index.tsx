import { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/About";
import Procedures from "@/components/Procedures";
import Technology from "@/components/Technology";
import Testimonials from "@/components/Testimonials";
import Appointment from "@/components/Appointment";
import Footer from "@/components/Footer";
import { useImage, useSection } from "@/hooks/useLanding";

interface SeoContent {
  title: string;
  description: string;
}

const FALLBACK: SeoContent = {
  title: "Dra. Marcela Duch | Medicina Estética em Chapadão do Sul/MS",
  description:
    "Medicina estética, saúde da pele, gerenciamento de envelhecimento, Botox, bioestimuladores, peptídeos, harmonização facial e tratamentos corporais em Chapadão do Sul/MS.",
};

/** Cria a meta tag se ainda não existir, senão só troca o conteúdo. */
function setMeta(selector: string, attr: "name" | "property", key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = value;
}

const Index = () => {
  const { content } = useSection<SeoContent>("SEO", FALLBACK);
  const ogImage = useImage("seo.og", "", "");

  /* O index.html já traz título e descrição para quem lê o HTML cru (o
     rastreador do Google inclusive). Isto atualiza depois, quando a clínica
     edita — sem depender de renderização no servidor, que este site não tem. */
  useEffect(() => {
    document.title = content.title;
    setMeta('meta[name="description"]', "name", "description", content.description);
    setMeta('meta[property="og:title"]', "property", "og:title", content.title);
    setMeta('meta[property="og:description"]', "property", "og:description", content.description);
    if (ogImage.src) {
      setMeta('meta[property="og:image"]', "property", "og:image", ogImage.src);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage.src);
    }
  }, [content.title, content.description, ogImage.src]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Procedures />
        <Technology />
        <Testimonials />
        <Appointment />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
