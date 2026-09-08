import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { rolePermissions, effectivePermissions } from './permissions'

/**
 * O contrato dos níveis de acesso.
 *
 * A auditoria encontrou o mesmo defeito em três lugares: o papel dizia uma
 * coisa e o sistema fazia outra. Os seeds gravavam doze permissões por cima do
 * papel STAFF — entre elas o prontuário —, a dica na tela prometia "leitura das
 * fichas", e o menu do painel exigia permissões que a API não exige.
 *
 * O papel é a única fonte de verdade. Override existe para a exceção de uma
 * pessoa, decidida na tela de equipe; um seed que redefine um papel inteiro
 * torna o mapa decorativo — foi assim que a "Equipe" leu prontuário sem que
 * nada no código dissesse isso.
 */

const raiz = join(__dirname, '..', '..', '..', '..')
const ler = (p: string) => readFileSync(join(raiz, p), 'utf8')

describe('o papel é a fonte de verdade, não o seed', () => {
  it('nenhum seed grava permissão por cima de um papel', () => {
    /* Ambos os seeds criavam UserPermission para o STAFF. Quem lesse
       `rolePermissions` veria 6 permissões; o token trazia 12. */
    for (const seed of ['apps/api/scripts/seed-demo-users.js', 'packages/database/src/seed.ts']) {
      expect(ler(seed), seed).not.toMatch(/userPermission\.(upsert|create)/)
    }
  })

  it('a equipe não alcança o prontuário', () => {
    /* O nome "Equipe" é genérico e convida a afrouxar. Prontuário é da médica
       e de quem ela autorizar caso a caso, não de um papel inteiro. */
    for (const p of ['RECORD_READ', 'RECORD_WRITE'] as const) {
      expect(rolePermissions.STAFF).not.toContain(p)
      expect(rolePermissions.RECEPTION).not.toContain(p)
      expect(rolePermissions.FINANCE).not.toContain(p)
      expect(rolePermissions.CONTENT_EDITOR).not.toContain(p)
    }
  })

  it('quem não é da clínica não vê paciente', () => {
    expect(rolePermissions.CONTENT_EDITOR).not.toContain('PATIENT_READ')
    expect(rolePermissions.PATIENT).toHaveLength(0)
  })

  it('operar e supervisionar o caixa são papéis distintos', () => {
    // A recepção recebe no balcão; não aprova o próprio fechamento.
    expect(rolePermissions.RECEPTION).toContain('FINANCE_OPERATE')
    expect(rolePermissions.RECEPTION).not.toContain('FINANCE_MANAGE')
    // A médica supervisiona sem operar.
    expect(rolePermissions.DOCTOR).toContain('FINANCE_MANAGE')
    expect(rolePermissions.DOCTOR).not.toContain('FINANCE_OPERATE')
  })

  it('só a administradora gerencia a equipe', () => {
    for (const [papel, permissoes] of Object.entries(rolePermissions)) {
      if (papel === 'ADMIN') continue
      expect(permissoes, papel).not.toContain('USER_MANAGE')
      expect(permissoes, papel).not.toContain('AUDIT_READ')
    }
  })

  it('override soma ao papel, não o substitui', () => {
    const efetivas = effectivePermissions('STAFF', ['RECORD_READ'])
    expect(efetivas).toContain('RECORD_READ')
    expect(efetivas).toEqual(expect.arrayContaining(rolePermissions.STAFF))
  })
})

describe('o menu do painel pede o mesmo que a API', () => {
  /* Um item que exige mais que a rota some para quem poderia usá-lo; um que
     exige menos aparece e devolve 403 ao clicar. Os dois já aconteceram:
     "Cadastros" pedia SETTINGS_WRITE para abrir uma rota de RECORD_WRITE, e
     "Recepção" pedia APPOINTMENT_WRITE, que a médica também tem. */
  const navegacao = ler('apps/admin/src/AdminApp.tsx')

  it('Cadastros exige o que /clinical/catalog exige', () => {
    expect(navegacao).toContain(`'Procedimentos, medicamentos, exames e modelos', 'RECORD_WRITE'`)
    expect(ler('apps/api/src/routes/clinical.ts')).toContain(
      `router.post('/catalog', ...staffOnly, requirePermission('RECORD_WRITE')`,
    )
  })

  it('Recepção é de quem trabalha no balcão', () => {
    expect(navegacao).toContain(`'Chegadas, confirmações e encaixes do dia', 'FINANCE_OPERATE'`)
  })

  it('toda permissão citada no menu existe de verdade', () => {
    /* Uma permissão inventada no menu esconde o item para sempre, sem erro
       nenhum — some silenciosamente para todo mundo menos a ADMIN. */
    const declaradas = new Set(Object.values(rolePermissions).flat())
    const citadas = navegacao
      .matchAll(/'([A-Z_]+(?:\|[A-Z_]+)*)'\],/g)
    for (const [, grupo] of citadas) {
      for (const p of grupo.split('|')) {
        expect(declaradas, `permissao ${p} citada no menu`).toContain(p)
      }
    }
  })
})

describe('a tela descreve o papel que existe', () => {
  it('nenhuma dica promete acesso que o papel não dá', () => {
    const ui = ler('apps/admin/src/lib/ui.tsx')
    const dica = ui.match(/STAFF: '([^']+)'/)?.[1] ?? ''
    expect(dica).not.toMatch(/ficha|prontuário/i)
  })
})
