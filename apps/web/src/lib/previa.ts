import { useSyncExternalStore } from "react";

/**
 * Prévia ao vivo do editor da landing.
 *
 * O painel embute o próprio site numa moldura (`/previa?secao=HERO`) e manda
 * por `postMessage` o rascunho que a pessoa está escrevendo. O site desenha a
 * seção com os componentes de verdade, então a prévia é idêntica por
 * construção — antes o painel tinha uma cópia da landing, que envelhecia a
 * cada mudança no site.
 *
 * Três travas, porque isto põe na página texto vindo de fora dela:
 *
 * - só vale dentro de moldura e na rota de prévia — a landing pública nunca
 *   escuta mensagem nenhuma;
 * - só aceita mensagem do próprio domínio (o painel mora em /admin/ do mesmo
 *   endereço) ou de uma origem declarada no build, para o desenvolvimento;
 * - o conteúdo só é desenhado, nunca gravado: publicar continua sendo o
 *   "Salvar" do painel, que passa pelo schema da API.
 */

export interface EstadoPrevia {
  sections: Record<string, unknown>;
  images: Record<string, { url: string; alt: string }>;
}

const TIPO_RASCUNHO = "landing-previa";

/** Origens de onde o painel pode falar com a prévia. */
export function origensPermitidas(atual: string, extras = ""): string[] {
  return [atual, ...extras.split(",").map((o) => o.trim()).filter(Boolean)];
}

export function origemPermitida(origem: string, atual: string, extras = ""): boolean {
  return origensPermitidas(atual, extras).includes(origem);
}

/** Aceita só o formato esperado — qualquer outra coisa é ignorada. */
export function lerRascunho(dados: unknown): EstadoPrevia | null {
  if (!dados || typeof dados !== "object") return null;
  const d = dados as Record<string, unknown>;
  if (d.tipo !== TIPO_RASCUNHO) return null;
  if (!d.sections || typeof d.sections !== "object") return null;
  const images: EstadoPrevia["images"] = {};
  if (d.images && typeof d.images === "object") {
    for (const [slot, img] of Object.entries(d.images as Record<string, unknown>)) {
      const i = img as { url?: unknown; alt?: unknown };
      /* Só URL http(s) ou relativa: é interpolada em `url(...)` no fundo do hero. */
      if (typeof i?.url === "string" && /^(https?:\/\/|\/)[^\s"'()]*$/.test(i.url)) {
        images[slot] = { url: i.url, alt: typeof i.alt === "string" ? i.alt : "" };
      }
    }
  }
  return { sections: d.sections as Record<string, unknown>, images };
}

export const EM_PREVIA =
  typeof window !== "undefined" &&
  window.parent !== window &&
  window.location.pathname.replace(/\/+$/, "").endsWith("/previa");

const EXTRAS = import.meta.env.VITE_ADMIN_ORIGIN ?? "";
let estado: EstadoPrevia | null = null;
const ouvintes = new Set<() => void>();

/** Para onde a prévia responde: a origem de quem a embutiu, se for permitida. */
export function origemDoPainel(): string {
  try {
    const ref = document.referrer ? new URL(document.referrer).origin : "";
    if (ref && origemPermitida(ref, window.location.origin, EXTRAS)) return ref;
  } catch {
    /* referrer inválido: cai na própria origem */
  }
  return window.location.origin;
}

export function avisarPainel(mensagem: Record<string, unknown>) {
  if (!EM_PREVIA) return;
  window.parent.postMessage(mensagem, origemDoPainel());
}

if (EM_PREVIA) {
  window.addEventListener("message", (event) => {
    if (!origemPermitida(event.origin, window.location.origin, EXTRAS)) return;
    const rascunho = lerRascunho(event.data);
    if (!rascunho) return;
    estado = rascunho;
    ouvintes.forEach((ouvir) => ouvir());
  });
}

export function usePrevia(): EstadoPrevia | null {
  return useSyncExternalStore(
    (ouvir) => {
      ouvintes.add(ouvir);
      return () => ouvintes.delete(ouvir);
    },
    () => estado,
    () => null,
  );
}
