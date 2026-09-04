import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { api, ConfirmDialog, errorMessage, Field, FormRow, Modal, SubmitButton } from '../../lib/ui'
import { RichText } from '../../lib/RichText'
import { sampleValues } from '../../lib/docFields'
import { LogoField } from './LogoField'
import { Sheet } from './Sheet'
import {
  BLOCK_META,
  CORES_PADRAO,
  ESSENCIAIS,
  inserirNaOrdem,
  blocosPadrao,
  ensureBlocks,
  novoBloco,
  tiposDisponiveis,
  type Block,
  type BlockType,
  type Brand,
  type TemplateLayout,
} from './blocks'
import type { DocumentKind, DocumentTemplate } from '../DocumentTemplates'

const KIND_LABEL: Record<DocumentKind, string> = {
  PRESCRIPTION: 'Receita',
  EXAM_REQUEST: 'Pedido de exame',
  GUIDANCE: 'Orientação',
  CERTIFICATE: 'Atestado',
}

/**
 * Editor do modelo: conteúdo, folha e marca, com a prévia sempre ao lado.
 *
 * A folha é montada em blocos que a médica adiciona, reordena e remove — em vez
 * de campos fixos de cabeçalho e rodapé, que só serviam para um arranjo. Clicar
 * num bloco da prévia abre as opções dele.
 */
export function TemplateForm({
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
  const [aba, setAba] = React.useState<'conteudo' | 'folha' | 'marca'>('conteudo')
  const [name, setName] = React.useState(template?.name ?? '')
  const [title, setTitle] = React.useState(template?.title ?? '')
  const [instructions, setInstructions] = React.useState(template?.instructions ?? '')

  const layoutInicial = (template?.layout ?? {}) as TemplateLayout
  const [pagina, setPagina] = React.useState({
    marginMm: layoutInicial.marginMm ?? 20,
    fontFamily: layoutInicial.fontFamily ?? ('sans' as const),
    fontSizePt: layoutInicial.fontSizePt ?? 11,
    paper: layoutInicial.paper ?? ('A4' as const),
  })
  const [brand, setBrand] = React.useState<Brand>({ ...CORES_PADRAO, ...(layoutInicial.brand ?? {}) })
  const [blocks, setBlocks] = React.useState<Block[]>(
    template ? ensureBlocks(layoutInicial) : blocosPadrao(),
  )
  const [selecionado, setSelecionado] = React.useState<string | null>(null)
  /* Remover um bloco essencial pede confirmação: sem ele o documento sai sem
     informação que precisa constar, e o engano só aparece na impressão. */
  const [removendo, setRemovendo] = React.useState<Block | null>(null)

  const kindAtual = template?.kind ?? kind
  const valores = sampleValues()

  const setBloco = (id: string, patch: Partial<Block>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const mover = (id: string, delta: number) =>
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + delta
      if (i === -1 || j < 0 || j >= prev.length) return prev
      const copia = [...prev]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        kind: kindAtual,
        title: title || null,
        instructions: instructions || null,
        layout: { ...pagina, brand, blocks },
      }
      if (template) await api.put(`/clinical/templates/${template.id}`, payload)
      else await api.post('/clinical/templates', payload)
    },
    onSuccess: onSaved,
  })

  const valid = name.trim().length >= 2
  const layoutAtual: TemplateLayout = { ...pagina, brand, blocks }

  return (
    <Modal
      title={template ? 'Editar modelo' : 'Novo modelo'}
      subtitle={KIND_LABEL[kindAtual]}
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
        {([
          ['conteudo', 'Conteúdo'],
          ['folha', 'Folha'],
          ['marca', 'Marca e página'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            className={aba === id ? 'active' : ''}
            onClick={() => setAba(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="template-layout">
        <div className="form-grid">
          {aba === 'conteudo' && (
            <>
              <Field label="Nome do modelo" required hint="Só a equipe vê — é como o modelo aparece ao emitir">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Receita pós-botox" autoFocus />
              </Field>
              <Field label="Título sugerido" hint="Vai para o documento; a médica pode trocar ao emitir">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Receita pós-procedimento" />
              </Field>
              <Field label="Orientações" hint="Texto que já vem preenchido. Aceita campos como {{paciente}}">
                <textarea rows={9} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </Field>
            </>
          )}

          {aba === 'folha' && (
            <BlocksEditor
              blocks={blocks}
              selecionado={selecionado}
              onSelect={setSelecionado}
              onChange={setBloco}
              onMove={mover}
              onRemove={(id) => {
                const bloco = blocks.find((b) => b.id === id)
                if (!bloco) return
                if (BLOCK_META[bloco.type].essencial) setRemovendo(bloco)
                else setBlocks((prev) => prev.filter((b) => b.id !== id))
              }}
              onAdd={(t) => {
                const b = novoBloco(t)
                // Volta para a posição natural dele, não para o fim da folha.
                setBlocks((prev) => inserirNaOrdem(prev, b))
                setSelecionado(b.id)
              }}
            />
          )}

          {aba === 'marca' && <BrandEditor brand={brand} onChange={setBrand} pagina={pagina} onPagina={setPagina} />}
        </div>

        <aside className="template-preview" aria-label="Prévia da impressão">
          <p className="preview-caption">Prévia — {pagina.paper}</p>
          <Sheet
            layout={layoutAtual}
            blocks={blocks}
            kind={kindAtual}
            title={title}
            instructions={instructions}
            values={valores}
            selectedId={aba === 'folha' ? selecionado : null}
            onSelect={aba === 'folha' ? (id) => { setSelecionado(id); setAba('folha') } : undefined}
          />
          {aba === 'folha' && <p className="hint">Clique num bloco da folha para editá-lo.</p>}
        </aside>
      </div>

      {save.isError && <p className="error">{errorMessage(save.error)}</p>}

      {removendo && (
        <ConfirmDialog
          title={`Remover "${BLOCK_META[removendo.type].label}"?`}
          message={`${BLOCK_META[removendo.type].hint}. Sem este bloco o documento sai sem essa informação — dá para adicionar de volta depois.`}
          confirmLabel="Remover"
          danger
          onCancel={() => setRemovendo(null)}
          onConfirm={() => {
            setBlocks((prev) => prev.filter((b) => b.id !== removendo.id))
            setRemovendo(null)
          }}
        />
      )}
    </Modal>
  )
}

function BlocksEditor({
  blocks,
  selecionado,
  onSelect,
  onChange,
  onMove,
  onRemove,
  onAdd,
}: {
  blocks: Block[]
  selecionado: string | null
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<Block>) => void
  onMove: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onAdd: (t: BlockType) => void
}) {
  const disponiveis = tiposDisponiveis(blocks)
  const presentes = new Set(blocks.map((b) => b.type))
  const faltando = ESSENCIAIS.filter((t) => !presentes.has(t))

  return (
    <>
      <p className="form-section-title">Blocos da folha</p>

      {/* O que falta aparece antes de salvar, não na hora de imprimir. */}
      {faltando.length > 0 && (
        <div className="blocks-warning">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            Sem {faltando.map((t) => BLOCK_META[t].label.toLowerCase()).join(
)} o documento sai
            incompleto. Use “Adicionar bloco” abaixo para devolver.
          </span>
        </div>
      )}
      <ul className="block-list">
        {blocks.map((b, i) => (
          <li key={b.id} className={selecionado === b.id ? 'is-selected' : ''}>
            <button type="button" className="block-head" onClick={() => onSelect(b.id)}>
              <span className="block-name">{BLOCK_META[b.type].label}</span>
              <span className="block-hint">{BLOCK_META[b.type].hint}</span>
            </button>
            <div className="block-actions">
              <button type="button" onClick={() => onMove(b.id, -1)} disabled={i === 0} title="Subir" aria-label="Subir">
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => onMove(b.id, 1)}
                disabled={i === blocks.length - 1}
                title="Descer"
                aria-label="Descer"
              >
                <ChevronDown size={14} />
              </button>
              <button type="button" onClick={() => onRemove(b.id)} title="Remover" aria-label="Remover">
                <Trash2 size={14} />
              </button>
            </div>

            {selecionado === b.id && <BlockOptions block={b} onChange={(patch) => onChange(b.id, patch)} />}
          </li>
        ))}
      </ul>

      {disponiveis.length > 0 && (
        <div className="block-add">
          <span className="hint">Adicionar bloco:</span>
          {disponiveis.map((t) => (
            <button
              key={t}
              type="button"
              className={faltando.includes(t) ? 'is-missing' : undefined}
              onClick={() => onAdd(t)}
            >
              <Plus size={13} aria-hidden="true" />
              {BLOCK_META[t].label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/** As opções mudam conforme o bloco: texto tem editor, espaço tem altura. */
function BlockOptions({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  return (
    <div className="block-options">
      {block.type === 'text' && (
        <RichText
          value={block.html ?? ''}
          onChange={(html) => onChange({ html })}
          placeholder="Escreva o texto deste bloco…"
          minHeight={110}
        />
      )}

      {(block.type === 'spacer' || block.type === 'signature') && (
        <Field
          label={block.type === 'spacer' ? 'Altura (mm)' : 'Espaço para assinar (mm)'}
          hint={block.type === 'signature' ? 'Espaço em branco acima da linha' : undefined}
        >
          <input
            type="number"
            min={0}
            max={120}
            value={block.heightMm ?? 10}
            onChange={(e) => onChange({ heightMm: Number(e.target.value) })}
          />
        </Field>
      )}

      {block.type === 'signature' && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={block.options?.qr !== false}
            onChange={(e) => onChange({ options: { ...block.options, qr: e.target.checked } })}
          />
          <span>Imprimir o QR de verificação</span>
        </label>
      )}

      {block.type !== 'divider' && block.type !== 'spacer' && (
        <Field label="Alinhamento">
          <select value={block.align ?? 'left'} onChange={(e) => onChange({ align: e.target.value as Block['align'] })}>
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </Field>
      )}
    </div>
  )
}

function BrandEditor({
  brand,
  onChange,
  pagina,
  onPagina,
}: {
  brand: Brand
  onChange: (b: Brand) => void
  pagina: { marginMm: number; fontFamily: 'sans' | 'serif'; fontSizePt: number; paper: 'A4' | 'A5' }
  onPagina: (p: typeof pagina) => void
}) {
  const set = <K extends keyof Brand>(k: K, v: Brand[K]) => onChange({ ...brand, [k]: v })

  return (
    <>
      <p className="form-section-title">Logo</p>
      <LogoField url={brand.logoUrl} onChange={(u) => set('logoUrl', u)} />
      <FormRow>
        <Field label="Altura (mm)">
          <input
            type="number"
            min={5}
            max={40}
            value={brand.logoHeightMm ?? 14}
            onChange={(e) => set('logoHeightMm', Number(e.target.value))}
          />
        </Field>
        <Field label="Posição">
          <select value={brand.logoAlign ?? 'left'} onChange={(e) => set('logoAlign', e.target.value as Brand['logoAlign'])}>
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </Field>
      </FormRow>

      <p className="form-section-title">Cores</p>
      <FormRow>
        <Field label="Destaque" hint="Títulos e linhas">
          <input type="color" value={brand.accentColor ?? CORES_PADRAO.accentColor} onChange={(e) => set('accentColor', e.target.value)} />
        </Field>
        <Field label="Texto" hint="Corpo do documento">
          <input type="color" value={brand.textColor ?? CORES_PADRAO.textColor} onChange={(e) => set('textColor', e.target.value)} />
        </Field>
      </FormRow>

      <p className="form-section-title">Dados impressos</p>
      <Field label="Nome da clínica" hint="Vazio usa o cadastro da clínica">
        <input value={brand.clinicName ?? ''} onChange={(e) => set('clinicName', e.target.value || null)} />
      </Field>
      <FormRow>
        <Field label="Linha 1" hint="Endereço, por exemplo">
          <input value={brand.clinicLine1 ?? ''} onChange={(e) => set('clinicLine1', e.target.value || null)} />
        </Field>
        <Field label="Linha 2" hint="Telefone, registro profissional…">
          <input value={brand.clinicLine2 ?? ''} onChange={(e) => set('clinicLine2', e.target.value || null)} />
        </Field>
      </FormRow>

      <p className="form-section-title">Página</p>
      <FormRow cols={3}>
        <Field label="Papel">
          <select value={pagina.paper} onChange={(e) => onPagina({ ...pagina, paper: e.target.value as 'A4' | 'A5' })}>
            <option value="A4">A4</option>
            <option value="A5">A5</option>
          </select>
        </Field>
        <Field label="Margem (mm)">
          <input
            type="number"
            min={5}
            max={50}
            value={pagina.marginMm}
            onChange={(e) => onPagina({ ...pagina, marginMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Corpo (pt)">
          <input
            type="number"
            min={8}
            max={16}
            value={pagina.fontSizePt}
            onChange={(e) => onPagina({ ...pagina, fontSizePt: Number(e.target.value) })}
          />
        </Field>
      </FormRow>
      <Field label="Fonte">
        <select
          value={pagina.fontFamily}
          onChange={(e) => onPagina({ ...pagina, fontFamily: e.target.value as 'sans' | 'serif' })}
        >
          <option value="sans">Sem serifa</option>
          <option value="serif">Com serifa</option>
        </select>
      </Field>
    </>
  )
}
