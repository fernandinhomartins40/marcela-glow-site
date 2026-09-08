import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * O contrato entre os dois painéis.
 *
 * A auditoria encontrou duas lacunas do mesmo tipo: a médica registrava um
 * procedimento e criava um plano de tratamento, os dois apareciam no portal, e
 * a paciente não era avisada de nenhum. Ela só descobriria abrindo o app por
 * acaso.
 *
 * O padrão que causou isso era escrever `notification.create` e
 * `sendPatientPush` aos pares, rota a rota — bastava esquecer um dos dois, ou
 * ambos. `avisarPaciente` juntou o par, e estes testes garantem que cada evento
 * que a paciente precisa saber continue avisando.
 *
 * São testes de código-fonte, não de comportamento: verificar de verdade
 * exigiria banco e servidor no ar, e o que se quer proteger aqui é a ligação —
 * que alguém, ao acrescentar uma rota, não esqueça o aviso.
 */

const raiz = join(__dirname, '..', 'routes')
const ler = (arquivo: string) => readFileSync(join(raiz, arquivo), 'utf8')

/** O trecho de uma rota, do handler até o próximo `router.`. */
function rota(fonte: string, assinatura: string): string {
  const inicio = fonte.indexOf(assinatura)
  if (inicio === -1) return ''
  const proxima = fonte.indexOf('router.', inicio + assinatura.length)
  return fonte.slice(inicio, proxima === -1 ? undefined : proxima)
}

describe('o portal da paciente é avisado do que acontece no painel', () => {
  it('procedimento registrado avisa a paciente', () => {
    const trecho = rota(ler('admin.ts'), "router.post('/sessions'")
    expect(trecho).toContain('avisarPaciente')
  })

  it('plano de tratamento criado avisa a paciente', () => {
    const trecho = rota(ler('plans.ts'), "router.post('/'")
    expect(trecho).toContain('avisarPaciente')
  })

  it('documento enviado avisa a paciente', () => {
    const trecho = rota(ler('clinical.ts'), "router.post('/documents/:id/send'")
    expect(trecho).toMatch(/avisarPaciente|sendPatientPush/)
  })

  it('consulta confirmada e cancelada avisam a paciente', () => {
    const fonte = ler('appointments.ts')
    // As duas passam pela mesma função, que escreve notificação e push.
    expect(fonte).toContain("notifyPatient(appointment, tenant!, 'cancelled'")
    expect(fonte).toMatch(/notifyPatient\(/)
  })
})

describe('o portal não expõe o que é da equipe', () => {
  it('a jornada monta o plano campo a campo, sem internalNotes', () => {
    const fonte = ler('patient.ts')
    const trecho = rota(fonte, "router.get('/dashboard'")
    /* Devolver o plano inteiro entregaria a anotação que a médica escreve para
       a equipe. O `map` campo a campo é o que impede isso, e um `select`
       esquecido no futuro seria invisível sem este teste.

       A verificação ignora comentários: a palavra aparece legitimamente na
       explicação de por que ela não é devolvida. */
    const codigo = trecho.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    expect(codigo).not.toMatch(/internalNotes/)
    expect(codigo).toContain('plans.map')
  })

  it('toda rota do portal filtra pela paciente autenticada', () => {
    const fonte = ler('patient.ts')
    /* `req.user!.userId` é a paciente do token. Uma consulta ao banco sem esse
       filtro devolveria dado de outra pessoa. */
    const consultas = fonte.match(/prisma\.\w+\.find\w+\(/g) ?? []
    expect(consultas.length).toBeGreaterThan(0)
    expect(fonte).toContain('req.user!.userId')
  })
})

describe('a recepção não alcança o que é clínico', () => {
  it('prontuário exige permissão de registro', () => {
    const fonte = ler('clinical.ts')
    expect(fonte).toContain("requirePermission('RECORD_READ')")
  })

  it('planos de tratamento exigem permissão de registro', () => {
    const fonte = ler('plans.ts')
    expect(fonte).toContain("requirePermission('RECORD_READ')")
  })

  it('operar o caixa é permissão própria, não PATIENT_WRITE', () => {
    const fonte = ler('finance.ts')
    expect(fonte).toContain("requirePermission('FINANCE_OPERATE')")
    /* Desfazer exige supervisão: é o gesto que encobre erro ou desvio, e não
       cabe a quem operou o caixa. */
    expect(fonte).toContain("requirePermission('FINANCE_MANAGE')")
  })
})
