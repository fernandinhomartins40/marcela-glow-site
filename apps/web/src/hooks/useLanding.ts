import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { landingApi, type LandingResponse } from "@/lib/api";
import { usePrevia, type EstadoPrevia } from "@/lib/previa";

/**
 * Conteúdo editável da landing.
 *
 * O site é a vitrine da clínica: se a API estiver fora do ar ele ainda precisa
 * abrir escrito. Por isso cada seção tem um valor de partida aqui, e o hook
 * devolve o que veio do servidor só quando veio — nunca uma tela em branco
 * esperando resposta.
 */

export type SectionId =
  | "THEME"
  | "HERO"
  | "ABOUT"
  | "PROCEDURES"
  | "TECHNOLOGY"
  | "TESTIMONIALS"
  | "APPOINTMENT"
  | "FOOTER"
  | "SEO"
  | "TRUST"
  | "CARE"
  | "VALUES";

/**
 * Na prévia do painel, o rascunho entra por cima do que a API devolveu: a
 * seção editada aparece visível e com o texto que está sendo escrito, e as
 * imagens recém-enviadas substituem as publicadas. Fora da prévia não há
 * rascunho e isto é só a resposta da API.
 */
function mesclar(base: LandingResponse | undefined, previa: EstadoPrevia): LandingResponse {
  const sections = { ...(base?.sections ?? {}) };
  for (const [id, content] of Object.entries(previa.sections)) {
    sections[id] = { content, isVisible: true, isCustom: true };
  }
  const images = { ...(base?.images ?? {}) };
  for (const [slot, img] of Object.entries(previa.images)) {
    images[slot] = { ...(images[slot] ?? { width: 0, height: 0 }), url: img.url, alt: img.alt };
  }
  return { sections, images };
}

export function useLanding() {
  const query = useQuery<LandingResponse>({
    queryKey: ["landing"],
    queryFn: landingApi.get,
    staleTime: 5 * 60 * 1000,
    // O conteúdo muda raramente; refazer a busca a cada foco só gasta rede.
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const previa = usePrevia();
  const data = useMemo(() => (previa ? mesclar(query.data, previa) : query.data), [query.data, previa]);
  return { ...query, data };
}

/**
 * Conteúdo de uma seção, com o padrão local enquanto a resposta não chega — ou
 * para sempre, se ela não chegar. `fallback` é o texto que já estava escrito no
 * componente, então o site nunca fica pior do que era antes deste sistema.
 */
export function useSection<T>(id: SectionId, fallback: T): { content: T; isVisible: boolean } {
  const { data } = useLanding();
  const section = data?.sections?.[id];

  return {
    content: (section?.content as T) ?? fallback,
    // Só esconde quando o servidor disse explicitamente para esconder.
    isVisible: section?.isVisible ?? true,
  };
}

/**
 * URL da imagem de um slot, ou a que veio no build.
 * O `alt` acompanha porque é gravado junto com a imagem no painel.
 */
export function useImage(slot: string, fallbackUrl: string, fallbackAlt: string) {
  const { data } = useLanding();
  const image = data?.images?.[slot];
  return {
    src: image?.url ?? fallbackUrl,
    alt: image?.alt ?? fallbackAlt,
  };
}
