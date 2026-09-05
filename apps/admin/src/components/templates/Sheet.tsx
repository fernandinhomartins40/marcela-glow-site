import React from 'react'
import { applyFields } from '../../lib/docFields'
import {
  BLOCK_META,
  CORES_PADRAO,
  ITEM_SOURCE_META,
  itemSource,
  type Block,
  type Brand,
  type TemplateLayout,
} from './blocks'
import type { DocumentKind } from '../DocumentTemplates'

/**
 * A folha, do jeito que sai impressa.
 *
 * Um componente só para a prévia do editor e para a impressão de verdade: se
 * fossem dois, o que a médica ajusta e o que a paciente recebe divergiriam na
 * primeira mudança.
 */

export function Sheet({
  layout,
  blocks,
  kind,
  title,
  instructions,
  values,
  selectedId,
  onSelect,
}: {
  layout: TemplateLayout
  blocks: Block[]
  kind: DocumentKind
  title: string
  instructions: string
  /** Valores dos campos {{...}} — de exemplo na prévia, reais na impressão */
  values: Record<string, string>
  /** Só no editor: destaca o bloco em edição */
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  const brand: Brand = { ...CORES_PADRAO, ...(layout.brand ?? {}) }
  const accent = brand.accentColor ?? CORES_PADRAO.accentColor
  const texto = brand.textColor ?? CORES_PADRAO.textColor

  return (
    <div
      className={`sheet ${layout.paper === 'A5' ? 'is-a5' : ''}`}
      style={{
        padding: `${layout.marginMm ?? 20}px`,
        fontSize: `${layout.fontSizePt ?? 11}px`,
        fontFamily: layout.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : undefined,
        color: texto,
      }}
    >
      {blocks.map((b) => (
        <div
          key={b.id}
          className={`sheet-block ${selectedId === b.id ? 'is-selected' : ''} ${onSelect ? 'is-clickable' : ''}`}
          style={{ textAlign: b.align }}
          onClick={onSelect ? () => onSelect(b.id) : undefined}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={onSelect ? BLOCK_META[b.type].label : undefined}
        >
          <BlockView
            block={b}
            brand={brand}
            accent={accent}
            kind={kind}
            title={title}
            instructions={instructions}
            values={values}
          />
        </div>
      ))}
    </div>
  )
}

function BlockView({
  block,
  brand,
  accent,
  kind,
  title,
  instructions,
  values,
}: {
  block: Block
  brand: Brand
  accent: string
  kind: DocumentKind
  title: string
  instructions: string
  values: Record<string, string>
}) {
  switch (block.type) {
    case 'clinic': {
      const alinhamento = brand.logoAlign ?? 'left'
      return (
        <div className={`sheet-clinic align-${alinhamento}`}>
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              style={{ height: `${brand.logoHeightMm ?? 14}px` }}
            />
          )}
          <div className="sheet-clinic-text">
            <strong style={{ color: accent }}>{brand.clinicName || values.clinica}</strong>
            <span>{brand.clinicLine1 || values.clinica_endereco}</span>
            {(brand.clinicLine2 || values.clinica_telefone) && (
              <span>{brand.clinicLine2 || values.clinica_telefone}</span>
            )}
          </div>
        </div>
      )
    }

    case 'title':
      return (
        <h4 className="sheet-title" style={{ color: accent }}>
          {title || 'Título do documento'}
        </h4>
      )

    case 'patient':
      return (
        <p className="sheet-patient">
          <strong>Paciente:</strong> {values.paciente}
          {values.paciente_cpf ? ` · CPF ${values.paciente_cpf}` : ''}
        </p>
      )

    case 'items': {
      // A lista impressa é a do bloco, não a do tipo do documento: assim uma
      // receita pode trazer exames, e cada bloco escolhe o seu.
      const fonte = itemSource(block, kind)
      const exemplos = {
        medication: ['Dipirona 500mg — 1 comprimido a cada 6h', 'Arnica 30CH — 5 glóbulos 3x ao dia'],
        exam: ['Hemograma completo — jejum de 4h', 'Coagulograma — jejum de 8h'],
        guidance: ['Evitar exercício por 48 horas', 'Protetor solar FPS 50 a cada 3 horas'],
      }[fonte]
      return (
        <div className="sheet-content">
          <p className="sheet-content-label" style={{ color: accent }}>
            {(block.options?.titulo as string) || ITEM_SOURCE_META[fonte].titulo}
          </p>
          <ol>
            {exemplos.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ol>
        </div>
      )
    }
    case 'content':
      return (
        <div className="sheet-content">
          {instructions ? (
            <p className="sheet-instructions">{applyFields(instructions, values)}</p>
          ) : (
            <p className="sheet-instructions is-empty">As orientações digitadas em “Conteúdo”…</p>
          )}
        </div>
      )
    case 'text':
      return (
        <div
          className="sheet-rich"
          dangerouslySetInnerHTML={{ __html: applyFields(block.html ?? '', values) }}
        />
      )

    case 'signature':
      return (
        <div className="sheet-signature">
          <div style={{ height: `${block.heightMm ?? 24}px` }} />
          <span className="sheet-line" style={{ borderColor: accent }} />
          <span className="sheet-signer">{values.medico}</span>
          {values.medico_registro && <span className="sheet-crm">{values.medico_registro}</span>}
          {block.options?.qr !== false && <span className="sheet-qr" aria-hidden="true" />}
        </div>
      )

    case 'divider':
      return <hr className="sheet-divider" style={{ borderColor: accent }} />

    case 'spacer':
      return <div style={{ height: `${block.heightMm ?? 10}px` }} />

    default:
      return null
  }
}
