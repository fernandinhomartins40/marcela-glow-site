import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, FileText, Heart, Paperclip, RefreshCw } from 'lucide-react'
import { fetchDashboard, getErrorMessage, type DashboardData } from '@/lib/api'
import { firstName, pickNextAppointment } from '@/lib/format'
import { AppShell, type SectionId } from '@/components/AppShell'
import { NextAppointment, SummaryStat } from '@/components/NextAppointment'
import { RequestCare } from '@/components/RequestCare'
import {
  AppointmentsList,
  AttachmentsList,
  DashboardSkeleton,
  MessagesList,
  NotificationsPanel,
  PrescriptionsList,
  SessionsList,
} from '@/components/sections'

export function Dashboard() {
  const [section, setSection] = React.useState<SectionId>('inicio')
  const query = useQuery({ queryKey: ['patient-dashboard'], queryFn: fetchDashboard })

  const data = query.data
  const patientName = data?.patient?.name ?? null
  const greeting = firstName(patientName)

  function navigate(id: SectionId) {
    setSection(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AppShell active={section} onNavigate={navigate} patientName={patientName}>
      {query.isLoading && <DashboardSkeleton />}

      {query.isError && (
        <div className="panel panel-pad text-center py-12">
          <div className="w-11 h-11 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle size={19} className="text-destructive" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl text-primary">Não conseguimos carregar seus dados</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {getErrorMessage(query.error, 'Verifique sua conexão e tente novamente.')}
          </p>
          <button onClick={() => query.refetch()} className="btn-outline mt-6">
            <RefreshCw size={16} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="mb-6">
            <h1 className="font-display text-3xl sm:text-4xl text-primary">
              {greeting ? `Olá, ${greeting}` : 'Olá'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Acompanhe sua jornada de cuidado com a Dra. Marcela.
            </p>
          </div>

          {section === 'inicio' && <HomeSection data={data} onRequest={() => navigate('consultas')} />}
          {section === 'consultas' && <AppointmentsSection data={data} />}
          {section === 'prescricoes' && <PrescriptionsSection data={data} />}
          {section === 'mensagens' && <MessagesSection data={data} />}
        </>
      )}
    </AppShell>
  )
}

function HomeSection({ data, onRequest }: { data: DashboardData; onRequest: () => void }) {
  const next = pickNextAppointment(data.appointments)

  return (
    <div className="space-y-6">
      <NextAppointment appointment={next} onRequest={onRequest} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStat icon={CalendarDays} label="Consultas" value={data.appointments.length} />
        <SummaryStat icon={Heart} label="Procedimentos" value={data.sessions.length} />
        <SummaryStat icon={FileText} label="Prescrições" value={data.prescriptions.length} />
        <SummaryStat icon={Paperclip} label="Arquivos" value={data.attachments.length} />
      </div>

      <RequestCare procedures={data.procedures} />

      <NotificationsPanel notifications={data.notifications} />
    </div>
  )
}

function AppointmentsSection({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <RequestCare procedures={data.procedures} />
      <AppointmentsList appointments={data.appointments} />
      <SessionsList sessions={data.sessions} />
    </div>
  )
}

function PrescriptionsSection({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <PrescriptionsList prescriptions={data.prescriptions} />
      <AttachmentsList attachments={data.attachments} />
    </div>
  )
}

function MessagesSection({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <RequestCare procedures={data.procedures} />
      <MessagesList messages={data.messages} />
    </div>
  )
}
