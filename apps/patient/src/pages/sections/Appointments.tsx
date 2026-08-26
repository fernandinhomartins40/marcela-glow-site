import type { DashboardData } from '@/lib/api'
import { RequestCare } from '@/components/RequestCare'
import { AppointmentsList, SessionsList } from '@/components/sections'

export function AppointmentsPage({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <RequestCare procedures={data.procedures} />
      <AppointmentsList appointments={data.appointments} />
      <SessionsList sessions={data.sessions} />
    </div>
  )
}
