import React from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ConciergeBell,
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
  Wallet,
  X,
} from 'lucide-react'
import { api, errorMessage, ROLE_LABELS, TOKEN_KEY } from './lib/ui'
import { Login } from './pages/Login'
import { AdminPanel, type AdminTab } from './pages/AdminPanel'
import { AppBar } from './components/AppBar'
import { useAplicativoInstalado } from './lib/standalone'
import './styles.css'

const queryClient = new QueryClient()

/**
 * A navegacao do painel.
 *
 * O quinto campo e a permissao que o item exige. Sem ela a recepcionista via
 * o painel inteiro da medica — Atendimento, Documentos, Ajustes — e ao clicar
 * caia numa tela travada em "Carregando..." com 403 no console. O menu passa a
 * mostrar so o que a pessoa pode de fato abrir.
 *
 * Isto e conveniencia, nao seguranca: quem protege os dados e o
 * `requirePermission` de cada rota. Esconder o que nao se pode usar evita a
 * porta que nao abre.
 */
const NAV_GROUPS = [
  {
    label: 'Dia a dia',
    items: [
      ['dashboard', LayoutDashboard, 'Dashboard', 'Visão geral do movimento da clínica', 'DASHBOARD_READ'],
      ['reception', ConciergeBell, 'Recepção', 'Chegadas, confirmações e encaixes do dia', 'APPOINTMENT_WRITE'],
      ['encounter', Stethoscope, 'Atendimento', 'Atender a paciente e registrar o prontuário', 'RECORD_WRITE'],
      ['appointments', CalendarDays, 'Agenda', 'Consultas marcadas e horários livres', 'APPOINTMENT_READ'],
      ['finance', Wallet, 'Financeiro', 'Cobranças, pagamentos e recibos', 'SETTINGS_READ'],
    ],
  },
  {
    label: 'Clínico',
    items: [
      ['patients', Users, 'Pacientes', 'Cadastro e prontuário completo de cada paciente', 'PATIENT_READ'],
      ['documents', FileSignature, 'Documentos', 'Assinar e enviar receitas e pedidos de exame', 'PRESCRIPTION_READ'],
      ['registry', Sparkles, 'Cadastros', 'Procedimentos, medicamentos, exames e modelos', 'SETTINGS_WRITE'],
    ],
  },
  {
    label: 'Divulgação',
    items: [
      ['leads', MessageSquare, 'Leads', 'Contatos interessados vindos do site', 'LEAD_READ'],
      ['cms', FileText, 'Site', 'Conteúdo da landing page e publicações', 'CMS_READ'],
    ],
  },
  {
    label: 'Administração',
    items: [
      ['security', UserRound, 'Equipe e acessos', 'Quem usa o painel e registro de auditoria', 'USER_MANAGE'],
      ['settings', Settings, 'Ajustes', 'Horários de atendimento e certificado digital', 'SETTINGS_WRITE'],
    ],
  },
] as const satisfies readonly {
  label: string
  items: readonly (readonly [AdminTab, typeof LayoutDashboard, string, string, string])[]
}[]

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ group: group.label, item })))
const labelOf = (tab: AdminTab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.item[2] ?? ''
const hintOf = (tab: AdminTab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.item[3] ?? ''
const groupOf = (tab: AdminTab) => NAV_ITEMS.find(({ item }) => item[0] === tab)?.group ?? ''

/**
 * Os dados que o painel carrega de uma vez.
 *
 * Era um `Promise.all`: bastava uma das seis chamadas dar 403 para todas
 * falharem juntas. A recepcionista, que nao pode ler CMS, ajustes, auditoria
 * nem usuarios, ficava presa em "Carregando dados reais do backend..." para
 * sempre — inclusive nas telas que ela pode usar.
 *
 * O painel tambem nao pede o que a pessoa nao pode ler: sem isso a
 * recepcionista disparava quatro 403 a cada login, ruido que esconde erro de
 * verdade no console. O `allSettled` continua como rede — permissao pode
 * mudar entre o `me` e a chamada, e uma recusa nao deve derrubar o painel.
 */
function useAdminData(permissoes: string[]) {
  const pode = (p: string) => permissoes.includes(p)
  return useQuery({
    queryKey: ['admin', permissoes.join(',')],
    // Sem permissao nenhuma carregada ainda nao ha o que pedir.
    enabled: permissoes.length > 0,
    queryFn: async () => {
      const nada = Promise.resolve(null)
      const respostas = await Promise.allSettled([
        pode('DASHBOARD_READ') ? api.get('/admin/dashboard') : nada,
        pode('APPOINTMENT_READ') ? api.get('/appointments', { params: { limit: 200 } }) : nada,
        pode('CMS_READ') ? api.get('/admin/cms') : nada,
        pode('SETTINGS_READ') ? api.get('/admin/settings') : nada,
        pode('AUDIT_READ') ? api.get('/admin/audit') : nada,
        pode('USER_MANAGE') ? api.get('/admin/users') : nada,
      ])
      const valor = (i: number) => (respostas[i].status === 'fulfilled'
        ? ((respostas[i] as PromiseFulfilledResult<{ data: unknown } | null>).value?.data ?? null)
        : null)
      const lista = valor(1) as { data?: unknown[] } | null
      return {
        dashboard: valor(0),
        appointments: lista?.data ?? [],
        cms: valor(2),
        settings: valor(3),
        audit: valor(4),
        users: valor(5),
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
  /* Instalado, o painel troca a gaveta lateral por barra inferior. No
     navegador nada muda: ali a pessoa tem a barra do sistema por perto e a
     tela costuma ser maior. */
  const comoApp = useAplicativoInstalado()
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

  /* O menu mostra so o que a pessoa pode abrir. Enquanto `me` nao chegou
     nao se mostra nada: piscar itens que somem em seguida e pior do que
     esperar meio segundo. */
  const permissoes: string[] = me.data?.permissions ?? []
  const data = useAdminData(permissoes)
  const podeVer = React.useCallback(
    (permissao: string) => permissoes.includes(permissao),
    [permissoes],
  )
  const gruposVisiveis = React.useMemo(
    () =>
      NAV_GROUPS.map((grupo) => ({
        ...grupo,
        items: grupo.items.filter(([, , , , permissao]) => podeVer(permissao)),
      })).filter((grupo) => grupo.items.length > 0),
    [podeVer],
  )

  React.useEffect(() => {
    if (requestedTab !== tab) navigate(`/${tab}`, { replace: true })
  }, [navigate, requestedTab, tab])

  /* Uma aba que a pessoa nao pode abrir — link antigo, favorito, ou a aba
     padrao quando ela nem tem Dashboard — devolve para a primeira que ela
     pode. Sem isto o painel abriria numa tela que so sabe dar 403. */
  const primeiraPermitida = gruposVisiveis[0]?.items[0]?.[0]
  React.useEffect(() => {
    if (!me.data || !primeiraPermitida) return
    const atual = NAV_ITEMS.find(({ item }) => item[0] === tab)
    if (atual && !permissoes.includes(atual.item[4])) navigate(`/${primeiraPermitida}`, { replace: true })
  }, [me.data, navigate, permissoes, primeiraPermitida, tab])

  function go(next: AdminTab) {
    navigate(`/${next}`)
    setNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : ''} ${comoApp ? 'is-app' : ''}`}>
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
          {gruposVisiveis.map((group) => (
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

        <button className="nav-signout" onClick={() => { localStorage.removeItem(TOKEN_KEY); window.location.reload() }}>
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
        {data.isError && (
          <p className="error">
            {errorMessage(data.error, 'Não foi possível carregar os dados. Verifique a conexão e tente novamente.')}
          </p>
        )}
        {data.data && <AdminPanel tab={tab} data={data.data} currentUserId={me.data?.id} />}
      </main>

      {comoApp && (
        <AppBar
          tab={tab}
          onNavigate={go}
          onSignOut={() => {
            localStorage.removeItem(TOKEN_KEY)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  }, [])

  if (!localStorage.getItem(TOKEN_KEY)) return <Login />

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
