import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  CalendarDays,
  FileSignature,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react'
import draPortrait from './assets/dra-marcela-portrait.jpg'
import marbleTexture from './assets/marble-texture.jpg'
import { Schedule } from './components/Schedule'
import { ScheduleSettings } from './components/ScheduleSettings'
import { Patients } from './components/Patients'
import { Cms, Leads, Procedures } from './components/Catalog'
import { ClinicalCatalog, ClinicalDocuments } from './components/Clinical'
import { Certificate } from './components/Certificate'
import { Encounter } from './components/Encounter'
import './styles.css'

const queryClient = new QueryClient()
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'marcela-duch'

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type Tab =
  | 'dashboard'
  | 'encounter'
  | 'appointments'
  | 'patients'
  | 'documents'
  | 'registry'
  | 'leads'
  | 'cms'
  | 'security'
  | 'settings'

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

function Login() {
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
      localStorage.setItem('admin_token', data.token)
      window.location.reload()
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : 'Falha ao autenticar')
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
          <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@clinica.com" /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></label>
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

/**
 * Só o que o painel consome direto. Pacientes, leads, documentos e catálogo
 * são carregados pela própria aba, com busca e filtro — não faz sentido puxar
 * tudo isso a cada abertura do painel.
 */
function useAdminData() {
  return useQuery({
    queryKey: ['admin'],
    queryFn: async () => {
      const [dashboard, appointments, cms, settings, audit, users] = await Promise.all([
        api.get('/admin/dashboard'),
        // A agenda precisa da semana inteira, não só da primeira página
        api.get('/appointments', { params: { limit: 200 } }),
        api.get('/admin/cms'),
        api.get('/admin/settings'),
        api.get('/admin/audit'),
        api.get('/admin/users'),
      ])
      return {
        dashboard: dashboard.data,
        appointments: appointments.data.data ?? [],
        cms: cms.data,
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

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administradora',
  STAFF: 'Equipe',
  DOCTOR: 'Médica',
  RECEPTION: 'Recepção',
  ASSISTANT: 'Assistente',
  CONTENT_EDITOR: 'Conteúdo',
  FINANCE: 'Financeiro',
}

function initials(fullName?: string) {
  if (!fullName) return '—'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/**
 * A sidebar segue a frequência de uso, não a arquitetura do sistema: o que a
 * clínica abre todo dia fica no topo, a configuração desce para o rodapé.
 * O subtítulo de cada item responde "para que serve isto?" sem precisar clicar.
 */
const NAV_GROUPS = [
  {
    label: 'Dia a dia',
    items: [
      ['dashboard', LayoutDashboard, 'Dashboard', 'Visão geral do movimento da clínica'],
      ['encounter', Stethoscope, 'Atendimento', 'Atender a paciente e registrar o prontuário'],
      ['appointments', CalendarDays, 'Agenda', 'Consultas marcadas e horários livres'],
    ],
  },
  {
    label: 'Clínico',
    items: [
      ['patients', Users, 'Pacientes', 'Cadastro e prontuário completo de cada paciente'],
      ['documents', FileSignature, 'Documentos', 'Assinar e enviar receitas e pedidos de exame'],
      ['registry', Sparkles, 'Cadastros', 'Procedimentos, medicamentos, exames e modelos'],
    ],
  },
  {
    label: 'Divulgação',
    items: [
      ['leads', MessageSquare, 'Leads', 'Contatos interessados vindos do site'],
      ['cms', FileText, 'Site', 'Textos e publicações do site'],
    ],
  },
  {
    label: 'Administração',
    items: [
      ['security', UserRound, 'Equipe e acessos', 'Quem usa o painel e registro de auditoria'],
      ['settings', Settings, 'Ajustes', 'Horários de atendimento e certificado digital'],
    ],
  },
] as const satisfies readonly {
  label: string
  items: readonly (readonly [Tab, typeof LayoutDashboard, string, string])[]
}[]

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ group: group.label, item })))

const labelOf = (tab: Tab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.item[2] ?? ''
const hintOf = (tab: Tab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.item[3] ?? ''
const groupOf = (tab: Tab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.group ?? ''

function Shell() {
  const [tab, setTab] = React.useState<Tab>('dashboard')
  const data = useAdminData()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    staleTime: 5 * 60 * 1000,
  })
  return (
    <div className="app-shell">
      <aside>
        <div className="brand"><Sparkles size={22} /><strong>Marcela CRM</strong></div>

        <nav className="side-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              <span className="nav-group-label">{group.label}</span>
              {group.items.map(([id, Icon, label, hint]) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => setTab(id as Tab)}
                  title={hint}
                  aria-current={tab === id ? 'page' : undefined}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button
          className="nav-signout"
          onClick={() => { localStorage.removeItem('admin_token'); window.location.reload() }}
        >
          <LogOut size={17} />Sair
        </button>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">{groupOf(tab)}</span>
            <h1>{labelOf(tab)}</h1>
            {hintOf(tab) && <p className="page-hint">{hintOf(tab)}</p>}
          </div>
          {me.data && (
            <div className="who" title={me.data.email}>
              <span className="who-avatar">{initials(me.data.name)}</span>
              <span className="who-text">
                <strong>{me.data.name}</strong>
                <span>{ROLE_LABELS[me.data.role] ?? me.data.role}</span>
              </span>
            </div>
          )}
        </header>
        {data.isLoading && <p>Carregando dados reais do backend...</p>}
        {data.isError && <p className="error">Não foi possível carregar a API.</p>}
        {data.data && <Panel tab={tab} data={data.data} />}
      </main>
    </div>
  )
}

function Panel({ tab, data }: { tab: Tab; data: any }) {
  if (tab === 'dashboard') return <Dashboard data={data} />
  if (tab === 'patients') return <Patients />
  if (tab === 'appointments') return <Appointments appointments={data.appointments} />
  if (tab === 'encounter') return <Encounter />
  if (tab === 'documents') return <ClinicalDocuments />
  if (tab === 'registry') return <RegistryArea />
  if (tab === 'leads') return <Leads />
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
        <List title="Próximos agendamentos" items={data.dashboard.nextAppointments} pick={(a: any) => `${a.patient?.name ?? a.name} - ${a.procedure?.title ?? 'Consulta'}`} />
        <List title="Pacientes recentes" items={data.dashboard.recentPatients} pick={(p: any) => `${p.name} - ${p.email}`} />
      </section>
    </>
  )
}

function Appointments({ appointments }: { appointments: any[] }) {
  return <Schedule appointments={appointments} />
}

/**
 * Cadastros: tudo que alimenta o atendimento — os procedimentos oferecidos e
 * o catálogo clínico (medicamentos, exames, orientações, modelos).
 */
function RegistryArea() {
  const [area, setArea] = React.useState<'procedures' | 'medications' | 'exams' | 'guidance'>('procedures')
  const areas = [
    ['procedures', 'Procedimentos da clínica'],
    ['medications', 'Medicamentos'],
    ['exams', 'Exames'],
    ['guidance', 'Orientações e modelos'],
  ] as const

  return (
    <>
      <div className="area-tabs" role="tablist">
        {areas.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={area === id}
            className={area === id ? 'active' : ''}
            onClick={() => setArea(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {area === 'procedures' && <Procedures />}
      {area === 'medications' && <ClinicalCatalog only="MEDICATION" />}
      {area === 'exams' && <ClinicalCatalog only="EXAM" />}
      {area === 'guidance' && <ClinicalCatalog only={['GUIDANCE', 'RECORD_TEMPLATE']} />}
    </>
  )
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
        <h2>Equipe e sessões</h2>
        {data.users.map((u: any) => <p key={u.id}>{u.name} - {u.role}<span>{u.sessions?.length ?? 0} sessões ativas</span></p>)}
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
  const [showRaw, setShowRaw] = React.useState(false)
  const [area, setArea] = React.useState<'schedule' | 'certificate'>('schedule')

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={area === 'schedule'}
          className={area === 'schedule' ? 'active' : ''}
          onClick={() => setArea('schedule')}
        >
          Agenda
        </button>
        <button
          role="tab"
          aria-selected={area === 'certificate'}
          className={area === 'certificate' ? 'active' : ''}
          onClick={() => setArea('certificate')}
        >
          Certificado digital
        </button>
      </div>

      {area === 'certificate' ? (
        <Certificate />
      ) : (
        <>
          <ScheduleSettings />
          <section className="list">
            <h2>Configurações brutas</h2>
            <p className="hint">Valores gravados em ClinicSetting, para conferência.</p>
            <div className="row-actions">
              <button onClick={() => setShowRaw((v) => !v)}>{showRaw ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            {showRaw && (
              <pre className="settings" style={{ marginTop: 12 }}>
                {JSON.stringify(settings, null, 2)}
              </pre>
            )}
          </section>
        </>
      )}
    </div>
  )
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
