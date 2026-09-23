import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { effectivePermissions } from './permissions'
import { dashboardVisibility } from './dashboard-visibility'

const acesso = (role: Parameters<typeof effectivePermissions>[0]) =>
  dashboardVisibility({ role, permissions: effectivePermissions(role) })

describe('visibilidade da central do dia', () => {
  it('mostra finanças somente para quem opera ou supervisiona o caixa', () => {
    for (const role of ['ADMIN', 'DOCTOR', 'RECEPTION', 'FINANCE'] as const) {
      expect(acesso(role).financeiro).toBe(true)
    }
    for (const role of ['STAFF', 'ASSISTANT', 'CONTENT_EDITOR', 'PATIENT'] as const) {
      expect(acesso(role).financeiro).toBe(false)
    }
  })

  it('não confunde leitura de dashboard com assinatura clínica ou edição de leads', () => {
    expect(acesso('STAFF')).toMatchObject({
      agendamentos: true,
      confirmarAgendamentos: true,
      assinarReceitas: false,
      gerirLeads: true,
    })
    expect(acesso('FINANCE')).toMatchObject({
      confirmarAgendamentos: false,
      assinarReceitas: false,
      gerirLeads: false,
    })
    expect(acesso('DOCTOR').assinarReceitas).toBe(true)
  })

  it('não expõe agenda, pacientes ou caixa a uma concessão isolada de DASHBOARD_READ', () => {
    expect(dashboardVisibility({ role: 'CONTENT_EDITOR', permissions: ['DASHBOARD_READ'] })).toEqual({
      agendamentos: false,
      confirmarAgendamentos: false,
      assinarReceitas: false,
      gerirLeads: false,
      lerLeads: false,
      lerPacientes: false,
      financeiro: false,
    })
  })

  it('filtra campos sensíveis na resposta, não apenas nos cartões do navegador', () => {
    const rota = readFileSync(resolve(__dirname, '../routes/admin.ts'), 'utf8')
    expect(rota).toContain('mes: visibilidade.financeiro ?')
    expect(rota).toContain('hoje: visibilidade.agendamentos ?')
    expect(rota).toContain('proximos: visibilidade.agendamentos ?')
    expect(rota).toContain('receitasParaAssinar: visibilidade.assinarReceitas ?')
    expect(rota).toContain('aniversariantes: visibilidade.lerPacientes ?')
  })

  it('mantém a consulta concluída na fila do dia, para a etapa de cobrança', () => {
    const rota = readFileSync(resolve(__dirname, '../routes/admin.ts'), 'utf8')
    expect(rota).toContain("status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] }")
    expect(rota).toContain('fluxo: visibilidade.agendamentos ?')
  })

  it('só informa cobrança em aberto a quem opera ou supervisiona o caixa', () => {
    const rota = readFileSync(resolve(__dirname, '../routes/admin.ts'), 'utf8')
    expect(rota).toContain('cobrancasAbertas: visibilidade.financeiro')
    expect(rota).toContain('cobrancaAberta: visibilidade.financeiro ?')
    expect(rota).toContain('const devedoras = visibilidade.financeiro &&')
  })

  it('não devolve a consulta inteira na fila: contato e notas ficam de fora', () => {
    const rota = readFileSync(resolve(__dirname, '../routes/admin.ts'), 'utf8')
    expect(rota).not.toContain('hoje.map(comInicioEFim)')
    expect(rota).not.toContain('proximos.map(comInicioEFim)')
    const enxuto = rota.slice(rota.indexOf('const enxuto'), rota.indexOf('const naFila'))
    for (const campo of ['email', 'phone', 'message', 'notes']) {
      expect(enxuto).not.toContain(`${campo}:`)
    }
  })
})
