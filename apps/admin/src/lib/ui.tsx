import React from 'react'
import axios from 'axios'
import { AlertTriangle, Download, Loader2, Paperclip, Search, Upload, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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

// ─────────────────────────────────────────────────────────────────────────────
// Blocos de lista — a mesma linha aparecia copiada em oito lugares (catálogo,
// pacientes, insumos, documentos, anexos, sessões). Copiada, ela também
// divergia: a aba de arquivos da paciente tinha perdido o EmptyState e o
// estado de "abrindo" que a mesma lista no atendimento já tinha.
// ─────────────────────────────────────────────────────────────────────────────

export type { Tone } from './tone'
import type { Tone } from './tone'

/** Pastilha de status. Antes era `<span className={`chip ${tone}`}>` solto. */
export function Chip({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
}: {
  tone?: Tone
  icon?: LucideIcon
  title?: string
  children: React.ReactNode
}) {
  return (
    <span className={`chip ${tone}`} title={title}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  )
}

/**
 * Linha de lista do painel: ícone, título (com pastilhas), metadados e ações.
 *
 * `onOpen` decide a semântica: com ele a área principal é um `<button>` de
 * verdade — foco pelo teclado e leitor de tela anunciam que abre algo; sem ele
 * é um `<div>` inerte, sem cursor de clique prometendo o que não acontece.
 */
export function DataRow({
  icon: Icon,
  title,
  chips,
  meta,
  counts,
  actions,
  leading,
  onOpen,
  openLabel,
  dimmed,
  className,
}: {
  /** Sem ícone a linha fica só com o texto — usado nas listas de documentos. */
  icon?: LucideIcon
  title: React.ReactNode
  chips?: React.ReactNode
  meta?: React.ReactNode
  counts?: React.ReactNode
  actions?: React.ReactNode
  /** Célula antes do corpo — a agenda põe a hora ali (`.encounter-row`). */
  leading?: React.ReactNode
  onOpen?: () => void
  openLabel?: string
  dimmed?: boolean
  className?: string
}) {
  const body = (
    <>
      {Icon && (
        <span className="data-avatar">
          <Icon size={16} aria-hidden="true" />
        </span>
      )}
      <span className="data-text">
        <strong>
          {title}
          {chips}
        </strong>
        {meta && <span className="data-meta">{meta}</span>}
      </span>
    </>
  )

  return (
    <article className={`data-row ${dimmed ? 'archived' : ''} ${className ?? ''}`.trim()}>
      {leading}
      {onOpen ? (
        <button className="data-main" onClick={onOpen} aria-label={openLabel}>
          {body}
        </button>
      ) : (
        <div className="data-main static">{body}</div>
      )}
      {counts && <span className="data-counts">{counts}</span>}
      {actions && <span className="data-actions">{actions}</span>}
    </article>
  )
}

/** Contêiner das linhas — existe para ninguém precisar lembrar da classe. */
export function DataList({ children }: { children: React.ReactNode }) {
  return <div className="data-list">{children}</div>
}

/** Botão-ícone das ações de linha. `title` vira também o rótulo acessível. */
export function RowAction({
  icon: Icon,
  title,
  onClick,
  disabled,
  primary,
}: {
  icon: LucideIcon
  title: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      className={primary ? 'primary' : undefined}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <Icon size={14} aria-hidden="true" />
    </button>
  )
}

/**
 * Campo de busca da barra de ferramentas. O `<input>` estava solto em quatro
 * telas, sempre sem rótulo — o placeholder some ao digitar e o leitor de tela
 * ficava sem nada. Aqui o placeholder vira `aria-label`, e `type="search"`
 * dá o botão de limpar nativo, que ajuda no toque.
 */
export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
  style,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`search-box ${className ?? ''}`.trim()} style={style}>
      <Search size={15} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

/**
 * Lista de anexos da paciente — idêntica no prontuário e na ficha, incluindo o
 * upload. Ficava duplicada em dois componentes que já haviam divergido.
 */
export function AttachmentsPanel({
  patientId,
  attachments,
  onChanged,
}: {
  patientId: string
  attachments: Array<{ id: string; fileName: string; createdAt: string; sizeBytes?: number | null }>
  onChanged: () => void
}) {
  const [opening, setOpening] = React.useState<string | null>(null)

  async function open(id: string) {
    setOpening(id)
    try {
      const { data } = await api.get(`/admin/files/${id}/download`)
      window.open(data.downloadUrl, '_blank', 'noopener')
    } finally {
      setOpening(null)
    }
  }

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">Exames, fotos e laudos</span>
        <FileUploadButton patientId={patientId} onUploaded={onChanged} />
      </Toolbar>

      {!attachments.length ? (
        <EmptyState
          title="Nenhum arquivo"
          description="Anexe exames trazidos pela paciente ou fotos do antes e depois."
        />
      ) : (
        <DataList>
          {attachments.map((file) => (
            <DataRow
              key={file.id}
              icon={Paperclip}
              title={file.fileName}
              meta={
                <>
                  <span>{formatDateBR(file.createdAt)}</span>
                  {file.sizeBytes != null && (
                    <span>{Math.max(1, Math.round(file.sizeBytes / 1024))} KB</span>
                  )}
                </>
              }
              actions={
                <RowAction
                  icon={Download}
                  title="Abrir arquivo"
                  onClick={() => open(file.id)}
                  disabled={opening === file.id}
                />
              }
            />
          ))}
        </DataList>
      )}
    </>
  )
}
