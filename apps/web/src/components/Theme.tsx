import { useLanding } from "@/hooks/useLanding";

/**
 * A paleta do site, vinda do painel.
 *
 * O CSS declara os tokens em `:root` com os valores de fábrica. Este componente
 * escreve uma segunda regra `:root` depois dela, e a cascata faz o resto: o que
 * a clínica editou vence, o que ela não tocou continua com o valor do CSS.
 *
 * Por que injetar uma folha em vez de mexer em `style` no elemento raiz: os
 * tokens são usados em `@media (prefers-color-scheme)` e em pseudo-elementos,
 * que um estilo inline no `<html>` alcança igual — mas a regra em folha aparece
 * nas ferramentas do navegador com o nome do arquivo, e depurar "de onde veio
 * este bronze" fica possível.
 *
 * Os valores são validados na API contra `^\d{1,3} \d{1,3}% \d{1,3}%$` antes de
 * serem gravados. Isso importa aqui: sem essa validação, um texto qualquer
 * gravado no banco viraria CSS arbitrário nesta página.
 */

interface ThemeContent {
  cream: string;
  creamDeep: string;
  espresso: string;
  bronze: string;
  bronzeLight: string;
  marbleVein: string;
}


/** Só passa adiante o que tem a forma de uma cor HSL — o resto o CSS resolve. */
const seguro = (valor: unknown) =>
  typeof valor === "string" && /^\d{1,3} \d{1,3}% \d{1,3}%$/.test(valor.trim())
    ? valor.trim()
    : null;

const Theme = () => {
  const { data } = useLanding();
  const gravado = data?.sections?.THEME?.content as ThemeContent | undefined;

  /* Sem paleta gravada nao escrevemos token nenhum, e o CSS fica com os valores
     dele. Aplicar o fallback aqui daria quase no mesmo — as cores sao as mesmas
     — mas nao exatamente: `--background` e `36 30% 94%` no CSS e o creme e
     `36 35% 96%`, e `--primary` e um marrom proprio. Escrever esses tokens numa
     clinica que nunca abriu a aba de cores mudaria o site sem ninguem ter
     pedido. Quem nunca personalizou continua exatamente como estava. */
  if (!gravado) return null;

  const content = gravado;

  const tokens: [string, unknown][] = [
    ["--cream", content.cream],
    ["--cream-deep", content.creamDeep],
    ["--espresso", content.espresso],
    ["--bronze", content.bronze],
    ["--bronze-light", content.bronzeLight],
    ["--marble-vein", content.marbleVein],
  ];

  const regras = tokens
    .map(([nome, valor]) => {
      const cor = seguro(valor);
      return cor ? `${nome}: ${cor};` : null;
    })
    .filter(Boolean)
    .join(" ");

  if (!regras) return null;

  /* O design system tem a sua propria copia da paleta, declarada em paralelo:
     `--background` e `36 30% 94%` e `--cream` e `36 35% 96%` — praticamente a
     mesma cor, escritas duas vezes. Sem ligar as duas, trocar a marca para
     verde pintava a marca dagua e deixava o fundo bege, porque o fundo vem de
     `--background`.

     O mapeamento segue o que cada par ja significa hoje, nao uma invencao:
     fundo e o creme, texto e a marca escura, o acento e o anel sao o bronze.
     `--primary` entra junto: eu o tinha deixado de fora achando que era so do
     shadcn, mas medindo no site ele aparece em seis das sete secoes — e a cor
     do titulo do hero (`text-primary`) e do botao Agendar (`bg-primary`). Sem
     ele, trocar a marca pintava o fundo e deixava titulo e botao marrons. */
  const derivados = [
    seguro(content.cream) ? `--background: ${seguro(content.cream)};` : "",
    seguro(content.cream) ? `--card: ${seguro(content.cream)};` : "",
    seguro(content.cream) ? `--popover: ${seguro(content.cream)};` : "",
    seguro(content.espresso) ? `--foreground: ${seguro(content.espresso)};` : "",
    seguro(content.espresso) ? `--primary: ${seguro(content.espresso)};` : "",
    seguro(content.cream) ? `--primary-foreground: ${seguro(content.cream)};` : "",
    seguro(content.cream) ? `--accent-foreground: ${seguro(content.cream)};` : "",
    seguro(content.espresso) ? `--secondary-foreground: ${seguro(content.espresso)};` : "",
    seguro(content.espresso) ? `--card-foreground: ${seguro(content.espresso)};` : "",
    seguro(content.espresso) ? `--popover-foreground: ${seguro(content.espresso)};` : "",
    seguro(content.creamDeep) ? `--secondary: ${seguro(content.creamDeep)};` : "",
    seguro(content.bronze) ? `--accent: ${seguro(content.bronze)};` : "",
    seguro(content.bronze) ? `--ring: ${seguro(content.bronze)};` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <style>{`:root { ${regras} ${derivados} }`}</style>;
};

export default Theme;
