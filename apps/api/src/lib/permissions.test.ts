import { describe, expect, it } from 'vitest'
import { effectivePermissions, rolePermissions } from './permissions'

/**
 * Permissão é o que separa a recepção do prontuário. Um papel que ganha acesso
 * demais numa refatoração não quebra nada visível — só expõe dado clínico em
 * silêncio, que é exatamente o tipo de falha que teste pega e revisão não.
 */
describe('rolePermissions', () => {
  it('mantém prontuário fora do alcance de quem não atende', () => {
    for (const role of ['RECEPTION', 'FINANCE', 'CONTENT_EDITOR'] as const) {
      expect(rolePermissions[role]).not.toContain('RECORD_READ')
      expect(rolePermissions[role]).not.toContain('RECORD_WRITE')
    }
  })

  it('reserva a assinatura de receita a quem tem registro profissional', () => {
    const podemAssinar = Object.entries(rolePermissions)
      .filter(([, permissoes]) => permissoes.includes('PRESCRIPTION_SIGN'))
      .map(([papel]) => papel)

    expect(podemAssinar.sort()).toEqual(['ADMIN', 'DOCTOR'])
  })

  it('não dá gestão de usuários a ninguém além do administrador', () => {
    const podemGerir = Object.entries(rolePermissions)
      .filter(([, permissoes]) => permissoes.includes('USER_MANAGE'))
      .map(([papel]) => papel)

    expect(podemGerir).toEqual(['ADMIN'])
  })

  it('não concede permissão nenhuma a paciente pelo papel', () => {
    // O acesso da paciente ao próprio dado passa por outra porta (requirePatient),
    // nunca pelo RBAC da equipe.
    expect(rolePermissions.PATIENT).toEqual([])
  })
})

describe('effectivePermissions', () => {
  it('soma a concessão individual ao papel', () => {
    const resultado = effectivePermissions('ASSISTANT', ['LEAD_READ'])

    expect(resultado).toContain('LEAD_READ')
    expect(resultado).toContain('PATIENT_READ')
  })

  it('não duplica quando a concessão repete o que o papel já dá', () => {
    const resultado = effectivePermissions('DOCTOR', ['PATIENT_READ'])

    expect(resultado.filter((p) => p === 'PATIENT_READ')).toHaveLength(1)
  })

  it('devolve lista vazia para papel desconhecido em vez de quebrar', () => {
    // Papel vindo de token antigo depois de renomear um enum não pode virar
    // exceção no meio da autenticação.
    expect(effectivePermissions('INEXISTENTE' as never)).toEqual([])
  })
})
