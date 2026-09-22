import React from 'react'
import { api, errorMessage, tenantSlug, TOKEN_KEY } from '../lib/ui'
import draPortrait from '../assets/dra-marcela-portrait-limpa-v1.png'
import marbleTexture from '../assets/hero-regeneracao-desktop-v1.png'
import monogramBrown from '../assets/brand/md-monogram-brown.webp'
import { Splash, useAbertura } from '../components/Splash'
import { useAplicativoInstalado } from '../lib/standalone'

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
  /* Instalado, a entrada é a de um aplicativo: marca aparecendo primeiro e
     formulário centrado numa coluna. As duas colunas com retrato são desenho
     de página larga, e num celular elas viram o retrato empurrando o campo de
     e-mail para fora da dobra. */
  const comoApp = useAplicativoInstalado()
  const abrindo = useAbertura(comoApp)

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

  if (abrindo) return <Splash marca="Marcela CRM" sub="Painel da clínica" app="admin" />

  return (
    <main className={`auth-shell${comoApp ? ' is-app' : ''}`}>
      <div className="auth-bg" style={{ backgroundImage: `url(${marbleTexture})` }} />
      <section className="auth-panel">
        {/* No app a marca já apareceu na abertura; repeti-la ao lado do
            formulário só rouba a altura de que o teclado vai precisar. */}
        {!comoApp && (
        <div className="auth-copy">
          <span className="eyebrow">CRM médico</span>
          <h1>Dra. Marcela</h1>
          <p>Operação clínica, relacionamento, conteúdo e acompanhamento de pacientes em um painel seguro.</p>
          <div className="auth-portrait">
            <img src={draPortrait} alt="Dra. Marcela Duch" />
          </div>
        </div>
        )}
        <form onSubmit={submit} className="form">
          <div>
            {comoApp && (
              <span className="auth-mono" aria-hidden="true">
                <img src={monogramBrown} alt="" width={40} height={40} />
              </span>
            )}
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
