import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lerRascunho, origemPermitida } from "./previa";

/*
 * A prévia do painel põe na página texto que vem de fora dela. Estas são as
 * travas que impedem que isso vire porta de entrada na landing pública.
 */
describe("prévia ao vivo do editor", () => {
  it("só aceita mensagem do próprio domínio ou de origem declarada no build", () => {
    const site = "https://www.dramarceladuch.com.br";
    expect(origemPermitida(site, site)).toBe(true);
    expect(origemPermitida("https://evil.example", site)).toBe(false);
    expect(origemPermitida("http://localhost:4174", "http://localhost:4173", "http://localhost:4174")).toBe(true);
    expect(origemPermitida("http://localhost:9999", "http://localhost:4173", "http://localhost:4174")).toBe(false);
  });

  it("ignora qualquer mensagem que não seja um rascunho", () => {
    expect(lerRascunho(null)).toBeNull();
    expect(lerRascunho("texto")).toBeNull();
    expect(lerRascunho({ tipo: "outra-coisa", sections: {} })).toBeNull();
    expect(lerRascunho({ tipo: "landing-previa" })).toBeNull();
    expect(lerRascunho({ tipo: "landing-previa", sections: { HERO: {} }, images: {} })).not.toBeNull();
  });

  it("descarta imagem com endereço que escaparia do url() do CSS", () => {
    const r = lerRascunho({
      tipo: "landing-previa",
      sections: {},
      images: {
        boa: { url: "https://files.exemplo.com/a.jpg", alt: "a" },
        relativa: { url: "/marcela-files/b.webp", alt: "b" },
        js: { url: "javascript:alert(1)", alt: "" },
        css: { url: "https://x.com/a.jpg) ; background:red", alt: "" },
        aspas: { url: "https://x.com/a\".jpg", alt: "" },
      },
    });
    expect(Object.keys(r!.images).sort()).toEqual(["boa", "relativa"]);
  });

  it("a landing pública não escuta mensagens: o ouvinte só existe na rota de prévia em moldura", () => {
    const fonte = readFileSync(join(__dirname, "previa.ts"), "utf8");
    expect(fonte).toContain('window.parent !== window');
    expect(fonte).toContain('endsWith("/previa")');
    expect(fonte).toMatch(/if \(EM_PREVIA\) \{\s*window\.addEventListener\("message"/);
  });

  it("dentro da prévia o formulário de agendamento não envia", () => {
    const agendamento = readFileSync(join(__dirname, "../components/Appointment.tsx"), "utf8");
    const envio = agendamento.slice(agendamento.indexOf("const handleSubmit"), agendamento.indexOf("mutation.mutate("));
    expect(envio).toMatch(/if \(EM_PREVIA\) \{[\s\S]*return;/);
  });
});
