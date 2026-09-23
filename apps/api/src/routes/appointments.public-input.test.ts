import { describe, expect, it } from 'vitest'
import { publicAppointmentCreateSchema } from './appointments'

describe('entrada pública de agendamento', () => {
  it('normaliza espaços, e-mail e campos opcionais antes de persistir', () => {
    expect(
      publicAppointmentCreateSchema.parse({
        name: '  Ana Silva  ',
        email: ' ANA@EXEMPLO.COM ',
        phone: '  (67) 99999-0000 ',
        procedure: '   ',
        message: '  Gostaria de conversar.  ',
        tenantSlug: ' marcela-duch ',
      }),
    ).toMatchObject({
      name: 'Ana Silva',
      email: 'ana@exemplo.com',
      phone: '(67) 99999-0000',
      procedure: undefined,
      message: 'Gostaria de conversar.',
      tenantSlug: 'marcela-duch',
    })
  })

  it('recusa texto acima do limite da ficha pública', () => {
    expect(() => publicAppointmentCreateSchema.parse({
      name: 'Ana', email: 'ana@exemplo.com', phone: '67999990000', tenantSlug: 'marcela-duch', message: 'x'.repeat(4001),
    })).toThrow()
  })
})
