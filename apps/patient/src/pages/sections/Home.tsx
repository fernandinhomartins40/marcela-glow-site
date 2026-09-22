import { CalendarDays, FileText, Heart, Paperclip } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { pickNextAppointment } from '@/lib/format'
import { NextAppointment, SummaryStat } from '@/components/NextAppointment'
import { RequestCare } from '@/components/RequestCare'
import { NotificationsPanel } from '@/components/sections'

export function HomePage({
  data,
  onRequest,
  onNavigate,
}: {
  data: DashboardData
  onRequest: () => void
  onNavigate: (section: 'consultas' | 'jornada' | 'prescricoes') => void
}) {
  const next = pickNextAppointment(data.appointments)

  return (
    <div className="space-y-6">
      <NextAppointment appointment={next} onRequest={onRequest} />
      <section aria-label="Seu cuidado" className="space-y-3">
        <div>
          <p className="label-eyebrow">Seu cuidado</p>
          <h2 className="mt-1 font-display text-2xl text-primary">Tudo o que você pode acompanhar</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <SummaryStat icon={CalendarDays} label="Consultas" value={data.appointments.length} onClick={() => onNavigate('consultas')} />
          <SummaryStat icon={Heart} label="Procedimentos" value={data.sessions.length} onClick={() => onNavigate('jornada')} />
          <SummaryStat icon={FileText} label="Prescrições" value={data.prescriptions.length} onClick={() => onNavigate('prescricoes')} />
          <SummaryStat icon={Paperclip} label="Arquivos" value={data.attachments.length} />
        </div>
      </section>
      <RequestCare procedures={data.procedures} />
      <NotificationsPanel notifications={data.notifications} />
    </div>
  )
}
