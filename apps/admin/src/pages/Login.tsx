import React from 'react'
import { api, errorMessage, tenantSlug, TOKEN_KEY } from '../lib/ui'
import draPortrait from '../assets/dra-marcela-portrait.jpg'
import marbleTexture from '../assets/marble-texture.jpg'

const demoAdmin = {
  label: 'Admin demo',
  email: 'admin@drmarceladuch.com.br',
  password: 'Admin@2024!',
}

const demoStaff = {
  label: 'Equipe demo',
  email: 'equipe@drmarceladuch.com.br',
  password: 'Equipe@2026!',
}

export function Login() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [error, setError] = React.useState('')

  function fillDemo(user: typeof demoAdmin) {
    setMode('login')
    setEmail(user.email)
    setPassword(user.password)
    setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const { data } = await api.post(endpoint, {
        name: 'Equipe Dra. Marcela',
        email,
        password,
        tenantSlug,
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      window.location.reload()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao autenticar'))
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-bg" style={{ backgroundImage: `url(${marbleTexture})` }} />
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="eyebrow">CRM médico</span>
          <h1>Dra. Marcela</h1>
          <p>Operação clínica, relacionamento, conteúdo e acompanhamento de pacientes em um painel seguro.</p>
          <div className="auth-portrait">
            <img src={draPortrait} alt="Dra. Marcela Duch" />
          </div>
        </div>
        <form onSubmit={submit} className="form">
          <div>
            <span className="eyebrow">Acesso da equipe</span>
            <h2>{mode === 'login' ? 'Entrar no painel' : 'Criar primeiro acesso'}</h2>
          </div>
          <div className="demo-actions" aria-label="Usuários de teste">
            {[demoAdmin, demoStaff].map((user) => (
              <button key={user.email} type="button" className="demo-button" onClick={() => fillDemo(user)}>
                {user.label}
              </button>
            ))}
          </div>
          <label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@clinica.com" /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit">{mode === 'login' ? 'Entrar' : 'Registrar equipe'}</button>
          <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Criar primeiro acesso' : 'Já tenho acesso'}
          </button>
        </form>
      </section>
    </main>
  )
}
