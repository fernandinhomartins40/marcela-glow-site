import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Bell, CalendarDays, Heart, LogOut, MessageCircle, Pill, Sparkles, UserRound } from 'lucide-react'
import draEditorial from './assets/dra-marcela-editorial.jpg'
import marbleTexture from './assets/marble-texture.jpg'
import './styles.css'

const queryClient = new QueryClient()
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'marcela-duch'

const demoPatient = {
  label: 'Paciente demo',
  email: 'paciente@exemplo.com',
  password: 'Paciente@2026',
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('patient_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

function Auth() {
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  function fillDemo() {
    setMode('login')
    setEmail(demoPatient.email)
    setPassword(demoPatient.password)
    setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const { data } = await api.post(`/patient/auth/${mode}`, { name, email, phone, password, tenantSlug })
      localStorage.setItem('patient_token', data.token)
      window.location.reload()
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : 'Falha ao autenticar')
    }
  }

  return (
    <main className="auth">
      <div className="auth-bg" style={{ backgroundImage: `url(${marbleTexture})` }} />
      <section className="intro">
        <span className="eyebrow">Experiência VIP</span>
        <h1>Minha Jornada</h1>
        <p>Um espaço reservado para agendamentos, prescrições, orientações e acompanhamento próximo com a equipe da Dra. Marcela.</p>
        <div className="auth-portrait">
          <img src={draEditorial} alt="Dra. Marcela Duch" />
        </div>
      </section>
      <form onSubmit={submit} className="card form">
        <div>
          <span className="eyebrow">Área da paciente</span>
          <h2>{mode === 'login' ? 'Entrar no cuidado' : 'Criar acesso'}</h2>
        </div>
        <button type="button" className="demo-button" onClick={fillDemo}>
          Preencher {demoPatient.label}
        </button>
        {mode === 'register' && <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>}
        <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></label>
        {mode === 'register' && <label>Telefone<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>}
        <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit">{mode === 'login' ? 'Entrar' : 'Criar acesso'}</button>
        <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Quero criar meu acesso' : 'Já tenho acesso'}
        </button>
      </form>
    </main>
  )
}

function useDashboard() {
  return useQuery({
    queryKey: ['patient-dashboard'],
    queryFn: async () => {
      const [dashboard, procedures] = await Promise.all([
        api.get('/patient/dashboard'),
        api.get('/procedures', { params: { tenantSlug } }),
      ])
      return { ...dashboard.data, procedures: procedures.data }
    },
  })
}

function Dashboard() {
  const query = useDashboard()
  const client = useQueryClient()
  const [message, setMessage] = React.useState('')
  const [procedureId, setProcedureId] = React.useState('')
  const appointment = useMutation({
    mutationFn: () => api.post('/patient/appointments', { procedureId: procedureId || undefined, message }),
    onSuccess: () => { setMessage(''); client.invalidateQueries({ queryKey: ['patient-dashboard'] }) },
  })
  const directMessage = useMutation({
    mutationFn: () => api.post('/patient/messages', { body: message }),
    onSuccess: () => { setMessage(''); client.invalidateQueries({ queryKey: ['patient-dashboard'] }) },
  })
  const enablePush = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push indisponivel neste navegador')
      const registration = await navigator.serviceWorker.ready
      const { data } = await api.get('/patient/push/public-key')
      if (!data.publicKey) throw new Error('Push nao configurado no servidor')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      })
      await api.post('/patient/push/subscriptions', subscription.toJSON())
    },
  })

  if (query.isLoading) return <main className="loading">Carregando sua jornada...</main>
  if (query.isError) return <main className="loading error">Nao foi possivel acessar seus dados.</main>
  const data: any = query.data

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Area da paciente</span>
          <h1>Cuidado continuo, no seu ritmo</h1>
          <p>Consultas, historico, prescricoes e lembretes em um ambiente discreto e pessoal.</p>
        </div>
        <button className="logout" onClick={() => { localStorage.removeItem('patient_token'); window.location.reload() }}><LogOut size={18} />Sair</button>
      </header>
      <section className="quick">
        <Metric icon={CalendarDays} label="Agendamentos" value={data.appointments.length} />
        <Metric icon={Heart} label="Procedimentos" value={data.sessions.length} />
        <Metric icon={Pill} label="Prescricoes" value={data.prescriptions.length} />
        <Metric icon={Bell} label="Lembretes" value={data.notifications.length} />
      </section>
      <section className="grid">
        <article className="card">
          <h2><CalendarDays size={19} />Novo agendamento</h2>
          <select value={procedureId} onChange={(e) => setProcedureId(e.target.value)}>
            <option value="">Consulta de avaliacao</option>
            {data.procedures.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte como voce deseja ser cuidada neste momento." />
          <div className="actions">
            <button onClick={() => appointment.mutate()}>Solicitar horario</button>
            <button className="ghost" onClick={() => directMessage.mutate()}><MessageCircle size={17} />Enviar mensagem</button>
          </div>
        </article>
        <List title="Proximos cuidados" icon={Sparkles} items={data.appointments} pick={(a: any) => `${a.procedure?.title ?? 'Consulta'} - ${a.status}`} />
        <List title="Historico de procedimentos" icon={Heart} items={data.sessions} pick={(s: any) => `${s.procedure?.title ?? 'Procedimento'} - ${new Date(s.performedAt).toLocaleDateString('pt-BR')}`} />
        <List title="Prescricoes e orientacoes" icon={Pill} items={data.prescriptions} pick={(p: any) => `${p.title} - ${p.status}`} />
        <List title="Arquivos e fotos" icon={UserRound} items={data.attachments ?? []} pick={(a: any) => `${a.fileName} - ${a.mimeType ?? 'arquivo'}`} />
        <List title="Canal direto" icon={MessageCircle} items={data.messages} pick={(m: any) => `${m.sender === 'PATIENT' ? 'Voce' : 'Equipe'}: ${m.body}`} />
        <article className="card list">
          <h2><Bell size={19} />Lembretes</h2>
          <button onClick={() => enablePush.mutate()}>Ativar push</button>
          {enablePush.isError && <p className="error">{(enablePush.error as Error).message}</p>}
          {data.notifications.length ? data.notifications.map((n: any) => <p key={n.id}>{n.title}</p>) : <p>Nenhum lembrete por enquanto.</p>}
        </article>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return <article className="metric"><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>
}

function List({ title, icon: Icon, items, pick }: { title: string; icon: any; items: any[]; pick: (item: any) => string }) {
  return (
    <article className="card list">
      <h2><Icon size={19} />{title}</h2>
      {items.length ? items.map((item) => <p key={item.id}>{pick(item)}</p>) : <p>Nenhum registro por enquanto.</p>}
    </article>
  )
}

function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  }, [])
  return localStorage.getItem('patient_token') ? <Dashboard /> : <Auth />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></React.StrictMode>
)
