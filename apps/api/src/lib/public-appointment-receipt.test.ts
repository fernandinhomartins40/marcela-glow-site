import { describe, expect, it } from 'vitest'
import { publicAppointmentReceipt } from './public-appointment-receipt'

describe('comprovante público de agendamento', () => {
  it('não expõe dados da paciente vinculada nem campos internos da agenda', () => {
    const appointment = {
      id: 'pedido-1',
      status: 'PENDING',
      scheduledAt: new Date('2026-09-30T14:00:00.000Z'),
      patient: { id: 'paciente-1', name: 'Outra pessoa', email: 'privado@exemplo.com' },
      phone: '67999999999',
      message: 'Informação clínica privada',
      confirmedBy: { id: 'equipe-1', name: 'Equipe' },
    }
    const receipt = publicAppointmentReceipt(appointment)

    expect(Object.keys(receipt)).toEqual(['id', 'status', 'scheduledAt'])
    expect(receipt).toEqual({
      id: 'pedido-1',
      status: 'PENDING',
      scheduledAt: new Date('2026-09-30T14:00:00.000Z'),
    })
  })
})
