import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * O que quebra dentro da casca nativa passa por `lib/nativo.ts`. Estes testes
 * de código-fonte guardam a fronteira: quem acrescentar uma tela não reabre,
 * sem perceber, um caminho que só funciona servido do mesmo domínio da API.
 */
function fontes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name)
    if (e.isDirectory()) return fontes(caminho)
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [caminho] : []
  })
}

const arquivos = fontes(__dirname)
  .map((caminho) => ({ nome: relative(__dirname, caminho).split(sep).join('/'), texto: readFileSync(caminho, 'utf8') }))
  .filter(({ nome }) => nome !== 'lib/nativo.ts')

const quemUsa = (padrao: RegExp) => arquivos.filter(({ texto }) => padrao.test(texto)).map(({ nome }) => nome)

describe('fronteira com a casca nativa', () => {
  it('encontra os arquivos do painel', () => {
    // Sem isto, um caminho errado faria os testes abaixo passarem sobre nada.
    expect(arquivos.length).toBeGreaterThan(30)
  })

  it('link externo abre por abrirExterno, não por window.open', () => {
    expect(quemUsa(/window\.open\(/)).toEqual([])
  })

  it('nenhum fetch para /api relativo', () => {
    // Na casca a origem é a do app; a base da API vem de `VITE_API_URL`.
    // `lib/manifesto.ts` monta `/api` numa variável: não roda no nativo (ver `main.tsx`).
    expect(quemUsa(/fetch\(\s*[`'"]\/api/)).toEqual([])
  })

  it('o token é gravado e apagado por guardarSessao/esquecerSessao', () => {
    expect(quemUsa(/localStorage\.(setItem|removeItem)\(\s*TOKEN_KEY/)).toEqual([])
  })
})
