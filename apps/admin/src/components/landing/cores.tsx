import React from 'react'

/**
 * Editor da paleta do site.
 *
 * O site guarda as cores como `"28 22% 55%"` — matiz, saturação e luminosidade
 * soltos, sem `hsl()` em volta, para o CSS poder compô-las com opacidade
 * (`hsl(var(--bronze) / .5)`). Já o seletor de cor do navegador só fala
 * hexadecimal. As duas conversões abaixo existem por causa dessa diferença, e
 * ficam aqui em vez de na API para o valor gravado continuar sendo o que o CSS
 * espera, sem tradução no meio do caminho.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Conversões
// ─────────────────────────────────────────────────────────────────────────────

export function hslParaHex(hsl: string): string {
  const [h, s, l] = hsl.split(/[ %]+/).map(Number)
  if ([h, s, l].some((n) => Number.isNaN(n))) return '#000000'

  const sat = s / 100
  const lum = l / 100
  const c = (1 - Math.abs(2 * lum - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lum - c / 2

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x]

  const byte = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0')

  return `#${byte(r)}${byte(g)}${byte(b)}`
}

export function hexParaHsl(hex: string): string {
  const limpo = hex.replace('#', '')
  const r = parseInt(limpo.slice(0, 2), 16) / 255
  const g = parseInt(limpo.slice(2, 4), 16) / 255
  const b = parseInt(limpo.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    h =
      max === r ? ((g - b) / d) % 6
      : max === g ? (b - r) / d + 2
      : (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// ─────────────────────────────────────────────────────────────────────────────
// Campos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * As seis cores que a clínica realmente decide.
 *
 * O CSS declara dezenas de tokens, mas quase todos derivam destes por
 * opacidade. Expor a lista inteira transformaria a tela num painel de designer;
 * a decisão de verdade é "a marca deixou de ser bronze".
 */
export const CORES: { campo: string; nome: string; onde: string }[] = [
  { campo: 'espresso', nome: 'Marrom escuro', onde: 'Títulos, botões principais e o fundo do rodapé.' },
  { campo: 'bronze', nome: 'Bronze', onde: 'Os detalhes: linhas, ícones e as palavras em destaque.' },
  { campo: 'bronzeLight', nome: 'Bronze claro', onde: 'Bordas e textos secundários sobre fundo escuro.' },
  { campo: 'cream', nome: 'Creme', onde: 'O fundo claro da maior parte da página.' },
  { campo: 'creamDeep', nome: 'Creme escuro', onde: 'O fundo das faixas alternadas, um tom abaixo do creme.' },
  { campo: 'marbleVein', nome: 'Veio do mármore', onde: 'A textura de fundo da primeira tela.' },
]

/**
 * A cor nova, ou a antiga quando as duas pintam o mesmo pixel.
 *
 * A ida e volta por hexadecimal perde precisão: `36 35% 96%` vira `#f8f6f1` e
 * volta como `43 33% 96%`. São a mesma cor na tela — 8 bits por canal não
 * distinguem 36° de 43° nessa luminosidade — mas o texto muda, e sem isto abrir
 * a aba e clicar em qualquer seletor marcaria a página como alterada e gravaria
 * seis valores diferentes sem nada ter mudado de fato.
 */
function preservando(antigo: string, novo: string) {
  return hslParaHex(antigo) === hslParaHex(novo) ? antigo : novo
}

export function ColorField({
  nome,
  onde,
  valor,
  onChange,
}: {
  nome: string
  onde: string
  valor: string
  onChange: (hsl: string) => void
}) {
  const hex = hslParaHex(valor)
  const id = React.useId()
  const mudar = (hexNovo: string) => onChange(preservando(valor, hexParaHsl(hexNovo)))

  return (
    <div className="cms-cor">
      <input
        id={id}
        type="color"
        value={hex}
        onChange={(e) => mudar(e.target.value)}
        aria-label={`Cor: ${nome}`}
      />
      <label htmlFor={id}>
        <strong>{nome}</strong>
        <span>{onde}</span>
      </label>
      {/* O valor cru fica visível e editável: quem recebeu a paleta do
          designer tem o código na mão e não quer caçá-lo no seletor. */}
      <input
        className="cms-cor-valor"
        value={hex}
        onChange={(e) => {
          const v = e.target.value.trim()
          if (/^#[0-9a-f]{6}$/i.test(v)) mudar(v)
        }}
        aria-label={`Código da cor: ${nome}`}
        spellCheck={false}
      />
    </div>
  )
}
