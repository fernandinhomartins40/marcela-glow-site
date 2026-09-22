import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientBase | undefined
}

type PrismaClientBase = PrismaClient

const base: PrismaClientBase =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base

/**
 * Cliente de autenticacao: o unico que devolve `passwordHash`.
 *
 * So o login precisa do hash, para o `bcrypt.compare`. Use este cliente
 * apenas nesses pontos e nunca devolva o resultado direto numa resposta.
 */
export const prismaAuth = base

/**
 * Cliente padrao da aplicacao: nao devolve `passwordHash` em consulta alguma.
 *
 * Medido em producao em 22/09/2026: `/api/admin/patients`,
 * `/api/admin/patients/:id`, `/api/admin/users` e `/api/patient/me`
 * devolviam o hash bcrypt no JSON — o de usuarios entregava o de toda a
 * equipe a qualquer pessoa logada no painel.
 *
 * A causa nao era uma rota: era `include` sem `select`, que traz a tabela
 * inteira, somado a `res.json(registro)`. Corrigir rota a rota deixaria a
 * proxima nascer com o mesmo defeito, entao o campo sai aqui, na saida de
 * qualquer consulta. Escrita (`create`/`update`) nao e afetada.
 */
export const prisma = base.$extends({
  result: {
    user: {
      passwordHash: { needs: {}, compute: () => undefined },
    },
    patient: {
      passwordHash: { needs: {}, compute: () => undefined },
    },
  },
})

export * from '@prisma/client'
