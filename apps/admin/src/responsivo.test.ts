import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Três defeitos de celular achados em 23/09/2026, medindo no navegador com
 * dados reais. Nenhum aparecia lendo o componente: todos vinham de regra
 * global do CSS pegando onde não devia. Estes testes guardam a regra, não o
 * pixel — o pixel se confere no navegador.
 */
const css = readFileSync(join(__dirname, 'styles.css'), 'utf8')
const regra = (seletor: string) => {
  const inicio = css.indexOf(`${seletor} {`)
  return inicio < 0 ? '' : css.slice(inicio, css.indexOf('}', inicio))
}

describe('responsividade do painel', () => {
  it('o nome da linha de dados não é espremido pelas etiquetas', () => {
    /* Sem quebra, as etiquetas (que não encolhem) reduziam o nome a uma
       coluna de uma letra: "F/e/r/n/a/n/d/a" na Recepção em 375px. */
    expect(regra('.data-text strong')).toMatch(/flex-wrap:\s*wrap/)
  })

  it('no celular só o cabeçalho da página empilha', () => {
    /* `header` solto pegava o <header> de cada cartão e punha o contador
       embaixo do título. */
    expect(css).toContain('main > header { align-items: flex-start; flex-direction: column; }')
    expect(css).not.toMatch(/\n\s+header \{ align-items: flex-start; flex-direction: column; \}/)
  })

  it('a gaveta fechada não projeta sombra na borda da tela', () => {
    const mobile = css.slice(css.indexOf('transform: translateX(-100%);'))
    expect(mobile.slice(0, 400)).toMatch(/box-shadow:\s*none/)
    expect(css).toContain('.nav-open .app-nav { transform: translateX(0); box-shadow:')
  })

  it('grade dentro de botão desfaz a centralização do botão base', () => {
    /* O `button` base centraliza; em `display: grid` isso centralizava as
       trilhas e o texto ficava no meio do cartão. */
    expect(regra('.queue-card')).toMatch(/justify-content:\s*stretch/)
    expect(regra('.event')).toMatch(/justify-content:\s*stretch/)
  })
})
