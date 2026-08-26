import React from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  FileSignature,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { api, ROLE_LABELS } from './lib/ui'
import { Login } from './pages/Login'
import { AdminPanel, type AdminTab } from './pages/AdminPanel'
import './styles.css'

const queryClient = new QueryClient()

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
      ['cms', FileText, 'Site', 'Conteúdo da landing page e publicações'],
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
  items: readonly (readonly [AdminTab, typeof LayoutDashboard, string, string])[]
}[]

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ group: group.label, item })))
const labelOf = (tab: AdminTab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.item[2] ?? ''
const hintOf = (tab: AdminTab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.item[3] ?? ''
const groupOf = (tab: AdminTab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.group ?? ''

function useAdminData() {
  return useQuery({
    queryKey: ['admin'],
    queryFn: async () => {
      const [dashboard, appointments, cms, settings, audit, users] = await Promise.all([
        api.get('/admin/dashboard'),
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

function initials(fullName?: string) {
  if (!fullName) return '—'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function Shell() {
  const navigate = useNavigate()
  const location = useLocation()
  const requestedTab = location.pathname.split('/').filter(Boolean)[0]
  const tab = NAV_ITEMS.some(({ item }) => item[0] === requestedTab)
    ? requestedTab as AdminTab
    : 'dashboard'
  const [navOpen, setNavOpen] = React.useState(false)
  const data = useAdminData()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    staleTime: 5 * 60 * 1000,
  })

  React.useEffect(() => {
    if (!navOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  React.useEffect(() => {
    if (requestedTab !== tab) navigate(`/${tab}`, { replace: true })
  }, [navigate, requestedTab, tab])

  function go(next: AdminTab) {
    navigate(`/${next}`)
    setNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : ''}`}>
      <button className="nav-scrim" hidden={!navOpen} onClick={() => setNavOpen(false)} aria-label="Fechar navegação" tabIndex={-1} />
      <aside className="app-nav">
        <div className="brand">
          <Sparkles size={22} aria-hidden="true" />
          <strong>Marcela CRM</strong>
          <button className="nav-close" onClick={() => setNavOpen(false)} aria-label="Fechar navegação">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="side-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              <span className="nav-group-label">{group.label}</span>
              {group.items.map(([id, Icon, label, hint]) => (
                <button key={id} className={tab === id ? 'active' : ''} onClick={() => go(id)} title={hint} aria-current={tab === id ? 'page' : undefined}>
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button className="nav-signout" onClick={() => { localStorage.removeItem('admin_token'); window.location.reload() }}>
          <LogOut size={17} />Sair
        </button>
      </aside>

      <main>
        <header>
          <div>
            <button className="nav-toggle" onClick={() => setNavOpen(true)} aria-label="Abrir navegação" aria-expanded={navOpen}>
              <Menu size={20} aria-hidden="true" />
            </button>
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
        {data.data && <AdminPanel tab={tab} data={data.data} currentUserId={me.data?.id} />}
      </main>
    </div>
  )
}

function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  }, [])

  if (!localStorage.getItem('admin_token')) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/:section" element={<Shell />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

const routerBase = import.meta.env.BASE_URL === '/'
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, '')

export function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBase}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
