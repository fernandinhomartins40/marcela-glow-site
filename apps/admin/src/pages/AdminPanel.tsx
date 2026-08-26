import React from 'react'
import { Schedule } from '../components/Schedule'
import { ScheduleSettings } from '../components/ScheduleSettings'
import { Patients } from '../components/Patients'
import { Cms, Leads, Procedures } from '../components/Catalog'
import { Team } from '../components/Team'
import { Landing } from '../components/Landing'
import { ClinicalCatalog, ClinicalDocuments } from '../components/Clinical'
import { Certificate } from '../components/Certificate'
import { Encounter } from '../components/Encounter'

export type AdminTab =
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

export function AdminPanel({ tab, data, currentUserId }: { tab: AdminTab; data: any; currentUserId?: string }) {
  if (tab === 'dashboard') return <DashboardPage data={data} />
  if (tab === 'patients') return <Patients />
  if (tab === 'appointments') return <Schedule appointments={data.appointments} />
  if (tab === 'encounter') return <Encounter />
  if (tab === 'documents') return <ClinicalDocuments />
  if (tab === 'registry') return <RegistryPage />
  if (tab === 'leads') return <Leads />
  if (tab === 'cms') return <SitePage cms={data.cms} />
  if (tab === 'security') return <SecurityPage data={data} currentUserId={currentUserId} />
  return <SettingsPage settings={data.settings} />
}

function DashboardPage({ data }: { data: any }) {
  const metrics = data.dashboard.metrics
  return (
    <>
      <section className="stats">
        <Stat label="Agendamentos" value={metrics.appointments} />
        <Stat label="Pacientes" value={metrics.patients} />
        <Stat label="Leads" value={metrics.leads} />
        <Stat label="Faturamento" value={(metrics.revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
      </section>
      <section className="grid two">
        <List title="Próximos agendamentos" items={data.dashboard.nextAppointments} pick={(appointment: any) => `${appointment.patient?.name ?? appointment.name} - ${appointment.procedure?.title ?? 'Consulta'}`} />
        <List title="Pacientes recentes" items={data.dashboard.recentPatients} pick={(patient: any) => `${patient.name} - ${patient.email}`} />
      </section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>
}

function RegistryPage() {
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
          <button key={id} role="tab" aria-selected={area === id} className={area === id ? 'active' : ''} onClick={() => setArea(id)}>
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
  const [area, setArea] = React.useState<'schedule' | 'certificate'>('schedule')
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="area-tabs" role="tablist">
        <button role="tab" aria-selected={area === 'schedule'} className={area === 'schedule' ? 'active' : ''} onClick={() => setArea('schedule')}>Agenda</button>
        <button role="tab" aria-selected={area === 'certificate'} className={area === 'certificate' ? 'active' : ''} onClick={() => setArea('certificate')}>Certificado digital</button>
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
