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
    // O token da conta recém-criada é gravado pela fronteira nativa (localStorage + sistema).
    expect(login).toContain('guardarSessao(TOKEN_KEY, data.token)')
  })

  it('o cadastro pede confirmação por e-mail e o link de ativação conclui o acesso', () => {
    // Sem token no cadastro, avisa do e-mail em vez de entrar.
    expect(login).toContain('if (!data?.token)')
    expect(login).toContain('Enviamos um link de ativação para')
    // `/paciente/?ativar=<token>` troca o token do e-mail pela sessão, pelo mesmo caminho do login.
    expect(login).toContain("url.searchParams.get('ativar')")
    expect(login).toContain(".post('/patient/auth/activate', { token: ativar })")
    expect(login).toContain("url.searchParams.delete('ativar')")
  })
})
