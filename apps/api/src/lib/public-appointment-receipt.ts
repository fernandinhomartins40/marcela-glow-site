/** Apenas os dados necessários para confirmar um pedido feito sem autenticação. */
export function publicAppointmentReceipt(appointment: {
  id: string
  status: string
  scheduledAt: Date | null
}) {
  return {
    id: appointment.id,
    status: appointment.status,
    scheduledAt: appointment.scheduledAt,
  }
}
