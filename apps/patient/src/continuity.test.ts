import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..')
const login = readFileSync(join(root, 'apps/patient/src/pages/Login.tsx'), 'utf8')
const appointment = readFileSync(join(root, 'apps/web/src/components/Appointment.tsx'), 'utf8')

describe('continuidade entre solicitação pública e portal', () => {
  it('leva a nova paciente diretamente à criação de acesso', () => {
    expect(appointment).toContain('href="/paciente/?criar-acesso=1"')
    expect(login).toContain("new URLSearchParams(window.location.search).has('criar-acesso') ? 'register' : 'login'")
  })

  it('mantém o mesmo endpoint autenticado para criar o acesso', () => {
    expect(login).toContain('api.post(`/patient/auth/${mode}`')
    expect(login).toContain('localStorage.setItem(TOKEN_KEY, data.token)')
  })
})
