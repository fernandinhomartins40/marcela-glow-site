import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/* Travas da fronteira nativa. Testes de código-fonte de propósito: o que se
   protege é que nenhuma tela nova volte a supor "estou no navegador, no mesmo
   domínio da API" — e isso só aparece no app de loja, longe dos testes. */

const src = __dirname

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })
}

const fontes = arquivos(src).map((caminho) => ({
  nome: relative(src, caminho).replace(/\\/g, '/'),
  texto: readFileSync(caminho, 'utf8'),
}))

const foraDaFronteira = fontes.filter((f) => f.nome !== 'lib/nativo.ts')

function quemUsa(padrao: RegExp, lista = fontes) {
  return lista.filter((f) => padrao.test(f.texto)).map((f) => f.nome)
}

describe('fronteira nativa: uso no portal', () => {
  it('nenhum window.open fora de lib/nativo.ts (no app, abrirExterno usa o navegador do sistema)', () => {
    expect(quemUsa(/window\.open\(/, foraDaFronteira)).toEqual([])
  })

  it("nenhum fetch('/api' relativo (no app a página vem de https://localhost)", () => {
    expect(quemUsa(/fetch\(\s*[`'"]\/api/)).toEqual([])
  })

  it('o token só é gravado e apagado por guardarSessao/esquecerSessao', () => {
    expect(quemUsa(/localStorage\.(setItem|removeItem)\(\s*TOKEN_KEY/, foraDaFronteira)).toEqual([])
  })

  it('a varredura enxerga os arquivos que as travas protegem', () => {
    // Sem isto, um caminho errado faria as três travas passarem sobre uma lista vazia.
    const nomes = fontes.map((f) => f.nome)
    expect(nomes).toEqual(expect.arrayContaining(['lib/nativo.ts', 'lib/api.ts', 'pages/Login.tsx', 'components/sections.tsx', 'components/Splash.tsx']))
  })
})
