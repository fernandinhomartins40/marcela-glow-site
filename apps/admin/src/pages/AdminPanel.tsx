import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Schedule } from '../components/Schedule'
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

export function AdminPanel({ tab, data, currentUserId }: { tab: AdminTab; data: any; currentUserId?: string }) {
  if (tab === 'dashboard') return <Dashboard data={data.dashboard} />
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


function RegistryPage() {
  const [area, setArea] = React.useState<'procedures' | 'medications' | 'exams' | 'guidance' | 'doctemplates'>('procedures')
  const areas = [
    ['procedures', 'Procedimentos da clínica'],
    ['medications', 'Medicamentos'],
    ['exams', 'Exames'],
    ['guidance', 'Orientações e modelos'],
    ['doctemplates', 'Modelos de documento'],
  ] as const

  return (
    <>
      <div className="area-tabs" role="tablist">
        {areas.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={area === id} className={area === id ? 'active' : ''} onClick={() => setArea(id)}>
            {label}
          </button>
        ))}
      </div>
      {area === 'procedures' && <Procedures />}
      {area === 'medications' && <ClinicalCatalog only="MEDICATION" />}
      {area === 'exams' && <ClinicalCatalog only="EXAM" />}
      {area === 'guidance' && <ClinicalCatalog only={['GUIDANCE', 'RECORD_TEMPLATE']} />}
      {area === 'doctemplates' && <DocumentTemplates />}
    </>
  )
}

function SitePage({ cms }: { cms: any }) {
  const [area, setArea] = React.useState<'landing' | 'publicacoes'>('landing')
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist" aria-label="Conteúdo do site">
        <button role="tab" aria-selected={area === 'landing'} aria-controls="painel-landing" className={area === 'landing' ? 'active' : ''} onClick={() => setArea('landing')}>
          Landing page
        </button>
        <button role="tab" aria-selected={area === 'publicacoes'} aria-controls="painel-publicacoes" className={area === 'publicacoes' ? 'active' : ''} onClick={() => setArea('publicacoes')}>
          Páginas e publicações
        </button>
      </div>
      {area === 'landing' ? (
        <div id="painel-landing" role="tabpanel"><Landing /></div>
      ) : (
        <div id="painel-publicacoes" role="tabpanel"><Cms cms={cms} /></div>
      )}
    </div>
  )
}

function SecurityPage({ data, currentUserId }: { data: any; currentUserId?: string }) {
  const [area, setArea] = React.useState<'equipe' | 'auditoria'>('equipe')
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist" aria-label="Equipe e acessos">
        <button role="tab" aria-selected={area === 'equipe'} aria-controls="painel-equipe" className={area === 'equipe' ? 'active' : ''} onClick={() => setArea('equipe')}>
          Equipe e permissões
        </button>
        <button role="tab" aria-selected={area === 'auditoria'} aria-controls="painel-auditoria" className={area === 'auditoria' ? 'active' : ''} onClick={() => setArea('auditoria')}>
          Auditoria LGPD
        </button>
      </div>
      {area === 'equipe' ? (
        <div id="painel-equipe" role="tabpanel"><Team currentUserId={currentUserId} /></div>
      ) : (
        <div id="painel-auditoria" role="tabpanel">
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
     desperdica o link. */
  const [params, setParams] = useSearchParams()
  const abaPedida = params.get('aba')
  const area =
    abaPedida === 'certificate' || abaPedida === 'apps' ? abaPedida : 'schedule'
  const setArea = (proxima: 'schedule' | 'certificate' | 'apps') =>
    setParams(proxima === 'schedule' ? {} : { aba: proxima }, { replace: true })
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist">
        <button role="tab" aria-selected={area === 'schedule'} className={area === 'schedule' ? 'active' : ''} onClick={() => setArea('schedule')}>Agenda</button>
        <button role="tab" aria-selected={area === 'certificate'} className={area === 'certificate' ? 'active' : ''} onClick={() => setArea('certificate')}>Certificado digital</button>
        <button role="tab" aria-selected={area === 'apps'} className={area === 'apps' ? 'active' : ''} onClick={() => setArea('apps')}>Aplicativos</button>
      </div>
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
  )
}

function List({ title, items, pick }: { title: string; items: any[]; pick: (item: any) => string }) {
  return <section className="list"><h2>{title}</h2>{items.length ? items.map((item) => <p key={item.id}>{pick(item)}</p>) : <p>Nenhum registro.</p>}</section>
}
