import React from 'react'
import axios from 'axios'
import { AlertTriangle, Loader2, X } from 'lucide-react'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'marcela-duch'

export function errorMessage(error: unknown, fallback = 'Não foi possível concluir.') {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}

/** Painel lateral usado por todos os formulários de cadastro e edição. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  // Esc fecha — atalho esperado em formulário sobreposto
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className={`drawer ${wide ? 'drawer-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </aside>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className="form-row" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  )
}

export function SubmitButton({
  pending,
  children,
  disabled,
  onClick,
}: {
  pending?: boolean
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button className="primary" onClick={onClick} disabled={pending || disabled}>
      {pending && <Loader2 size={14} className="spin" />}
      {children}
    </button>
  )
}

/** Confirmação para ações destrutivas — nada some sem o usuário confirmar. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  pending,
  danger,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  danger?: boolean
}) {
  return (
    <div className="drawer-backdrop confirm-backdrop" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label={title}>
        <div className={`confirm-icon ${danger ? 'danger' : ''}`}>
          <AlertTriangle size={18} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
          <button className={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 size={14} className="spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {description && <p className="empty-desc">{description}</p>}
      {action}
    </div>
  )
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="toolbar">{children}</div>
}

export function formatMoney(cents?: number | null) {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "1.234,56" -> 123456 centavos */
export function parseMoney(value: string): number | undefined {
  const clean = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!clean) return undefined
  const num = Number(clean)
  return Number.isFinite(num) ? Math.round(num * 100) : undefined
}

export function formatDateBR(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

/** ISO -> "2026-08-12" para <input type="date"> */
export function toDateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
