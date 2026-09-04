import React from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useDebounced } from './useDebounced'
import { AlertTriangle, ArrowLeft, Download, Loader2, Paperclip, Search, Upload, UserRound, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const TOKEN_KEY = 'admin_token'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Sessão expirada ou revogada volta para o login em vez de virar erro de tela.
 *
 * A sessão dura 7 dias e o painel só checava se *existe* token guardado, nunca
 * se ele ainda vale: com token velho, as seis chamadas do painel voltavam 401 e
 * a tela dizia "Não foi possível carregar a API" — que parece backend fora do
 * ar. Sem sair e entrar de novo, não havia como se recuperar.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    // 403 é permissão faltando para esta conta: continua sendo erro de tela.
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'marcela-duch'

export function errorMessage(error: unknown, fallback = 'Não foi possível concluir.') {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Página de formulário/detalhe usada por todos os cadastros e edições.
 * Substituiu a gaveta lateral: formulário ocupa a tela inteira como uma página
 * de verdade, com botão Voltar no topo e ações fixas no rodapé.
 */
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
  // Esc volta — atalho esperado ao sair de uma página aberta por cima
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // A página de fundo não rola enquanto esta está aberta
  React.useEffect(() => {
    document.body.classList.add('page-lock')
    return () => document.body.classList.remove('page-lock')
  }, [])

  const ref = React.useRef<HTMLDivElement>(null)

  /* Foco no primeiro campo ao abrir. Como página, ela substitui a tela e não
     flutua sobre ela: quem abriu um cadastro veio para digitar, e sem isto o
     foco fica no botão da lista que ficou atrás. Campo desabilitado ou somente
     leitura é pulado; não havendo nenhum, o foco vai para o container, para o
     leitor de tela anunciar o título em vez de continuar na lista anterior. */
  React.useEffect(() => {
    const root = ref.current
    if (!root) return
    const alvo = root.querySelector<HTMLElement>(
      '.page-view-body input:not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]), .page-view-body textarea:not([disabled]):not([readonly]), .page-view-body select:not([disabled])',
    )
    if (alvo) alvo.focus()
    else root.focus()
  }, [])

  /* Renderiza no <body>, não onde foi chamado. Um formulário aberto de dentro de
     `.data-actions` (cujos botões são quadrados de 30px) herdava aquele CSS e
     saía com os próprios botões espremidos — o resultado dependia do lugar
     em que a chamada estava escrita. A classe `drawer` permanece no container
     de propósito: os blocos internos (drawer-body, drawer-facts, drawer-actions)
     continuam herdados das regras existentes. */
  return ReactDOM.createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      className={`drawer page-view ${wide ? 'is-wide' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="page-view-bar">
        <button className="page-back" onClick={onClose} aria-label="Voltar">
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="page-view-heading">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="drawer-body page-view-body">{children}</div>
      {/* O invólucro interno alinha as ações à mesma coluna do formulário: a
          barra atravessa a tela, mas os botões terminam onde o último campo
          termina. */}
      {footer && (
        <div className="drawer-footer page-view-footer">
          <div className="page-view-actions">{footer}</div>
        </div>
      )}
    </div>,
    document.body,
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
  // Mesmo motivo do Modal: fora da árvore de quem chamou (ver acima).
  return ReactDOM.createPortal(
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
    </div>,
    document.body,
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={22} aria-hidden="true" className="empty-icon" />}
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

/** Separa o texto guardado no banco na lista de itens que a tela edita. */
export function splitTags(value?: string | null): string[] {
  return (value ?? '')
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Junta de volta no formato que o banco (e o resto do sistema) já lê. */
export function joinTags(tags: string[]): string {
  return tags.join(', ')
}

/**
 * Campo de lista por tags.
 *
 * Alergia, medicação e comorbidade viram alerta no atendimento e antes de
 * prescrever, mas eram digitadas em texto corrido: a separação ficava por conta
 * de quem preenchia, e "dipirona e latex" virava um alerta só. Em tags cada item
 * é uma unidade — dá para conferir e remover um sem reescrever a frase.
 *
 * O valor continua sendo texto separado por vírgula, então nada muda no banco
 * nem em quem já lê esses campos. O que estava escrito com ponto e vírgula ou em
 * linhas separadas também é reconhecido na leitura.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const [rascunho, setRascunho] = React.useState('')
  /* Ultima tag fechada por espaco. Guardada para o espaco seguinte poder
     desfazer: "losartana" vira tag, o segundo espaco a traz de volta como
     texto e continua "losartana 50mg". */
  const [fechadaPorEspaco, setFechadaPorEspaco] = React.useState<string | null>(null)
  const tags = splitTags(value)

  const adicionar = (texto: string) => {
    const limpo = texto.trim().replace(/[,;]+$/, '').trim()
    if (!limpo) return
    // Repetido não entra: duas vezes "dipirona" não é mais informação.
    if (tags.some((t) => t.toLowerCase() === limpo.toLowerCase())) {
      setRascunho('')
      return
    }
    onChange(joinTags([...tags, limpo]))
    setRascunho('')
  }

  const remover = (alvo: string) => onChange(joinTags(tags.filter((t) => t !== alvo)))

  return (
    <div className="tag-input">
      {tags.length > 0 && (
        <ul className="tag-list">
          {tags.map((tag) => (
            <li key={tag}>
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => remover(tag)}
                aria-label={`Remover ${tag}`}
                title={`Remover ${tag}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="text"
        value={rascunho}
        aria-label={ariaLabel}
        placeholder={tags.length ? 'Adicionar outro…' : placeholder}
        onChange={(e) => {
          // Colar uma lista pronta ("dipirona, látex") vira várias tags de uma vez.
          const texto = e.target.value
          if (/[,;]/.test(texto)) {
            const partes = splitTags(texto)
            const ultimo = /[,;]\s*$/.test(texto) ? '' : partes.pop() ?? ''
            for (const p of partes) adicionar(p)
            setRascunho(ultimo)
            return
          }
          setRascunho(texto)
        }}
        onKeyDown={(e) => {
          /* Espaço fecha a tag; um segundo espaço desfaz e continua o texto.

             A maioria do que se digita aqui é uma palavra só ("dipirona",
             "látex"), e exigir Enter para cada uma trava a digitação. Mas dose
             vem em duas partes ("losartana 50mg"), e não dá para adivinhar:
             no instante do espaço, "losartana" ainda não tem nada que a
             distinga de "dipirona".

             Por isso o desfazer é explícito. O espaço fecha; se o item ainda
             continuava, o próximo espaço traz a tag de volta como texto e a
             digitação segue. Enter e Tab fecham sem esse desfazer. */
          if (e.key === ' ') {
            e.preventDefault()
            const texto = rascunho.trim()
            if (!texto) {
              if (fechadaPorEspaco) {
                remover(fechadaPorEspaco)
                setRascunho(fechadaPorEspaco + ' ')
                setFechadaPorEspaco(null)
              }
              return
            }
            adicionar(texto)
            setFechadaPorEspaco(texto)
            return
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            if (!rascunho.trim()) return
            e.preventDefault()
            adicionar(rascunho)
            return
          }
          // Apagar com o campo vazio tira a última tag, como em campo de e-mail.
          if (e.key === 'Backspace' && !rascunho && tags.length) {
            e.preventDefault()
            remover(tags[tags.length - 1])
          }
        }}
        // Sair do campo não pode perder o que foi digitado e não confirmado.
        onBlur={() => adicionar(rascunho)}
      />
    </div>
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
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
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
        autoFocus={autoFocus}
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

/**
 * Busca e escolha de paciente, com a lista aparecendo conforme se digita.
 *
 * Substitui o `<select size={6}>` que havia nos formulários de atendimento:
 * ali a lista chegava inteira do servidor, nada indicava que a escolha tinha
 * sido registrada, e num celular o select nativo com seis linhas é um alvo de
 * toque ruim. Aqui cada resultado é um botão, e a paciente escolhida vira um
 * cartão com opção de trocar — o estado fica visível.
 */
/** Só o que a busca devolve e a escolha precisa mostrar — não a ficha inteira. */
export interface PatientOption {
  id: string
  name: string
  email: string
  phone?: string | null
}

export function PatientSearchSelect({
  value,
  onChange,
  autoFocus,
  emptyHint,
}: {
  value: PatientOption | null
  onChange: (patient: PatientOption | null) => void
  autoFocus?: boolean
  emptyHint?: React.ReactNode
}) {
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search)

  /* Duas letras antes de consultar: uma só devolve quase o cadastro inteiro, o
     que não ajuda a achar ninguém e ainda gasta uma requisição por tecla. */
  const termo = debounced.trim()
  const buscando = termo.length >= 2

  const query = useQuery({
    queryKey: ['patient-search', termo],
    queryFn: async () =>
      (await api.get('/admin/patients', { params: { search: termo } })).data as PatientOption[],
    // Sem termo não há o que consultar: a lista inteira só atrapalha quem
    // procura uma paciente específica.
    enabled: buscando,
    staleTime: 30_000,
  })

  if (value) {
    return (
      <div className="picked-row">
        <span className="data-avatar">
          <UserRound size={16} aria-hidden="true" />
        </span>
        <span className="data-text">
          <strong>{value.name}</strong>
          <span className="data-meta">
            <span>{value.email}</span>
            {value.phone && <span>{maskPhone(value.phone)}</span>}
          </span>
        </span>
        <button type="button" onClick={() => onChange(null)}>
          Trocar
        </button>
      </div>
    )
  }

  const results = query.data ?? []

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, e-mail, telefone ou CPF"
        autoFocus={autoFocus}
      />

      {!buscando ? (
        <p className="hint">
          {search.trim() ? 'Digite ao menos duas letras.' : 'Digite para buscar uma paciente.'}
          {emptyHint ? <> {emptyHint}</> : null}
        </p>
      ) : query.isLoading ? (
        <p className="hint">Buscando...</p>
      ) : results.length ? (
        <div className="catalog-results" role="listbox" aria-label="Pacientes encontradas">
          {results.slice(0, 20).map((patient) => (
            <button
              key={patient.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onChange(patient)}
            >
              <strong>{patient.name}</strong>
              <span>
                {[patient.email, patient.phone ? maskPhone(patient.phone) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="hint">
          Nenhuma paciente encontrada para “{termo}”.
          {emptyHint ? <> {emptyHint}</> : null}
        </p>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Papéis e permissões — vocabulário da clínica, não o do banco
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administradora',
  STAFF: 'Equipe',
  DOCTOR: 'Médica',
  RECEPTION: 'Recepção',
  ASSISTANT: 'Assistente',
  CONTENT_EDITOR: 'Conteúdo',
  FINANCE: 'Financeiro',
}

export const ROLE_HINTS: Record<string, string> = {
  ADMIN: 'Acesso total, inclusive à gestão da equipe.',
  DOCTOR: 'Prontuário, prescrição e assinatura digital.',
  STAFF: 'Agenda, leads e leitura das fichas.',
  RECEPTION: 'Agenda, leads e cadastro de pacientes.',
  ASSISTANT: 'Leitura de fichas e anexos, sem editar.',
  CONTENT_EDITOR: 'Somente o conteúdo do site.',
  FINANCE: 'Números e configurações, sem dado clínico.',
}

/**
 * As permissões vêm do banco em MAIÚSCULA_COM_UNDERSCORE. Ninguém da clínica
 * decide sobre "PRESCRIPTION_SIGN" — decide sobre "assinar receita".
 */
export const PERMISSION_GROUPS: { id: string; label: string; items: { id: string; label: string }[] }[] = [
  {
    id: 'clinico',
    label: 'Clínico',
    items: [
      { id: 'PATIENT_READ', label: 'Ver pacientes' },
      { id: 'PATIENT_WRITE', label: 'Cadastrar e editar pacientes' },
      { id: 'RECORD_READ', label: 'Ver prontuário' },
      { id: 'RECORD_WRITE', label: 'Escrever no prontuário' },
      { id: 'PRESCRIPTION_READ', label: 'Ver receitas' },
      { id: 'PRESCRIPTION_WRITE', label: 'Emitir receitas' },
      { id: 'PRESCRIPTION_SIGN', label: 'Assinar receitas digitalmente' },
    ],
  },
  {
    id: 'agenda',
    label: 'Agenda e relacionamento',
    items: [
      { id: 'APPOINTMENT_READ', label: 'Ver agenda' },
      { id: 'APPOINTMENT_WRITE', label: 'Marcar e alterar horários' },
      { id: 'LEAD_READ', label: 'Ver leads' },
      { id: 'LEAD_WRITE', label: 'Trabalhar os leads' },
      { id: 'NOTIFICATION_SEND', label: 'Enviar avisos às pacientes' },
    ],
  },
  {
    id: 'site',
    label: 'Site e arquivos',
    items: [
      { id: 'CMS_READ', label: 'Ver o conteúdo do site' },
      { id: 'CMS_WRITE', label: 'Editar o site' },
      { id: 'FILE_MANAGE', label: 'Enviar e baixar arquivos' },
    ],
  },
  {
    id: 'administracao',
    label: 'Administração',
    items: [
      { id: 'DASHBOARD_READ', label: 'Ver o painel de números' },
      { id: 'SETTINGS_READ', label: 'Ver configurações' },
      { id: 'SETTINGS_WRITE', label: 'Alterar configurações' },
      { id: 'USER_MANAGE', label: 'Gerenciar a equipe e os acessos' },
      { id: 'AUDIT_READ', label: 'Ler o registro de auditoria' },
    ],
  },
]

export function permissionLabel(id: string) {
  for (const group of PERMISSION_GROUPS) {
    const found = group.items.find((item) => item.id === id)
    if (found) return found.label
  }
  return id
}
