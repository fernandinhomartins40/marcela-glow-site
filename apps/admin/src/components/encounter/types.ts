import type { Patient } from '../Patients'

/**
 * Tipos e rótulos do Atendimento, compartilhados pelas etapas.
 *
 * Ficam fora dos componentes porque agenda, prontuário, documentos e sessões
 * falam das mesmas entidades: manter cada arquivo com a sua cópia faria as
 * definições divergirem na primeira mudança de contrato da API.
 */

export interface AgendaEntry {
  id: string
  scheduledAt: string | null
  status: string
  name: string
  /* Dados que a pessoa digitou no pedido do site — é por eles que a ficha
     nasce quando ainda não existe cadastro. */
  email: string
  phone: string | null
  procedure: { id: string; title: string } | null
  patient: { id: string; name: string; email: string; phone: string | null; birthDate: string | null } | null
  _count: { records: number; prescriptions: number; sessions: number }
}

export interface MedicalRecord {
  id: string
  title: string
  type: string
  body: string
  complaint: string | null
  plan: string | null
  history: string | null
  occurredAt: string | null
  lockedAt: string | null
  createdAt: string
  appointment?: { id: string; scheduledAt: string | null } | null
}

export interface EncounterData {
  appointment: {
    id: string
    scheduledAt: string | null
    status: string
    message: string | null
    /** O percurso da paciente pela clinica, para os avisos saberem o momento. */
    calledAt?: string | null
    releasedAt?: string | null
    procedure: { id: string; title: string } | null
  }
  patient: Patient
  currentRecords: MedicalRecord[]
  history: MedicalRecord[]
  documents: { id: string; kind: string; title: string; status: string; createdAt: string; items: any[] }[]
  sessions: { id: string; performedAt: string; priceCents: number | null; procedure: { title: string } | null }[]
  attachments: { id: string; fileName: string; mimeType: string | null; sizeBytes: number | null; createdAt: string }[]
}

export const RECORD_TYPES = [
  { id: 'ANAMNESIS', label: 'Anamnese' },
  { id: 'EVOLUTION', label: 'Evolução' },
  { id: 'ASSESSMENT', label: 'Avaliação' },
  { id: 'PROCEDURE', label: 'Procedimento' },
  { id: 'NOTE', label: 'Observação' },
]

export function recordTypeLabel(type: string) {
  return RECORD_TYPES.find((t) => t.id === type)?.label ?? type
}
