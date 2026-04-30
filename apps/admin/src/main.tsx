import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  CalendarDays,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import './styles.css'

const queryClient = new QueryClient()
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'marcela-duch'

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type Tab = 'dashboard' | 'patients' | 'appointments' | 'leads' | 'records' | 'cms' | 'security' | 'settings'

function Login() {
  const [email, setEmail] = React.useState('admin@drmarceladuch.com.br')
  const [password, setPassword] = React.useState('Admin@2024!')
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [error, setError] = React.useState('')

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
      localStorage.setItem('admin_token', data.token)
      window.location.reload()
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : 'Falha ao autenticar')
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <span className="eyebrow">CRM medico</span>
          <h1>Dra. Marcela</h1>
          <p>Operacao clinica, relacionamento, conteudo e acompanhamento de pacientes em um painel seguro.</p>
        </div>
        <form onSubmit={submit} className="form">
          <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit">{mode === 'login' ? 'Entrar' : 'Registrar equipe'}</button>
          <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Criar primeiro acesso' : 'Ja tenho acesso'}
          </button>
        </form>
      </section>
    </main>
  )
}

function useAdminData() {
  return useQuery({
    queryKey: ['admin'],
    queryFn: async () => {
      const [dashboard, patients, appointments, leads, prescriptions, cms, notifications, settings, audit, users] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/patients'),
        api.get('/appointments'),
        api.get('/admin/leads'),
        api.get('/admin/prescriptions'),
        api.get('/admin/cms'),
        api.get('/admin/notifications'),
        api.get('/admin/settings'),
        api.get('/admin/audit'),
        api.get('/admin/users'),
      ])
      return {
        dashboard: dashboard.data,
        patients: patients.data,
        appointments: appointments.data.data ?? [],
        leads: leads.data,
        prescriptions: prescriptions.data,
        cms: cms.data,
        notifications: notifications.data,
        settings: settings.data,
        audit: audit.data,
        users: users.data,
      }
    },
  })
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>
}

function Shell() {
  const [tab, setTab] = React.useState<Tab>('dashboard')
  const data = useAdminData()
  const nav = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['patients', Users, 'Pacientes'],
    ['appointments', CalendarDays, 'Agenda'],
    ['leads', MessageSquare, 'Leads'],
    ['records', HeartPulse, 'Prontuario'],
    ['cms', FileText, 'CMS'],
    ['security', UserRound, 'Seguranca'],
    ['settings', Settings, 'Ajustes'],
  ] as const

  return (
    <div className="app-shell">
      <aside>
        <div className="brand"><Sparkles size={22} /><strong>Marcela CRM</strong></div>
        {nav.map(([id, Icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id as Tab)}><Icon size={18} />{label}</button>
        ))}
        <button onClick={() => { localStorage.removeItem('admin_token'); window.location.reload() }}><LogOut size={18} />Sair</button>
      </aside>
      <main>
        <header>
          <div><span className="eyebrow">Clinica Dra. Marcela</span><h1>{nav.find(([id]) => id === tab)?.[2]}</h1></div>
          <span className="pill">RBAC admin/staff</span>
        </header>
        {data.isLoading && <p>Carregando dados reais do backend...</p>}
        {data.isError && <p className="error">Nao foi possivel carregar a API.</p>}
        {data.data && <Panel tab={tab} data={data.data} />}
      </main>
    </div>
  )
}

function Panel({ tab, data }: { tab: Tab; data: any }) {
  if (tab === 'dashboard') return <Dashboard data={data} />
  if (tab === 'patients') return <Patients patients={data.patients} />
  if (tab === 'appointments') return <Appointments appointments={data.appointments} />
  if (tab === 'leads') return <Leads leads={data.leads} />
  if (tab === 'records') return <Records data={data} />
  if (tab === 'cms') return <Cms cms={data.cms} />
  if (tab === 'security') return <Security data={data} />
  return <SettingsPanel settings={data.settings} />
}

function Dashboard({ data }: { data: any }) {
  const m = data.dashboard.metrics
  return (
    <>
      <section className="stats">
        <Stat label="Agendamentos" value={m.appointments} />
        <Stat label="Pacientes" value={m.patients} />
        <Stat label="Leads" value={m.leads} />
        <Stat label="Faturamento" value={(m.revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
      </section>
      <section className="grid two">
        <List title="Proximos agendamentos" items={data.dashboard.nextAppointments} pick={(a: any) => `${a.patient?.name ?? a.name} - ${a.procedure?.title ?? 'Consulta'}`} />
        <List title="Pacientes recentes" items={data.dashboard.recentPatients} pick={(p: any) => `${p.name} - ${p.email}`} />
      </section>
    </>
  )
}

function Patients({ patients }: { patients: any[] }) {
  return <section className="table">{patients.map((p) => <article key={p.id}><strong>{p.name}</strong><span>{p.email}</span><span>{p.records?.length ?? 0} registros</span></article>)}</section>
}

function Appointments({ appointments }: { appointments: any[] }) {
  return <section className="table">{appointments.map((a) => <article key={a.id}><strong>{a.name}</strong><span>{a.procedure?.title ?? 'Avaliacao'}</span><span>{a.status}</span></article>)}</section>
}

function Leads({ leads }: { leads: any[] }) {
  return <section className="kanban">{['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON'].map((status) => <div key={status}><h3>{status}</h3>{leads.filter((l) => l.status === status).map((l) => <p key={l.id}>{l.name}<span>{l.origin ?? 'origem direta'}</span></p>)}</div>)}</section>
}

function Records({ data }: { data: any }) {
  const client = useQueryClient()
  const sign = useMutation({ mutationFn: (id: string) => api.patch(`/admin/prescriptions/${id}/sign`), onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }) })
  const send = useMutation({ mutationFn: (id: string) => api.patch(`/admin/prescriptions/${id}/send`), onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }) })
  return (
    <section className="grid two">
      <section className="list">
        <h2>Prescricoes digitais</h2>
        {data.prescriptions.map((p: any) => (
          <p key={p.id}>
            {p.patient.name} - {p.title} ({p.status})
            <span className="row-actions">
              <button onClick={() => sign.mutate(p.id)}>Assinar</button>
              <button onClick={() => send.mutate(p.id)}>Enviar</button>
            </span>
          </p>
        ))}
      </section>
      <FileUpload patients={data.patients} />
      <List title="Notificacoes" items={data.notifications} pick={(n: any) => `${n.title} - ${n.channel}`} />
    </section>
  )
}

function FileUpload({ patients }: { patients: any[] }) {
  const client = useQueryClient()
  const [patientId, setPatientId] = React.useState(patients[0]?.id ?? '')
  const [file, setFile] = React.useState<File | null>(null)
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return
      const presign = await api.post('/admin/files/presign', {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        patientId,
        visibility: 'PATIENT_VISIBLE',
      })
      await axios.put(presign.data.uploadUrl, file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } })
      await api.post('/admin/files/complete', {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        patientId,
        visibility: 'PATIENT_VISIBLE',
        storageKey: presign.data.storageKey,
      })
    },
    onSuccess: () => { setFile(null); client.invalidateQueries({ queryKey: ['admin'] }) },
  })
  return (
    <section className="list">
      <h2>Upload S3</h2>
      <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => upload.mutate()} disabled={!file || !patientId}>Enviar arquivo</button>
      {upload.isError && <p className="error">{(upload.error as Error).message}</p>}
    </section>
  )
}

function Cms({ cms }: { cms: any }) {
  return <section className="grid three"><List title="Paginas" items={cms.pages} pick={(p: any) => `${p.title} - ${p.status}`} /><List title="Blog" items={cms.posts} pick={(p: any) => `${p.title} - ${p.status}`} /><List title="Midia" items={cms.media} pick={(m: any) => m.fileName} /></section>
}

function Security({ data }: { data: any }) {
  const client = useQueryClient()
  const [email, setEmail] = React.useState('')
  const invite = useMutation({
    mutationFn: () => api.post('/admin/invites', { email, role: 'STAFF', permissions: ['PATIENT_READ', 'APPOINTMENT_READ'] }),
    onSuccess: () => { setEmail(''); client.invalidateQueries({ queryKey: ['admin'] }) },
  })
  return (
    <section className="grid two">
      <section className="list">
        <h2>Equipe e sessoes</h2>
        {data.users.map((u: any) => <p key={u.id}>{u.name} - {u.role}<span>{u.sessions?.length ?? 0} sessoes ativas</span></p>)}
        <div className="inline-form">
          <input placeholder="email@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button onClick={() => invite.mutate()}>Convidar</button>
        </div>
      </section>
      <List title="Auditoria LGPD" items={data.audit} pick={(a: any) => `${a.action} ${a.resource} - ${a.user?.name ?? a.patient?.name ?? 'sistema'}`} />
    </section>
  )
}

function SettingsPanel({ settings }: { settings: any }) {
  return <pre className="settings">{JSON.stringify(settings, null, 2)}</pre>
}

function List({ title, items, pick }: { title: string; items: any[]; pick: (item: any) => string }) {
  return <section className="list"><h2>{title}</h2>{items.length ? items.map((item) => <p key={item.id}>{pick(item)}</p>) : <p>Nenhum registro.</p>}</section>
}

function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  }, [])
  return localStorage.getItem('admin_token') ? <Shell /> : <Login />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></React.StrictMode>
)
