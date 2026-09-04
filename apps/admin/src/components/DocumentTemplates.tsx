import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileSignature, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  FormRow,
  Modal,
  RowAction,
  SubmitButton,
  Toolbar,
} from '../lib/ui'
import { RichText } from '../lib/RichText'

/**
 * Biblioteca de modelos de documento.
 *
 * Guarda o que se repete: o conteúdo que já vem preenchido e o layout de
 * impressão. Emitir a partir de um modelo copia esses valores — o documento
 * segue independente, então ajustar o modelo depois não altera o que já foi
 * assinado.
 */

export type DocumentKind = 'PRESCRIPTION' | 'EXAM_REQUEST' | 'GUIDANCE' | 'CERTIFICATE'

export interface TemplateLayout {
  headerHtml?: string
  footerHtml?: string
  showClinicHeader?: boolean
  signaturePosition?: 'left' | 'center' | 'right'
  signatureSpaceMm?: number
  showVerificationQr?: boolean
  marginMm?: number
  fontFamily?: 'sans' | 'serif'
  fontSizePt?: number
  paper?: 'A4' | 'A5'
}

export interface DocumentTemplate {
  id: string
  name: string
  kind: DocumentKind
  title: string | null
  instructions: string | null
  items: { name: string; strength?: string | null; dose?: string | null; quantity?: string | null }[] | null
  layout: TemplateLayout | null
  isDefault: boolean
  isActive: boolean
  usageCount: number
}

const KIND_LABEL: Record<DocumentKind, string> = {
  PRESCRIPTION: 'Receita',
  EXAM_REQUEST: 'Pedido de exame',
  GUIDANCE: 'Orientação',
  CERTIFICATE: 'Atestado',
}

/** O que um modelo novo traz antes de a médica mexer. */
export const LAYOUT_PADRAO: TemplateLayout = {
  headerHtml: '',
  footerHtml: '',
  showClinicHeader: true,
  signaturePosition: 'center',
  signatureSpaceMm: 24,
  showVerificationQr: true,
  marginMm: 20,
  fontFamily: 'sans',
  fontSizePt: 11,
  paper: 'A4',
}

export function DocumentTemplates() {
  const client = useQueryClient()
  const [kind, setKind] = React.useState<DocumentKind>('PRESCRIPTION')
  const [editing, setEditing] = React.useState<DocumentTemplate | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<DocumentTemplate | null>(null)

  const query = useQuery({
    queryKey: ['templates', kind],
    queryFn: async () =>
      (await api.get('/clinical/templates', { params: { kind } })).data as DocumentTemplate[],
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['templates'] })

  const duplicate = useMutation({
    mutationFn: (id: string) => api.post(`/clinical/templates/${id}/duplicate`),
    onSuccess: refresh,
  })
  const setDefault = useMutation({
    mutationFn: (id: string) => api.put(`/clinical/templates/${id}`, { isDefault: true }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/clinical/templates/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const templates = query.data ?? []

  return (
    <>
      <Toolbar>
        <div className="segmented" role="tablist">
          {(Object.keys(KIND_LABEL) as DocumentKind[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              className={kind === k ? 'active' : ''}
              onClick={() => setKind(k)}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Novo modelo
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !templates.length ? (
        <EmptyState
          icon={FileSignature}
          title={`Nenhum modelo de ${KIND_LABEL[kind].toLowerCase()}`}
          description="Um modelo guarda o texto e os itens que se repetem, e o layout com que o documento é impresso. Ao emitir no atendimento, é só escolher."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Novo modelo
            </button>
          }
        />
      ) : (
        <DataList>
          {templates.map((t) => (
            <DataRow
              key={t.id}
              icon={FileSignature}
              title={t.name}
              chips={
                <>
                  {t.isDefault && <Chip tone="success">Padrão</Chip>}
                  {t.usageCount > 0 && <Chip tone="info">{t.usageCount}x usado</Chip>}
                </>
              }
              meta={
                <>
                  {t.items?.length ? <span>{t.items.length} item(ns)</span> : null}
                  {t.layout ? <span>Layout próprio</span> : <span>Layout padrão</span>}
                </>
              }
              actions={
                <>
                  {!t.isDefault && (
                    <RowAction
                      icon={Star}
                      title="Tornar padrão deste tipo"
                      onClick={() => setDefault.mutate(t.id)}
                      disabled={setDefault.isPending}
                    />
                  )}
                  <RowAction
                    icon={Copy}
                    title="Duplicar modelo"
                    onClick={() => duplicate.mutate(t.id)}
                    disabled={duplicate.isPending}
                  />
                  <RowAction icon={Pencil} title="Editar modelo" onClick={() => setEditing(t)} />
                  <RowAction icon={Trash2} title="Excluir modelo" onClick={() => setRemoving(t)} />
                </>
              }
            />
          ))}
        </DataList>
      )}

      {(duplicate.isError || setDefault.isError || remove.isError) && (
        <p className="error">{errorMessage(duplicate.error ?? setDefault.error ?? remove.error)}</p>
      )}

      {editing && (
        <TemplateForm
          kind={kind}
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir modelo?"
          message={`"${removing.name}" deixa de aparecer ao emitir. Documentos já criados a partir dele não mudam.`}
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

function TemplateForm({
  kind,
  template,
  onClose,
  onSaved,
}: {
  kind: DocumentKind
  template: DocumentTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const [aba, setAba] = React.useState<'conteudo' | 'layout'>('conteudo')
  const [name, setName] = React.useState(template?.name ?? '')
  const [title, setTitle] = React.useState(template?.title ?? '')
  const [instructions, setInstructions] = React.useState(template?.instructions ?? '')
  const [layout, setLayout] = React.useState<TemplateLayout>({ ...LAYOUT_PADRAO, ...(template?.layout ?? {}) })

  const setL = <K extends keyof TemplateLayout>(k: K, v: TemplateLayout[K]) =>
    setLayout((prev) => ({ ...prev, [k]: v }))

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        kind: template?.kind ?? kind,
        title: title || null,
        instructions: instructions || null,
        layout,
      }
      if (template) await api.put(`/clinical/templates/${template.id}`, payload)
      else await api.post('/clinical/templates', payload)
    },
    onSuccess: onSaved,
  })

  const valid = name.trim().length >= 2

  return (
    <Modal
      title={template ? 'Editar modelo' : 'Novo modelo'}
      subtitle={KIND_LABEL[template?.kind ?? kind]}
      onClose={onClose}
      wide
      footer={
        <>
          {!valid && <span className="footer-hint">Dê um nome ao modelo.</span>}
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {template ? 'Salvar modelo' : 'Criar modelo'}
          </SubmitButton>
        </>
      }
    >
      <div className="area-tabs" role="tablist">
        <button role="tab" aria-selected={aba === 'conteudo'} className={aba === 'conteudo' ? 'active' : ''} onClick={() => setAba('conteudo')}>
          Conteúdo
        </button>
        <button role="tab" aria-selected={aba === 'layout'} className={aba === 'layout' ? 'active' : ''} onClick={() => setAba('layout')}>
          Layout e impressão
        </button>
      </div>

      {aba === 'conteudo' ? (
        <div className="form-grid">
          <Field label="Nome do modelo" required hint="Só a equipe vê — é como o modelo aparece na hora de emitir">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Receita pós-botox" autoFocus />
          </Field>

          <Field label="Título sugerido" hint="Vai para o documento; a médica pode trocar ao emitir">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Receita pós-procedimento" />
          </Field>

          <Field label="Orientações" hint="Texto que já vem preenchido no documento">
            <textarea rows={8} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>

          {template?.items?.length ? (
            <div className="drawer-section">
              <p className="form-section-title">Itens do modelo</p>
              <p className="hint">
                {template.items.length} item(ns) gravados. Os itens são montados ao emitir, no atendimento.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="template-layout">
          <div className="form-grid">
            <p className="form-section-title">Cabeçalho</p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={layout.showClinicHeader ?? true}
                onChange={(e) => setL('showClinicHeader', e.target.checked)}
              />
              <span>Imprimir nome, endereço e telefone da clínica no topo</span>
            </label>

            <Field label="Cabeçalho livre" hint="Aparece abaixo dos dados da clínica">
              <RichText
                value={layout.headerHtml ?? ''}
                onChange={(v) => setL('headerHtml', v)}
                placeholder="Ex.: especialidade, registro profissional…"
              />
            </Field>

            <p className="form-section-title">Rodapé</p>
            <Field label="Texto do rodapé">
              <RichText
                value={layout.footerHtml ?? ''}
                onChange={(v) => setL('footerHtml', v)}
                placeholder="Ex.: endereço, redes sociais, aviso legal…"
              />
            </Field>

            <p className="form-section-title">Assinatura</p>
            <FormRow>
              <Field label="Posição">
                <select
                  value={layout.signaturePosition ?? 'center'}
                  onChange={(e) => setL('signaturePosition', e.target.value as TemplateLayout['signaturePosition'])}
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </Field>
              <Field label="Espaço acima da linha" hint="Milímetros reservados para a assinatura à mão">
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={layout.signatureSpaceMm ?? 24}
                  onChange={(e) => setL('signatureSpaceMm', Number(e.target.value))}
                />
              </Field>
            </FormRow>

            <label className="check-row">
              <input
                type="checkbox"
                checked={layout.showVerificationQr ?? true}
                onChange={(e) => setL('showVerificationQr', e.target.checked)}
              />
              <span>Imprimir o QR de verificação junto da assinatura</span>
            </label>

            <p className="form-section-title">Página</p>
            <FormRow cols={3}>
              <Field label="Papel">
                <select value={layout.paper ?? 'A4'} onChange={(e) => setL('paper', e.target.value as 'A4' | 'A5')}>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                </select>
              </Field>
              <Field label="Margem (mm)">
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={layout.marginMm ?? 20}
                  onChange={(e) => setL('marginMm', Number(e.target.value))}
                />
              </Field>
              <Field label="Corpo (pt)">
                <input
                  type="number"
                  min={8}
                  max={16}
                  value={layout.fontSizePt ?? 11}
                  onChange={(e) => setL('fontSizePt', Number(e.target.value))}
                />
              </Field>
            </FormRow>

            <Field label="Fonte">
              <select
                value={layout.fontFamily ?? 'sans'}
                onChange={(e) => setL('fontFamily', e.target.value as 'sans' | 'serif')}
              >
                <option value="sans">Sem serifa</option>
                <option value="serif">Com serifa</option>
              </select>
            </Field>
          </div>

          <TemplatePreview layout={layout} title={title || 'Título do documento'} instructions={instructions} />
        </div>
      )}

      {save.isError && <p className="error">{errorMessage(save.error)}</p>}
    </Modal>
  )
}

/**
 * Prévia da folha impressa.
 *
 * Vale mais que qualquer descrição dos campos: mexer na margem ou na posição da
 * assinatura e ver o efeito na hora é o que torna o editor utilizável por quem
 * não pensa em milímetros.
 */
function TemplatePreview({
  layout,
  title,
  instructions,
}: {
  layout: TemplateLayout
  title: string
  instructions: string
}) {
  const alinhamento = layout.signaturePosition ?? 'center'
  return (
    <aside className="template-preview" aria-label="Prévia da impressão">
      <p className="preview-caption">Prévia — {layout.paper ?? 'A4'}</p>
      <div
        className={`preview-sheet ${layout.paper === 'A5' ? 'is-a5' : ''}`}
        style={{
          padding: `${layout.marginMm ?? 20}px`,
          fontSize: `${layout.fontSizePt ?? 11}px`,
          fontFamily: layout.fontFamily === 'serif' ? 'Georgia, serif' : 'inherit',
        }}
      >
        {layout.showClinicHeader !== false && (
          <div className="preview-clinic">
            <strong>Clínica Dra. Marcela Duch</strong>
            <span>Av. 16, nº 890 — Chapadão do Sul/MS · (67) 99944-6066</span>
          </div>
        )}
        {layout.headerHtml && (
          <div className="preview-rich" dangerouslySetInnerHTML={{ __html: layout.headerHtml }} />
        )}

        <h4 className="preview-title">{title}</h4>
        <p className="preview-patient">Paciente: Nome da paciente</p>
        <div className="preview-body">
          {instructions ? instructions.slice(0, 220) : 'Conteúdo do documento…'}
        </div>

        <div className="preview-signature" style={{ textAlign: alinhamento }}>
          <div style={{ height: `${layout.signatureSpaceMm ?? 24}px` }} />
          <span className="preview-line" />
          <span className="preview-signer">Dra. Marcela Duch</span>
          {layout.showVerificationQr !== false && <span className="preview-qr" aria-hidden="true" />}
        </div>

        {layout.footerHtml && (
          <div className="preview-rich preview-footer" dangerouslySetInnerHTML={{ __html: layout.footerHtml }} />
        )}
      </div>
    </aside>
  )
}
