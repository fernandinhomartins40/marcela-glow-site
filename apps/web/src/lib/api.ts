import axios, { AxiosError } from 'axios'
import type {
  AuthResponse,
  Procedure,
  Appointment,
  Testimonial,
  PaginatedResponse,
} from '../types/api'

const TENANT_SLUG = 'marcela-duch'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    return Promise.reject(error)
  }
)

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return 'Erro inesperado. Tente novamente.'
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
      tenantSlug: TENANT_SLUG,
    })
    return data
  },

  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
      tenantSlug: TENANT_SLUG,
    })
    return data
  },

  me: async (): Promise<AuthResponse['user']> => {
    const { data } = await api.get('/auth/me')
    return data
  },
}

// ─── Procedures ──────────────────────────────────────────────────────────────

export const proceduresApi = {
  list: async (): Promise<Procedure[]> => {
    const { data } = await api.get<Procedure[]>('/procedures', {
      params: { tenantSlug: TENANT_SLUG },
    })
    return data
  },

  get: async (id: string): Promise<Procedure> => {
    const { data } = await api.get<Procedure>(`/procedures/${id}`, {
      params: { tenantSlug: TENANT_SLUG },
    })
    return data
  },
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface AppointmentPayload {
  name: string
  email: string
  phone: string
  procedure?: string
  message?: string
  /** ISO 8601 do horário escolhido; ausente quando a paciente só pede contato */
  scheduledAt?: string
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

export const availabilityApi = {
  list: async (procedureId?: string, days = 14): Promise<DayAvailability[]> => {
    const { data } = await api.get('/appointments/availability', {
      params: { tenantSlug: TENANT_SLUG, days, ...(procedureId ? { procedureId } : {}) },
    })
    return data.days ?? []
  },
}

export const appointmentsApi = {
  create: async (payload: AppointmentPayload): Promise<Appointment> => {
    const { data } = await api.post<Appointment>('/appointments', {
      ...payload,
      tenantSlug: TENANT_SLUG,
    })
    return data
  },

  list: async (
    page = 1,
    status?: string
  ): Promise<PaginatedResponse<Appointment>> => {
    const { data } = await api.get<PaginatedResponse<Appointment>>(
      '/appointments',
      { params: { page, status } }
    )
    return data
  },

  update: async (
    id: string,
    payload: Partial<{ status: string; scheduledAt: string; message: string }>
  ): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}`, payload)
    return data
  },
}

// ─── Testimonials ────────────────────────────────────────────────────────────

export const testimonialsApi = {
  list: async (): Promise<Testimonial[]> => {
    const { data } = await api.get<Testimonial[]>('/testimonials', {
      params: { tenantSlug: TENANT_SLUG },
    })
    return data
  },
}

// ─── Newsletter ──────────────────────────────────────────────────────────────

export const newsletterApi = {
  subscribe: async (email: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(
      '/newsletter/subscribe',
      { email, tenantSlug: TENANT_SLUG }
    )
    return data
  },
}

export { getErrorMessage }
export default api
