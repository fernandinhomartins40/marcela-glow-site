import { CalendarDays, FileText, Heart, Paperclip } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { pickNextAppointment } from '@/lib/format'
import { NextAppointment, SummaryStat } from '@/components/NextAppointment'
import { RequestCare } from '@/components/RequestCare'
import { NotificationsPanel } from '@/components/sections'

export function HomePage({ data, onRequest }: { data: DashboardData; onRequest: () => void }) {
  const next = pickNextAppointment(data.appointments)

  return (
    <div className="space-y-6">
      <NextAppointment appointment={next} onRequest={onRequest} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
