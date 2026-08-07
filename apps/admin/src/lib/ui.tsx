import React from 'react'
import axios from 'axios'
import { AlertTriangle, Loader2, Upload, X } from 'lucide-react'

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

/**
 * Envio de arquivo já vinculado à paciente (exame, foto, laudo). O upload vai
 * direto ao S3 por URL assinada; a API só registra o anexo no fim.
 */
export function FileUploadButton({
  patientId,
  onUploaded,
  label = 'Anexar arquivo',
}: {
  patientId: string
  onUploaded?: () => void
  label?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function upload(file: File) {
    setPending(true)
    setError(null)
    try {
      const meta = {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        patientId,
        visibility: 'PATIENT_VISIBLE',
      }
      const presign = await api.post('/admin/files/presign', meta)
      await axios.put(presign.data.uploadUrl, file, { headers: { 'Content-Type': meta.mimeType } })
      await api.post('/admin/files/complete', { ...meta, storageKey: presign.data.storageKey })
      onUploaded?.()
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível enviar o arquivo.'))
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
        }}
      />
      <button className="primary" onClick={() => inputRef.current?.click()} disabled={pending}>
        {pending ? <Loader2 size={14} className="spin" /> : <Upload size={15} />}
        {pending ? 'Enviando...' : label}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Máscaras — a recepção digita só os números; a pontuação aparece sozinha.
// Guardamos sempre os dígitos crus: a API normaliza e o banco compara sem
// depender de formatação.
// ─────────────────────────────────────────────────────────────────────────────

export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{5})(\d)/, '$1-$2')
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

/**
 * Validação real do CPF pelos dígitos verificadores. Erro de digitação num
 * documento que vai para receita e atestado precisa ser pego no cadastro.
 */
export function isValidCPF(value: string): boolean {
  const d = value.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false

  const digit = (slice: number) => {
    let sum = 0
    for (let i = 0; i < slice; i++) sum += Number(d[i]) * (slice + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return digit(9) === Number(d[9]) && digit(10) === Number(d[10])
}

export function formatCPF(value?: string | null) {
  return value ? maskCPF(value) : '—'
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
