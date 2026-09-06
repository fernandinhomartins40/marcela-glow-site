import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
export const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'marcela-duch'

export const TOKEN_KEY = 'patient_token'

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Sessão expirada: limpa o token e volta ao login em vez de mostrar erro cru
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown, fallback = 'Não foi possível concluir. Tente novamente.') {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  window.location.reload()
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | string
export type PrescriptionStatus = 'DRAFT' | 'SENT' | 'SIGNED' | string

export interface Procedure {
  id: string
  title: string
}

export interface Appointment {
  id: string
  status: AppointmentStatus
  scheduledAt: string | null
  createdAt: string
  message: string | null
  procedure: { title: string } | null
}

export interface Session {
  id: string
  performedAt: string
  notes: string | null
  procedure: { title: string } | null
}

export type DocumentKind = 'PRESCRIPTION' | 'EXAM_REQUEST' | 'GUIDANCE' | 'CERTIFICATE'

export interface PrescriptionItem {
  id: string
  name: string
  strength: string | null
  form: string | null
  route: string | null
  dose: string | null
  quantity: string | null
  notes: string | null
  control: 'COMMON' | 'ANTIMICROBIAL' | 'CONTROLLED'
}

export interface Prescription {
  id: string
  kind: DocumentKind
  title: string
  instructions: string
  status: PrescriptionStatus
  createdAt: string
  sentAt: string | null
  signedAt: string | null
  validUntil: string | null
  verificationCode: string | null
  items: PrescriptionItem[]
}

export interface Notification {
  id: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export interface Message {
  id: string
  body: string
  sender: 'PATIENT' | 'STAFF' | string
  createdAt: string
}

export interface Attachment {
  id: string
  fileName: string
  url: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
}

export interface PatientProfile {
  id: string
  name: string
  email: string
  phone: string | null
  birthDate: string | null
}

export interface DashboardData {
  patient: PatientProfile | null
  appointments: Appointment[]
  sessions: Session[]
  prescriptions: Prescription[]
  notifications: Notification[]
  messages: Message[]
  attachments: Attachment[]
  procedures: Procedure[]
  /* Os planos de tratamento. O tipo fica solto de proposito: a forma dos
     campos personalizados vem do procedimento e muda quando a clinica a
     edita, entao amarra-la aqui obrigaria a mexer no front a cada mudanca. */
  plans?: unknown[]
}

export interface Slot {
  startsAt: string
  endsAt: string
  label: string
}

export interface DayAvailability {
  date: string
  weekdayLabel: string
  slots: Slot[]
}

/** Horários livres para o procedimento escolhido. */
export async function fetchAvailability(procedureId?: string, days = 14): Promise<DayAvailability[]> {
  const { data } = await api.get('/appointments/availability', {
    params: { tenantSlug, days, ...(procedureId ? { procedureId } : {}) },
  })
  return data.days ?? []
}

export async function fetchDashboard(): Promise<DashboardData> {
  const [dashboard, procedures] = await Promise.all([
    api.get('/patient/dashboard'),
    api.get('/procedures', { params: { tenantSlug } }),
  ])
  return { ...dashboard.data, procedures: procedures.data ?? [] }
}

/**
 * Pede o link de download de um arquivo clínico.
 *
 * O `url` que vem no painel aponta para o bucket privado e não abre sozinho:
 * arquivo de paciente não pode ficar acessível a quem descobrir o endereço.
 * A API confere se o arquivo é mesmo desta paciente, registra o acesso e
 * devolve um link assinado que vale por 15 minutos.
 */
export async function fetchAttachmentUrl(id: string): Promise<string> {
  const { data } = await api.get(`/patient/files/${id}/download`)
  return data.downloadUrl
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

export async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Seu navegador não permite lembretes automáticos.')
  }
  const registration = await navigator.serviceWorker.ready
  const { data } = await api.get('/patient/push/public-key')
  if (!data.publicKey) throw new Error('Lembretes ainda não estão disponíveis.')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  })
  await api.post('/patient/push/subscriptions', subscription.toJSON())
}
