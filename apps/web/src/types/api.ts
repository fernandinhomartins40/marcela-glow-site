export type UserRole = 'ADMIN' | 'STAFF'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  address: string
  logoUrl?: string | null
  isActive: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  tenantId: string
}

export interface Procedure {
  id: string
  number: string
  title: string
  subtitle: string
  description: string
  imageUrl?: string | null
  isActive: boolean
  displayOrder: number
  tenantId: string
}

export interface Appointment {
  id: string
  name: string
  email: string
  phone: string
  message?: string | null
  status: AppointmentStatus
  procedureId?: string | null
  procedure?: Procedure | null
  tenantId: string
  scheduledAt?: string | null
  createdAt: string
}

export interface Testimonial {
  id: string
  authorName: string
  text: string
  rating: number
  isVisible: boolean
  displayOrder: number
  tenantId: string
}

export interface AuthResponse {
  token: string
  user: User
  tenant: Tenant
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
