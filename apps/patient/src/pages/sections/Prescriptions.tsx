import type { DashboardData } from '@/lib/api'
import { AttachmentsList, PrescriptionsList } from '@/components/sections'

export function PrescriptionsPage({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <PrescriptionsList prescriptions={data.prescriptions} />
      <AttachmentsList attachments={data.attachments} />
    </div>
  )
}
