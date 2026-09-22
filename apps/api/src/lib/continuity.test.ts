import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contrato da passagem site -> portal.
 *
 * Uma solicitação pública nasce sem `patientId` quando a pessoa ainda não tem
 * conta. Sem o vínculo na ativação, ela criava acesso e encontrava o portal
 * vazio, enquanto a recepção precisava ligar manualmente os mesmos dados.
 */
const raiz = join(__dirname, '..', '..', '..', '..')
const fonte = readFileSync(join(raiz, 'apps/api/src/routes/patient.ts'), 'utf8')

describe('continuidade entre solicitação pública e portal', () => {
  it('vincula pedidos pendentes sem paciente ao criar ou ativar acesso', () => {
    const registro = fonte.slice(
      fonte.indexOf("router.post('/auth/register'"),
      fonte.indexOf("router.post('/auth/login'"),
    )

    expect(registro).toContain('prisma.appointment.updateMany')
    expect(registro).toMatch(/patientId:\s*null/)
    expect(registro).toMatch(/status:\s*'PENDING'/)
    expect(registro).toMatch(/email:\s*\{\s*equals:\s*patient\.email,\s*mode:\s*'insensitive'\s*\}/)
    expect(registro).toMatch(/data:\s*\{\s*patientId:\s*patient\.id\s*\}/)
  })

  it('não religa consultas canceladas ou já concluídas', () => {
    const registro = fonte.slice(
      fonte.indexOf('prisma.appointment.updateMany'),
      fonte.indexOf('const token = await createPatientSession'),
    )
    expect(registro).toContain("status: 'PENDING'")
  })
})
