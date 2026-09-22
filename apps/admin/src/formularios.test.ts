import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * O contrato dos formularios do painel.
 *
 * O `Modal` aceita `onSubmit`, e ai o corpo vira `<form>` para que **Enter num
 * campo envie** — antes era preciso alcancar o botao com o mouse em todo
 * cadastro.
 *
 * O risco que vem com isso e silencioso: **no HTML, botao sem `type` dentro de
 * um form e `submit`**. Num Modal com `onSubmit`, um "Cancelar" sem
 * `type="button"` cadastra em vez de fechar, e um `SubmitButton` que mantenha
 * o `onClick` dispara a mutacao duas vezes — uma paciente em duplicidade, ou
 * dois lancamentos no caixa. Nada disso quebra typecheck nem aparece na tela
 * de quem testa com o mouse.
 *
 * Testes de codigo-fonte, como `navegacao.test.ts` e `sincronia.test.ts`:
 * protegem a ligacao, nao o comportamento em execucao.
 */

const raiz = join(__dirname, 'components')
const ui = readFileSync(join(__dirname, 'lib', 'ui.tsx'), 'utf8')

/** Arquivos .tsx de components/, incluindo subpastas. */
function fontes(dir = raiz): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name)
    if (e.isDirectory()) return fontes(caminho)
    return e.name.endsWith('.tsx') ? [caminho] : []
  })
}

describe('o Modal envia por Enter quando pedido', () => {
  it('aceita onSubmit e envolve o conteudo num form', () => {
    expect(ui).toMatch(/onSubmit\?:\s*\(\)\s*=>\s*void/)
    expect(ui).toMatch(/<form[\s\S]*?className="page-view-form"/)
    // preventDefault: sem ele o navegador recarrega a pagina e o cadastro se perde
    expect(ui).toMatch(/e\.preventDefault\(\)/)
  })

  it('sem onSubmit a estrutura antiga fica intacta', () => {
    // Os 23 rodapes que ja existiam tem botao com onClick proprio; envolver
    // todos de uma vez mudaria tela que ninguem revisou.
    expect(ui).toMatch(/onSubmit \?/)
  })
})

describe('SubmitButton nao envia duas vezes', () => {
  it('o padrao e type="button", nao submit', () => {
    // Se o padrao fosse submit, todo SubmitButton ja existente dentro de um
    // form novo passaria a disparar onClick E onSubmit.
    expect(ui).toMatch(/type = 'button'/)
    expect(ui).toMatch(/<button className="primary" type=\{type\}/)
  })
})

describe('em Modal com onSubmit, todo botao do rodape declara type', () => {
  it('nenhum botao sem type e nenhum SubmitButton com onClick', () => {
    const problemas: string[] = []

    for (const arquivo of fontes()) {
      const src = readFileSync(arquivo, 'utf8')
      if (!/onSubmit=\{/.test(src)) continue

      // Recorta cada rodape: e ali que os botoes convivem com o form.
      for (const m of src.matchAll(/footer=\{([\s\S]*?)\n\s{6}\}/g)) {
        const rodape = m[1]
        const linha = src.slice(0, m.index).split('\n').length
        const local = `${arquivo.split(/[\\/]/).pop()}:${linha}`

        for (const btn of rodape.matchAll(/<button(?![\w-])([^>]*)>/g)) {
          if (!/type=/.test(btn[1])) problemas.push(`${local} <button> sem type`)
        }
        for (const sb of rodape.matchAll(/<SubmitButton([\s\S]*?)>/g)) {
          if (/onClick=/.test(sb[1])) {
            problemas.push(`${local} SubmitButton com onClick dentro de form (envia duas vezes)`)
          }
          if (!/type=/.test(sb[1])) {
            problemas.push(`${local} SubmitButton sem type="submit" (Enter nao envia)`)
          }
        }
      }
    }

    expect(problemas).toEqual([])
  })
})

describe('campos de formulario tem rotulo', () => {
  /**
   * Medido em 22/09/2026: 176 campos usam `<Field>`, que renderiza `<label>` em
   * volta, 22 usam `<label>` direto e o resto tem `aria-label`. A auditoria
   * havia contado `htmlFor` e concluido que faltavam rotulos em massa — metrica
   * errada num projeto que associa por aninhamento.
   *
   * Este teste guarda o `Field`, que e de onde vem a maior parte dos rotulos:
   * se alguem trocar o `<label>` por `<div>`, 176 campos perdem o rotulo de uma
   * vez e nada acusa.
   */
  it('Field envolve o campo num label', () => {
    expect(ui).toMatch(/<label className="field">/)
    expect(ui).toMatch(/\{children\}/)
  })

  it('SearchBox usa o placeholder como aria-label', () => {
    // O placeholder desaparece ao digitar e nao e anunciado como rotulo.
    expect(ui).toMatch(/aria-label=\{placeholder\}/)
  })
})
