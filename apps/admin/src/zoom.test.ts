import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * No iPhone, focar um campo com fonte abaixo de 16px amplia a tela e ela não
 * volta sozinha. Os campos do painel têm 13–14px, e as páginas abertas por cima
 * focam o primeiro campo ao abrir: "Editar documento" ampliava o app na hora
 * (relatado no iPhone em 23/11/2026). A trava é o `maximum-scale=1` posto pelo
 * modo aplicativo — e só nele: no navegador o zoom é acessibilidade.
 */
const standalone = readFileSync(join(__dirname, 'lib/standalone.ts'), 'utf8')
const html = readFileSync(join(__dirname, '../index.html'), 'utf8')

describe('zoom ao focar campo no app', () => {
  it('o modo aplicativo desliga o zoom pela meta viewport', () => {
    const corpo = standalone.slice(standalone.indexOf('export function marcarDocumentoComoAplicativo'))
    expect(corpo).toMatch(/meta\[name="viewport"\]/)
    expect(corpo).toMatch(/maximum-scale=1/)
  })

  it('a página servida no navegador continua deixando ampliar', () => {
    const meta = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1]
    expect(meta).toBeTruthy()
    expect(meta).not.toMatch(/maximum-scale|user-scalable/)
  })
})

describe('barra de status no app', () => {
  // Sem a faixa, o conteúdo rolava por baixo do relógio (auditoria no simulador, 23/11/2026).
  it('o modo aplicativo cobre a área da barra de status', () => {
    const css = readFileSync(join(__dirname, 'styles.css'), 'utf8')
    const regra = css.slice(css.indexOf('html.modo-aplicativo body::before'))
    expect(regra.indexOf('{')).toBeGreaterThan(0)
    const corpo = regra.slice(0, regra.indexOf('}'))
    expect(corpo).toMatch(/position:\s*fixed/)
    expect(corpo).toMatch(/height:\s*env\(safe-area-inset-top\)/)
  })
})
