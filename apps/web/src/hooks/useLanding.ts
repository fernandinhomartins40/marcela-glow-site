import { useQuery } from "@tanstack/react-query";
import { landingApi, type LandingResponse } from "@/lib/api";

/**
 * Conteúdo editável da landing.
 *
 * O site é a vitrine da clínica: se a API estiver fora do ar ele ainda precisa
 * abrir escrito. Por isso cada seção tem um valor de partida aqui, e o hook
 * devolve o que veio do servidor só quando veio — nunca uma tela em branco
 * esperando resposta.
 */

export type SectionId =
  | "HERO"
  | "ABOUT"
  | "PROCEDURES"
  | "TECHNOLOGY"
  | "TESTIMONIALS"
  | "APPOINTMENT"
  | "FOOTER"
  | "SEO";

export function useLanding() {
  return useQuery<LandingResponse>({
    queryKey: ["landing"],
    queryFn: landingApi.get,
    staleTime: 5 * 60 * 1000,
    // O conteúdo muda raramente; refazer a busca a cada foco só gasta rede.
    refetchOnWindowFocus: false,
    retry: 1,
  });
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
