import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * O contrato de que o hash de senha nao sai da API.
 *
 * Medido em producao em 22/09/2026, com o site ja publico: quatro respostas
 * devolviam `passwordHash` no JSON — `/api/admin/patients`,
 * `/api/admin/patients/:id`, `/api/patient/me` e, a pior, `/api/admin/users`,
 * que entregava o hash bcrypt de toda a equipe a qualquer pessoa logada no
 * painel.
 *
 * A causa nao era uma rota distraida: era `include` sem `select`, que traz a
 * tabela inteira, somado a `res.json(registro)`. Corrigir caso a caso deixaria
 * a proxima rota nascer com o mesmo defeito, entao o campo passou a ser
 * removido na saida do cliente Prisma (`packages/database/src/index.ts`).
 *
 * O login precisa do hash para o `bcrypt.compare`, e para isso existe
 * `prismaAuth`. Sao so tres pontos, e e justamente por serem excecao que
 * precisam de guarda: trocar `prismaAuth` por `prisma` num deles nao quebra o
 * typecheck, nao quebra nenhum teste de comportamento — e derruba o login de
 * todo mundo em producao, ou pior, no caso da ativacao de conta, deixa
 * sobrescrever a senha de quem so teve o e-mail descoberto.
 *
 * Sao testes de codigo-fonte de proposito, como os de `sincronia.test.ts`:
 * protegem a ligacao, nao o comportamento em execucao.
 */

const rotas = join(__dirname, '..', 'routes')
const ler = (caminho: string) => readFileSync(caminho, 'utf8')
const lerRota = (arquivo: string) => ler(join(rotas, arquivo))

const cliente = ler(join(__dirname, '..', '..', '..', '..', 'packages', 'database', 'src', 'index.ts'))
const dockerfile = ler(join(__dirname, '..', '..', 'Dockerfile'))

describe('o cliente Prisma nao devolve passwordHash', () => {
  it('remove o campo de User e de Patient na saida', () => {
    expect(cliente).toMatch(/\$extends/)
    // Os dois modelos com senha: faltar um deixa metade do vazamento aberta.
    expect(cliente).toMatch(/user:\s*\{[^}]*passwordHash/s)
    expect(cliente).toMatch(/patient:\s*\{[^}]*passwordHash/s)
  })

  it('expoe prismaAuth para quem precisa do hash', () => {
    expect(cliente).toMatch(/export const prismaAuth/)
  })

  it('o `prisma` exportado e o estendido, nao o cru', () => {
    // Exportar o cliente base como `prisma` reabriria o vazamento inteiro sem
    // mudar uma linha de rota.
    expect(cliente).toMatch(/export const prisma\s*=\s*base\.\$extends/)
  })
})

describe('o wrapper da imagem de producao acompanha o pacote', () => {
  /**
   * O Dockerfile reescreve `@marcela/database` como CommonJS dentro da imagem,
   * entao ele — nao o TypeScript — e o que roda em producao. Foi assim que um
   * teste local passou enquanto o deploy quebrava, em 08/09/2026.
   */
  it('aplica a mesma omissao', () => {
    expect(dockerfile).toMatch(/\$extends/)
    expect(dockerfile).toMatch(/passwordHash/)
  })

  it('exporta prismaAuth, sem o que o login quebra na imagem', () => {
    expect(dockerfile).toMatch(/prismaAuth/)
  })
})

describe('so a autenticacao usa prismaAuth', () => {
  it('o login da equipe le o hash pelo cliente de auth', () => {
    const auth = lerRota('auth.ts')
    expect(auth).toMatch(/prismaAuth\.user\.findUnique/)
  })

  it('o login da paciente e a ativacao de conta tambem', () => {
    const paciente = lerRota('patient.ts')
    // Dois pontos: o login e a checagem de conta ja ativada. A segunda decide
    // por `existing?.passwordHash`, que com o cliente comum seria sempre
    // undefined — e a senha de uma conta existente seria sobrescrita.
    expect(paciente.match(/prismaAuth\.patient\.findUnique/g)?.length).toBe(2)
  })

  it('nenhuma outra rota importa prismaAuth', () => {
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    const comAuth = readdirSync(rotas)
      .filter((f: string) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .filter((f: string) => /\bprismaAuth\b/.test(lerRota(f)))
      .sort()
    // Ampliar esta lista e uma decisao consciente: cada arquivo aqui pode ler
    // hash de senha, e precisa provar que nao o devolve numa resposta.
    expect(comAuth).toEqual(['auth.ts', 'patient.ts'])
  })
})

describe('as rotas nao devolvem o registro cru onde havia vazamento', () => {
  it('a resposta do login monta os campos um a um', () => {
    const auth = lerRota('auth.ts')
    // `res.json(user)` devolveria o hash que prismaAuth acabou de ler.
    expect(auth).not.toMatch(/res\.json\(\s*user\s*\)/)
    expect(auth).toMatch(/user:\s*\{\s*id:/)
  })

  it('o login da paciente idem', () => {
    const paciente = lerRota('patient.ts')
    expect(paciente).toMatch(/patient:\s*\{\s*id:/)
  })

  it('o registro lido por prismaAuth nunca vai inteiro para a resposta', () => {
    /**
     * Esta e a regra que importa. `res.json(patient)` existe em `/me` e e
     * seguro, porque ali o registro vem do `prisma` comum, que omite o hash.
     * O perigo e o trecho entre um `prismaAuth.*.findUnique` e o `res.json`
     * seguinte: ali o objeto TEM o hash, e devolve-lo cru republica o
     * vazamento.
     */
    for (const arquivo of ['auth.ts', 'patient.ts']) {
      const fonte = lerRota(arquivo)
      const re = /prismaAuth\.(user|patient)\.findUnique/g
      let m: RegExpExecArray | null
      while ((m = re.exec(fonte))) {
        const modelo = m[1]
        const trecho = fonte.slice(m.index, m.index + 1800)
        const ateProximaLeitura = trecho.split(/prismaAuth\.(?:user|patient)\.findUnique/)[1] ?? trecho
        expect(
          ateProximaLeitura,
          `${arquivo}: registro de ${modelo} lido com o hash e devolvido cru`,
        ).not.toMatch(new RegExp(`res\\.json\\(\\s*${modelo}\\s*\\)`))
      }
    }
  })
})
