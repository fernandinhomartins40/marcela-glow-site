import React from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { api, getErrorMessage, TOKEN_KEY, tenantSlug } from '@/lib/api'
import { Feedback } from '@/components/ui'
import marbleTexture from '@/assets/marble-texture.jpg'
import { Splash, useAbertura } from '@/components/Splash'
import { useAplicativoInstalado } from '@/lib/standalone'

const demoPatient = {
  label: 'Paciente demo',
  email: 'paciente@exemplo.com',
  password: 'Paciente@2026',
}

export function Login() {
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState('')
  /* Instalado, a entrada e a de um aplicativo: a marca aparece primeiro e o
     formulario recebe o monograma no lugar do nome escrito. */
  const comoApp = useAplicativoInstalado()
  const abrindo = useAbertura(comoApp)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isRegister = mode === 'register'

  function fillDemo() {
    setMode('login')
    setEmail(demoPatient.email)
    setPassword(demoPatient.password)
    setError('')
  }

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post(`/patient/auth/${mode}`, {
        name,
        email,
        phone,
        password,
        tenantSlug,
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      window.location.reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível entrar. Confira seus dados.'))
      setIsSubmitting(false)
    }
  }

  if (abrindo) return <Splash marca="Minha Jornada" sub="Portal da paciente" />

  return (
    <main className={`min-h-screen grid lg:grid-cols-2${comoApp ? ' is-app' : ''}`}>
      {/* Painel da marca — decorativo, escondido no mobile para não empurrar o formulário */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[hsl(var(--espresso))] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${marbleTexture})` }}
          aria-hidden="true"
        />
        <div className="relative">
          <p className="font-display text-lg tracking-[0.25em] uppercase text-[hsl(var(--cream))]">
            Dra. Marcela Duch
          </p>
          <p className="mt-1.5 text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))]">
            Médica · CRM/MS 5691
          </p>
        </div>

        <div className="relative">
          <h1 className="font-display text-5xl xl:text-6xl leading-[1.05] text-[hsl(var(--cream))]">
            Seu acompanhamento,
            <span className="block italic font-light text-[hsl(var(--bronze-light))]">
              sempre à mão.
            </span>
          </h1>
          <p className="mt-6 max-w-sm text-[hsl(var(--cream))]/65 leading-relaxed">
            Consultas, prescrições e orientações da sua jornada reunidos em um só
            lugar, com o cuidado e a discrição de sempre.
          </p>
        </div>

        <p className="relative text-[0.65rem] tracking-[0.25em] uppercase text-[hsl(var(--cream))]/40">
          Chapadão do Sul · MS
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Cabeçalho da marca no mobile */}
          <div className="lg:hidden mb-8 text-center">
            {comoApp && (
              <span className="auth-mono mx-auto" aria-hidden="true">
                MD
              </span>
            )}
            <p className="font-display text-base tracking-[0.2em] uppercase text-primary">
              Dra. Marcela Duch
            </p>
            <p className="mt-1 text-[0.6rem] tracking-[0.25em] uppercase text-muted-foreground">
              Portal da paciente
            </p>
          </div>

          <h2 className="font-display text-3xl text-primary">
            {isRegister ? 'Criar meu acesso' : 'Entrar'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {isRegister
              ? 'Preencha seus dados para acompanhar sua jornada de cuidado.'
              : 'Acesse para ver suas consultas, prescrições e orientações.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  Nome completo
                </label>
                <input
                  id="name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                  Telefone
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(67) 90000-0000"
                  autoComplete="tel"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 inset-y-0 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Feedback tone="error">{error}</Feedback>

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? 'Entrando...' : isRegister ? 'Criar acesso' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border space-y-3">
            <button type="button" onClick={switchMode} className="btn-outline w-full">
              {isRegister ? 'Já tenho acesso' : 'Quero criar meu acesso'}
            </button>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Preencher {demoPatient.label}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
