import type { DashboardData } from '@/lib/api'
import { RequestCare } from '@/components/RequestCare'
import { MessagesList } from '@/components/sections'

export function MessagesPage({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <RequestCare procedures={data.procedures} />
      <MessagesList messages={data.messages} />
    </div>
  )
}
