import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Schedule } from '../components/Schedule'
import { Reception } from '../components/Reception'
import { ScheduleSettings } from '../components/ScheduleSettings'
import { Patients } from '../components/Patients'
import { Cms, Leads, Procedures } from '../components/Catalog'
import { Team } from '../components/Team'
import { Landing } from '../components/Landing'
import { ClinicalCatalog, ClinicalDocuments } from '../components/Clinical'
import { DocumentTemplates } from '../components/DocumentTemplates'
import { Certificate } from '../components/Certificate'
import { PwaSettings } from '../components/PwaSettings'
import { Encounter } from '../components/Encounter'
import { Dashboard } from '../components/Dashboard'
import { Finance } from '../components/Finance'

export type AdminTab =
  | 'dashboard'
  | 'reception'
  | 'encounter'
  | 'appointments'
  | 'patients'
  | 'documents'
  | 'registry'
  | 'finance'
  | 'leads'
  | 'cms'
  | 'security'
  | 'settings'

export function AdminPanel({ tab, data, currentUserId, permissions }: { tab: AdminTab; data: any; currentUserId?: string; permissions: string[] }) {
  if (tab === 'dashboard') return <Dashboard data={data.dashboard} permissions={permissions} />
  if (tab === 'reception') return <Reception />
  if (tab === 'patients') return <Patients />
  if (tab === 'appointments') return <Schedule appointments={data.appointments} />
  if (tab === 'encounter') return <Encounter />
  if (tab === 'documents') return <ClinicalDocuments />
  if (tab === 'registry') return <RegistryPage />
  if (tab === 'finance') return <Finance />
  if (tab === 'leads') return <Leads />
  if (tab === 'cms') return <SitePage cms={data.cms} />
  if (tab === 'security') return <SecurityPage data={data} currentUserId={currentUserId} />
  return <SettingsPage settings={data.settings} />
}

/** Uma parada de Tab por conjunto; setas, Home e End movem foco e seleção. */
function navegarAbas(event: React.KeyboardEvent<HTMLDivElement>) {
  const teclas = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!teclas.includes(event.key)) return
  const abas = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  if (!abas.length) return
  const atual = abas.findIndex((aba) => aba === document.activeElement)
  if (atual < 0) return
  event.preventDefault()
  const proxima = event.key === 'Home' ? 0
    : event.key === 'End' ? abas.length - 1
    : (atual + (event.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length
  abas[proxima].focus()
  abas[proxima].click()
}


function RegistryPage() {
  const [params, setParams] = useSearchParams()
  const areasValidas = ['procedures', 'medications', 'exams', 'guidance', 'doctemplates'] as const
  type RegistryArea = typeof areasValidas[number]
  const pedida = params.get('aba')
  const area: RegistryArea = areasValidas.includes(pedida as RegistryArea) ? pedida as RegistryArea : 'procedures'
  const setArea = (proxima: RegistryArea) => setParams((atual) => {
    const novos = new URLSearchParams(atual)
    if (proxima === 'procedures') novos.delete('aba')
    else novos.set('aba', proxima)
    return novos
  })
  const areas = [
    ['procedures', 'Procedimentos da clínica'],
    ['medications', 'Medicamentos'],
    ['exams', 'Exames'],
    ['guidance', 'Orientações e modelos'],
    ['doctemplates', 'Modelos de documento'],
  ] as const

  return (
    <>
      <div className="area-tabs" role="tablist" aria-label="Cadastros clínicos" onKeyDown={navegarAbas}>
        {areas.map(([id, label]) => (
          <button key={id} id={`aba-${id}`} type="button" role="tab" tabIndex={area === id ? 0 : -1} aria-selected={area === id} aria-controls={`painel-${id}`} className={area === id ? 'active' : ''} onClick={() => setArea(id)}>
            {label}
          </button>
        ))}
      </div>
      <div id={`painel-${area}`} role="tabpanel" aria-labelledby={`aba-${area}`}>
        {area === 'procedures' && <Procedures />}
        {area === 'medications' && <ClinicalCatalog only="MEDICATION" />}
        {area === 'exams' && <ClinicalCatalog only="EXAM" />}
        {area === 'guidance' && <ClinicalCatalog only={['GUIDANCE', 'RECORD_TEMPLATE']} />}
        {area === 'doctemplates' && <DocumentTemplates />}
      </div>
    </>
  )
}

function SitePage({ cms }: { cms: any }) {
  const [params, setParams] = useSearchParams()
  const area = params.get('aba') === 'publicacoes' ? 'publicacoes' : 'landing'
  const setArea = (proxima: 'landing' | 'publicacoes') => setParams((atual) => {
    const novos = new URLSearchParams(atual)
    if (proxima === 'landing') novos.delete('aba')
    else novos.set('aba', proxima)
    return novos
  })
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist" aria-label="Conteúdo do site" onKeyDown={navegarAbas}>
        <button id="aba-landing" type="button" role="tab" tabIndex={area === 'landing' ? 0 : -1} aria-selected={area === 'landing'} aria-controls="painel-landing" className={area === 'landing' ? 'active' : ''} onClick={() => setArea('landing')}>
          Landing page
        </button>
        <button id="aba-publicacoes" type="button" role="tab" tabIndex={area === 'publicacoes' ? 0 : -1} aria-selected={area === 'publicacoes'} aria-controls="painel-publicacoes" className={area === 'publicacoes' ? 'active' : ''} onClick={() => setArea('publicacoes')}>
          Páginas e publicações
        </button>
      </div>
      {area === 'landing' ? (
        <div id="painel-landing" role="tabpanel" aria-labelledby="aba-landing"><Landing /></div>
      ) : (
        <div id="painel-publicacoes" role="tabpanel" aria-labelledby="aba-publicacoes"><Cms cms={cms} /></div>
      )}
    </div>
  )
}

function SecurityPage({ data, currentUserId }: { data: any; currentUserId?: string }) {
  const [params, setParams] = useSearchParams()
  const area = params.get('aba') === 'auditoria' ? 'auditoria' : 'equipe'
  const setArea = (proxima: 'equipe' | 'auditoria') => setParams((atual) => {
    const novos = new URLSearchParams(atual)
    if (proxima === 'equipe') novos.delete('aba')
    else novos.set('aba', proxima)
    return novos
  })
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist" aria-label="Equipe e acessos" onKeyDown={navegarAbas}>
        <button id="aba-equipe" type="button" role="tab" tabIndex={area === 'equipe' ? 0 : -1} aria-selected={area === 'equipe'} aria-controls="painel-equipe" className={area === 'equipe' ? 'active' : ''} onClick={() => setArea('equipe')}>
          Equipe e permissões
        </button>
        <button id="aba-auditoria" type="button" role="tab" tabIndex={area === 'auditoria' ? 0 : -1} aria-selected={area === 'auditoria'} aria-controls="painel-auditoria" className={area === 'auditoria' ? 'active' : ''} onClick={() => setArea('auditoria')}>
          Auditoria LGPD
        </button>
      </div>
      {area === 'equipe' ? (
        <div id="painel-equipe" role="tabpanel" aria-labelledby="aba-equipe"><Team currentUserId={currentUserId} /></div>
      ) : (
        <div id="painel-auditoria" role="tabpanel" aria-labelledby="aba-auditoria">
          <List title="Registro de acessos" items={data.audit} pick={(entry: any) => `${entry.action} ${entry.resource} - ${entry.user?.name ?? entry.patient?.name ?? 'sistema'}`} />
        </div>
      )}
    </div>
  )
}

function SettingsPage({ settings }: { settings: any }) {
  const [showRaw, setShowRaw] = React.useState(false)
  /* A aba pode vir na URL (`/settings?aba=certificate`): o aviso de validade
     legal, na tela de assinatura, precisa mandar a pessoa direto ao
     certificado — cair em Agenda e pedir que ela ache a sub-aba sozinha
     desperdica o link.

     Este e o padrao para sub-aba de **rota**. Sub-aba dentro de modal (ficha da
     paciente, atendimento, formulario) segue com `useState` de proposito: o
     modal abre sobre a lista sem mudar a URL, entao guardar a aba nela faria
     um F5 cair numa aba de item que nao esta mais aberto. */
  const [params, setParams] = useSearchParams()
  const abaPedida = params.get('aba')
  const area =
    abaPedida === 'certificate' || abaPedida === 'apps' ? abaPedida : 'schedule'
  const setArea = (proxima: 'schedule' | 'certificate' | 'apps') =>
    setParams((atual) => {
      const novos = new URLSearchParams(atual)
      if (proxima === 'schedule') novos.delete('aba')
      else novos.set('aba', proxima)
      return novos
    })
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist" aria-label="Ajustes da clínica" onKeyDown={navegarAbas}>
        <button id="aba-schedule" type="button" role="tab" tabIndex={area === 'schedule' ? 0 : -1} aria-selected={area === 'schedule'} aria-controls="painel-schedule" className={area === 'schedule' ? 'active' : ''} onClick={() => setArea('schedule')}>Agenda</button>
        <button id="aba-certificate" type="button" role="tab" tabIndex={area === 'certificate' ? 0 : -1} aria-selected={area === 'certificate'} aria-controls="painel-certificate" className={area === 'certificate' ? 'active' : ''} onClick={() => setArea('certificate')}>Certificado digital</button>
        <button id="aba-apps" type="button" role="tab" tabIndex={area === 'apps' ? 0 : -1} aria-selected={area === 'apps'} aria-controls="painel-apps" className={area === 'apps' ? 'active' : ''} onClick={() => setArea('apps')}>Aplicativos</button>
      </div>
      <div id={`painel-${area}`} role="tabpanel" aria-labelledby={`aba-${area}`}>
      {area === 'apps' ? (
        <PwaSettings />
      ) : area === 'certificate' ? (
        <Certificate />
      ) : (
        <>
          <ScheduleSettings />
          <section className="list">
            <h2>Configurações brutas</h2>
            <p className="hint">Valores gravados em ClinicSetting, para conferência.</p>
            <div className="row-actions">
              <button onClick={() => setShowRaw((value) => !value)}>{showRaw ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            {showRaw && <pre className="settings" style={{ marginTop: 12 }}>{JSON.stringify(settings, null, 2)}</pre>}
          </section>
        </>
      )}
      </div>
    </div>
  )
}

function List({ title, items, pick }: { title: string; items: any[]; pick: (item: any) => string }) {
  return <section className="list"><h2>{title}</h2>{items.length ? items.map((item) => <p key={item.id}>{pick(item)}</p>) : <p>Nenhum registro.</p>}</section>
}
