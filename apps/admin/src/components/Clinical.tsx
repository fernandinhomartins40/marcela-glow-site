import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  FileSignature,
  FlaskConical,
  Pencil,
  Pill,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import {
  api,
  ConfirmDialog,
  EmptyState,
  errorMessage,
  Field,
  formatDateBR,
  FormRow,
  Modal,
  SubmitButton,
  Toolbar,
} from '../lib/ui'
import type { Patient } from './Patients'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type CatalogKind = 'MEDICATION' | 'EXAM' | 'GUIDANCE' | 'RECORD_TEMPLATE'
type Control = 'COMMON' | 'ANTIMICROBIAL' | 'CONTROLLED'
type DocumentKind = 'PRESCRIPTION' | 'EXAM_REQUEST' | 'GUIDANCE' | 'CERTIFICATE'

export interface CatalogItem {
  id: string
  kind: CatalogKind
  name: string
  subtitle: string | null
  body: string | null
  strength: string | null
  form: string | null
  route: string | null
  defaultDose: string | null
  defaultQty: string | null
  control: Control | null
  tussCode: string | null
  preparation: string | null
  usageCount: number
}

interface DocItem {
  id?: string
  catalogItemId?: string | null
  name: string
  strength?: string | null
  form?: string | null
  route?: string | null
  dose?: string | null
  quantity?: string | null
  notes?: string | null
  control?: Control
}

interface ClinicalDocument {
  id: string
  kind: DocumentKind
  title: string
  instructions: string
  status: string
  signedAt: string | null
  sentAt: string | null
  validUntil: string | null
  signatureLevel: string
  verificationCode: string | null
  createdAt: string
  items: DocItem[]
  patient: { id: string; name: string }
}

interface Compliance {
  required: string
  available: string
  compliant: boolean
  warning?: string
}

const CATALOG_META: Record<CatalogKind, { label: string; singular: string; icon: typeof Pill }> = {
  MEDICATION: { label: 'Medicamentos', singular: 'medicamento', icon: Pill },
  EXAM: { label: 'Exames', singular: 'exame', icon: FlaskConical },
  GUIDANCE: { label: 'Orientações', singular: 'orientação', icon: BookOpen },
  RECORD_TEMPLATE: { label: 'Modelos', singular: 'modelo', icon: FileSignature },
}

const CONTROL_META: Record<Control, { label: string; tone: string }> = {
  COMMON: { label: 'Comum', tone: 'neutral' },
  ANTIMICROBIAL: { label: 'Antimicrobiano', tone: 'warning' },
  CONTROLLED: { label: 'Controlado', tone: 'warning' },
}

const DOC_META: Record<DocumentKind, { label: string; singular: string }> = {
  PRESCRIPTION: { label: 'Receitas', singular: 'Receita' },
  EXAM_REQUEST: { label: 'Exames', singular: 'Solicitação de exames' },
  GUIDANCE: { label: 'Orientações', singular: 'Orientações' },
  CERTIFICATE: { label: 'Atestados', singular: 'Atestado' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo clínico
// ─────────────────────────────────────────────────────────────────────────────

export function ClinicalCatalog() {
  const client = useQueryClient()
  const [kind, setKind] = React.useState<CatalogKind>('MEDICATION')
  const [search, setSearch] = React.useState('')
  const [editing, setEditing] = React.useState<CatalogItem | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<CatalogItem | null>(null)

  const query = useQuery({
    queryKey: ['catalog', kind, search],
    queryFn: async () =>
      (await api.get('/clinical/catalog', { params: { kind, ...(search ? { search } : {}) } })).data as CatalogItem[],
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['catalog'] })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/clinical/catalog/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const meta = CATALOG_META[kind]
  const Icon = meta.icon
  const items = query.data ?? []

  return (
    <>
      <Toolbar>
        <div className="segmented" role="tablist">
          {(Object.keys(CATALOG_META) as CatalogKind[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              className={kind === k ? 'active' : ''}
              onClick={() => setKind(k)}
            >
              {CATALOG_META[k].label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={15} />
          <input placeholder={`Buscar ${meta.singular}`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Novo
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !items.length ? (
        <EmptyState
          title={`Nenhum ${meta.singular} cadastrado`}
          description="Os itens cadastrados aqui ficam disponíveis para montar receitas e documentos sem redigitar."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Cadastrar
            </button>
          }
        />
      ) : (
        <div className="data-list">
          {items.map((item) => (
            <article key={item.id} className="data-row">
              <div className="data-main static">
                <span className="data-avatar">
                  <Icon size={16} />
                </span>
                <span className="data-text">
                  <strong>
                    {item.name}
                    {item.control && item.control !== 'COMMON' && (
                      <span className={`chip ${CONTROL_META[item.control].tone}`}>
                        {CONTROL_META[item.control].label}
                      </span>
                    )}
                  </strong>
                  <span className="data-meta">
                    {item.subtitle && <span>{item.subtitle}</span>}
                    {item.strength && <span>{item.strength}</span>}
                    {item.form && <span>{item.form}</span>}
                    {item.tussCode && <span>TUSS {item.tussCode}</span>}
                    {item.usageCount > 0 && <span>{item.usageCount}× usado</span>}
                  </span>
                </span>
              </div>
              <span className="data-actions">
                <button onClick={() => setEditing(item)} title="Editar" aria-label="Editar item">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setRemoving(item)} title="Excluir" aria-label="Excluir item">
                  <Trash2 size={14} />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <CatalogForm
          kind={kind}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir do catálogo?"
          message={`"${removing.name}" deixa de aparecer ao montar documentos. Documentos já emitidos não mudam.`}
          confirmLabel="Excluir"
          danger
          pending={remove.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id)}
        />
      )}
    </>
  )
}

function CatalogForm({
  kind,
  item,
  onClose,
  onSaved,
}: {
  kind: CatalogKind
  item: CatalogItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    name: item?.name ?? '',
    subtitle: item?.subtitle ?? '',
    body: item?.body ?? '',
    strength: item?.strength ?? '',
    form: item?.form ?? '',
    route: item?.route ?? '',
    defaultDose: item?.defaultDose ?? '',
    defaultQty: item?.defaultQty ?? '',
    control: (item?.control ?? 'COMMON') as Control,
    tussCode: item?.tussCode ?? '',
    preparation: item?.preparation ?? '',
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { kind, name: form.name }
      if (kind === 'MEDICATION') {
        Object.assign(payload, {
          subtitle: form.subtitle || undefined,
          strength: form.strength || undefined,
          form: form.form || undefined,
          route: form.route || undefined,
          defaultDose: form.defaultDose || undefined,
          defaultQty: form.defaultQty || undefined,
          control: form.control,
        })
      } else if (kind === 'EXAM') {
        Object.assign(payload, {
          subtitle: form.subtitle || undefined,
          tussCode: form.tussCode || undefined,
          preparation: form.preparation || undefined,
        })
      } else {
        Object.assign(payload, { body: form.body || undefined })
      }
      if (item) await api.put(`/clinical/catalog/${item.id}`, payload)
      else await api.post('/clinical/catalog', payload)
    },
    onSuccess: onSaved,
  })

  const meta = CATALOG_META[kind]
  const valid = form.name.trim().length >= 2 && (kind === 'MEDICATION' || kind === 'EXAM' || form.body.trim().length >= 2)

  return (
    <Modal
      title={item ? `Editar ${meta.singular}` : `Novo ${meta.singular}`}
      onClose={onClose}
      wide={kind === 'GUIDANCE' || kind === 'RECORD_TEMPLATE'}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {item ? 'Salvar' : 'Cadastrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome" required>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>

        {kind === 'MEDICATION' && (
          <>
            <Field label="Princípio ativo">
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </Field>
            <FormRow cols={3}>
              <Field label="Concentração" hint="500mg">
                <input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
              </Field>
              <Field label="Forma" hint="comprimido">
                <input value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} />
              </Field>
              <Field label="Via" hint="oral">
                <input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Posologia padrão" hint="Sugerida ao usar na receita">
                <input value={form.defaultDose} onChange={(e) => setForm({ ...form, defaultDose: e.target.value })} />
              </Field>
              <Field label="Quantidade padrão">
                <input value={form.defaultQty} onChange={(e) => setForm({ ...form, defaultQty: e.target.value })} />
              </Field>
            </FormRow>
            <Field
              label="Controle sanitário"
              hint="Controlados e antimicrobianos exigem assinatura qualificada ICP-Brasil"
            >
              <select value={form.control} onChange={(e) => setForm({ ...form, control: e.target.value as Control })}>
                <option value="COMMON">Comum</option>
                <option value="ANTIMICROBIAL">Antimicrobiano</option>
                <option value="CONTROLLED">Controlado (Portaria 344/98)</option>
              </select>
            </Field>
          </>
        )}

        {kind === 'EXAM' && (
          <>
            <Field label="Descrição" hint="Sinônimos ajudam na busca">
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </Field>
            <FormRow>
              <Field label="Código TUSS">
                <input value={form.tussCode} onChange={(e) => setForm({ ...form, tussCode: e.target.value })} />
              </Field>
              <Field label="Preparo" hint="Jejum de 8 horas">
                <input value={form.preparation} onChange={(e) => setForm({ ...form, preparation: e.target.value })} />
              </Field>
            </FormRow>
          </>
        )}

        {(kind === 'GUIDANCE' || kind === 'RECORD_TEMPLATE') && (
          <Field
            label="Texto"
            required
            hint={kind === 'GUIDANCE' ? 'A paciente vê no portal' : 'Preenche o prontuário ao usar'}
          >
            <textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
        )}

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Documentos clínicos
// ─────────────────────────────────────────────────────────────────────────────

export function ClinicalDocuments() {
  const client = useQueryClient()
  const [kind, setKind] = React.useState<DocumentKind>('PRESCRIPTION')
  const [editing, setEditing] = React.useState<ClinicalDocument | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<ClinicalDocument | null>(null)
  const [signResult, setSignResult] = React.useState<{ compliance: Compliance; url: string; qr: string } | null>(null)

  const query = useQuery({
    queryKey: ['documents', kind],
    queryFn: async () => (await api.get('/clinical/documents', { params: { kind } })).data as ClinicalDocument[],
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['documents'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const sign = useMutation({
    mutationFn: async (id: string) => (await api.post(`/clinical/documents/${id}/sign`)).data,
    onSuccess: (data) => {
      setSignResult({ compliance: data.compliance, url: data.verificationUrl, qr: data.qrCodeDataUrl })
      refresh()
    },
  })
  const send = useMutation({
    mutationFn: (id: string) => api.post(`/clinical/documents/${id}/send`),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/clinical/documents/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const docs = query.data ?? []

  return (
    <>
      <Toolbar>
        <div className="segmented" role="tablist">
          {(['PRESCRIPTION', 'EXAM_REQUEST', 'GUIDANCE'] as DocumentKind[]).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
              {DOC_META[k].label}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          {DOC_META[kind].singular}
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !docs.length ? (
        <EmptyState
          title={`Nenhuma ${DOC_META[kind].singular.toLowerCase()}`}
          description="Documentos assinados ficam disponíveis no portal da paciente com código de verificação."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Criar
            </button>
          }
        />
      ) : (
        <div className="data-list">
          {docs.map((doc) => {
            const signed = !!doc.signedAt
            const expired = doc.validUntil ? new Date(doc.validUntil) < new Date() : false
            return (
              <article key={doc.id} className="data-row">
                <div className="data-main static">
                  <span className="data-text">
                    <strong>
                      {doc.title}
                      {signed ? (
                        <span className={`chip ${expired ? 'neutral' : 'success'}`}>
                          {expired ? 'Vencida' : 'Assinada'}
                        </span>
                      ) : (
                        <span className="chip neutral">Rascunho</span>
                      )}
                      {doc.sentAt && <span className="chip info">Enviada</span>}
                    </strong>
                    <span className="data-meta">
                      <span>{doc.patient.name}</span>
                      <span>{formatDateBR(doc.createdAt)}</span>
                      {doc.items.length > 0 && <span>{doc.items.length} item(ns)</span>}
                      {doc.validUntil && <span>Válida até {formatDateBR(doc.validUntil)}</span>}
                    </span>
                  </span>
                </div>
                <span className="data-actions">
                  {!signed && (
                    <button onClick={() => setEditing(doc)} title="Editar" aria-label="Editar documento">
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => sign.mutate(doc.id)}
                    disabled={signed || sign.isPending}
                    title={signed ? 'Já assinada' : 'Assinar'}
                    aria-label="Assinar documento"
                  >
                    <FileSignature size={14} />
                  </button>
                  <button onClick={() => send.mutate(doc.id)} disabled={send.isPending} title="Enviar à paciente" aria-label="Enviar">
                    <Send size={14} />
                  </button>
                  {!signed && (
                    <button onClick={() => setRemoving(doc)} title="Excluir" aria-label="Excluir documento">
                      <Trash2 size={14} />
                    </button>
                  )}
                </span>
              </article>
            )
          })}
        </div>
      )}

      {(sign.isError || send.isError) && <p className="error">{errorMessage(sign.error ?? send.error)}</p>}

      {editing && (
        <DocumentForm
          kind={kind}
          document={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {signResult && <SignResult result={signResult} onClose={() => setSignResult(null)} />}

      {removing && (
        <ConfirmDialog
          title="Excluir documento?"
          message={`"${removing.title}" de ${removing.patient.name} será removido permanentemente.`}
          confirmLabel="Excluir"
          danger
          pending={remove.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id)}
        />
      )}
    </>
  )
}

/** Resultado da assinatura: QR code, link e o aviso de conformidade legal. */
function SignResult({
  result,
  onClose,
}: {
  result: { compliance: Compliance; url: string; qr: string }
  onClose: () => void
}) {
  return (
    <Modal
      title="Documento assinado"
      subtitle="Compartilhe o código com a paciente"
      onClose={onClose}
      footer={<button onClick={onClose}>Fechar</button>}
    >
      <div className="form-grid">
        {!result.compliance.compliant && result.compliance.warning && (
          <div className="legal-warning">
            <AlertTriangle size={17} />
            <div>
              <strong>Atenção à validade legal</strong>
              <p>{result.compliance.warning}</p>
            </div>
          </div>
        )}

        {result.compliance.compliant && (
          <div className="legal-ok">
            <ShieldCheck size={17} />
            <div>
              <strong>Assinatura conforme</strong>
              <p>O documento atende ao nível de assinatura exigido.</p>
            </div>
          </div>
        )}

        <div className="qr-box">
          <img src={result.qr} alt="QR code de verificação" />
          <div>
            <p className="hint">A farmácia ou o laboratório confere o documento nesta página:</p>
            <code className="verify-url">{result.url}</code>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function DocumentForm({
  kind,
  document,
  onClose,
  onSaved,
}: {
  kind: DocumentKind
  document: ClinicalDocument | null
  onClose: () => void
  onSaved: () => void
}) {
  const [patientId, setPatientId] = React.useState(document?.patient.id ?? '')
  const [title, setTitle] = React.useState(document?.title ?? '')
  const [instructions, setInstructions] = React.useState(document?.instructions ?? '')
  const [items, setItems] = React.useState<DocItem[]>(document?.items ?? [])
  const [search, setSearch] = React.useState('')

  const patients = useQuery({
    queryKey: ['patients', '', false],
    queryFn: async () => (await api.get('/admin/patients')).data as Patient[],
  })

  // Medicamentos para receita, exames para pedido, orientações para o resto
  const catalogKind: CatalogKind = kind === 'PRESCRIPTION' ? 'MEDICATION' : kind === 'EXAM_REQUEST' ? 'EXAM' : 'GUIDANCE'

  const catalog = useQuery({
    queryKey: ['catalog', catalogKind, search],
    queryFn: async () =>
      (await api.get('/clinical/catalog', { params: { kind: catalogKind, ...(search ? { search } : {}) } }))
        .data as CatalogItem[],
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = { patientId, kind, title, instructions, items }
      if (document) await api.put(`/clinical/documents/${document.id}`, payload)
      else await api.post('/clinical/documents', payload)
    },
    onSuccess: onSaved,
  })

  function addFromCatalog(entry: CatalogItem) {
    if (catalogKind === 'GUIDANCE') {
      // Orientação entra como texto, não como item
      setInstructions((prev) => (prev ? `${prev}\n\n${entry.body ?? ''}` : entry.body ?? ''))
      return
    }
    setItems((prev) => [
      ...prev,
      {
        catalogItemId: entry.id,
        name: entry.name,
        strength: entry.strength,
        form: entry.form,
        route: entry.route,
        dose: entry.defaultDose,
        quantity: entry.defaultQty,
        notes: entry.preparation,
        control: entry.control ?? 'COMMON',
      },
    ])
    setSearch('')
  }

  function updateItem(index: number, patch: Partial<DocItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const needsItems = kind === 'PRESCRIPTION' || kind === 'EXAM_REQUEST'
  const valid = patientId && title.trim().length >= 2 && (!needsItems || items.length > 0 || instructions.trim().length >= 2)

  // Avisa antes de assinar, não depois
  const hasControlled = items.some((i) => i.control === 'CONTROLLED' || i.control === 'ANTIMICROBIAL')

  return (
    <Modal
      title={document ? 'Editar documento' : DOC_META[kind].singular}
      subtitle={document?.patient.name}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {document ? 'Salvar' : 'Criar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {!document && (
          <Field label="Paciente" required>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione…</option>
              {patients.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Título" required>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>

        {hasControlled && (
          <div className="legal-warning">
            <AlertTriangle size={17} />
            <div>
              <strong>Exige assinatura qualificada</strong>
              <p>
                Receitas com medicamento controlado ou antimicrobiano só têm validade em farmácia com
                assinatura ICP-Brasil (Lei 14.063/2020). Emita pela plataforma do CFM enquanto o
                certificado não estiver configurado aqui.
              </p>
            </div>
          </div>
        )}

        {/* Busca no catálogo */}
        <div>
          <span className="field-label">
            {catalogKind === 'MEDICATION' ? 'Adicionar medicamento' : catalogKind === 'EXAM' ? 'Adicionar exame' : 'Inserir orientação'}
          </span>
          <div className="search-box" style={{ marginTop: 5, maxWidth: 'none' }}>
            <Search size={15} />
            <input placeholder="Buscar no catálogo" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {search && (
            <div className="catalog-results">
              {catalog.data?.length ? (
                catalog.data.slice(0, 8).map((entry) => (
                  <button key={entry.id} type="button" onClick={() => addFromCatalog(entry)}>
                    <strong>{entry.name}</strong>
                    <span>
                      {[entry.strength, entry.form, entry.subtitle].filter(Boolean).join(' · ')}
                      {entry.control && entry.control !== 'COMMON' && ` · ${CONTROL_META[entry.control].label}`}
                    </span>
                  </button>
                ))
              ) : (
                <p className="hint" style={{ padding: '8px 10px' }}>
                  Nada encontrado. Cadastre em Catálogo clínico.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Itens do documento */}
        {items.length > 0 && (
          <div className="doc-items">
            {items.map((item, index) => (
              <div key={index} className="doc-item">
                <div className="doc-item-head">
                  <strong>
                    {item.name}
                    {item.strength ? ` ${item.strength}` : ''}
                  </strong>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} aria-label="Remover item">
                    <X size={14} />
                  </button>
                </div>
                {kind === 'PRESCRIPTION' ? (
                  <FormRow>
                    <Field label="Posologia">
                      <input value={item.dose ?? ''} onChange={(e) => updateItem(index, { dose: e.target.value })} />
                    </Field>
                    <Field label="Quantidade">
                      <input value={item.quantity ?? ''} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
                    </Field>
                  </FormRow>
                ) : (
                  <Field label="Observação">
                    <input value={item.notes ?? ''} onChange={(e) => updateItem(index, { notes: e.target.value })} />
                  </Field>
                )}
              </div>
            ))}
          </div>
        )}

        <Field
          label={kind === 'GUIDANCE' ? 'Orientações' : 'Observações gerais'}
          hint="A paciente lê isto no portal"
        >
          <textarea rows={kind === 'GUIDANCE' ? 10 : 4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </Field>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}
