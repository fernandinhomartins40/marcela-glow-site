import type { DocumentKind } from '../DocumentTemplates'

/**
 * Blocos da folha.
 *
 * A folha é uma lista ordenada de blocos em vez de campos fixos: assim a médica
 * decide o que entra, em que ordem, e pode repetir texto livre onde quiser —
 * cabeçalho e rodapé viram apenas blocos de texto em posições diferentes.
 */

export type BlockType =
  | 'clinic'
  | 'title'
  | 'patient'
  | 'content'
  | 'text'
  | 'signature'
  | 'divider'
  | 'spacer'

export interface Block {
  id: string
  type: BlockType
  /** Só para `text`: o conteúdo formatado, com campos {{...}} */
  html?: string
  align?: 'left' | 'center' | 'right'
  /** `spacer` e o espaço de assinatura */
  heightMm?: number
  options?: Record<string, unknown>
}

export interface Brand {
  logoUrl?: string | null
  logoHeightMm?: number
  logoAlign?: 'left' | 'center' | 'right'
  accentColor?: string
  textColor?: string
  clinicName?: string | null
  clinicLine1?: string | null
  clinicLine2?: string | null
}

export interface TemplateLayout {
  blocks?: Block[]
  brand?: Brand
  // Formato anterior, ainda gravado nos modelos criados antes dos blocos.
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

/**
 * `unico`: só cabe uma vez na folha (não faz sentido dois blocos de assinatura).
 * `essencial`: sem ele o documento sai sem informação que precisa constar, então
 * a remoção avisa antes — e a posição sugerida é lembrada para devolver o bloco
 * onde ele estava, não no fim da folha.
 */
export const BLOCK_META: Record<
  BlockType,
  { label: string; hint: string; unico?: boolean; essencial?: boolean; ordem: number }
> = {
  clinic: { label: 'Logo e dados da clínica', hint: 'Cabeçalho com a marca', unico: true, ordem: 0 },
  divider: { label: 'Linha divisória', hint: 'Separa duas partes', ordem: 1 },
  title: { label: 'Título do documento', hint: 'Ex.: Receita, Atestado', unico: true, essencial: true, ordem: 2 },
  patient: { label: 'Dados da paciente', hint: 'Nome e identificação da paciente', unico: true, essencial: true, ordem: 3 },
  content: { label: 'Conteúdo', hint: 'Itens ou orientações do documento', unico: true, essencial: true, ordem: 4 },
  text: { label: 'Texto livre', hint: 'Parágrafo formatado, com campos automáticos', ordem: 5 },
  signature: { label: 'Assinatura', hint: 'Linha, nome e QR de verificação', unico: true, essencial: true, ordem: 6 },
  spacer: { label: 'Espaço', hint: 'Empurra o que vem depois', ordem: 7 },
}

/** Blocos sem os quais o documento sai incompleto. */
export const ESSENCIAIS = (Object.keys(BLOCK_META) as BlockType[]).filter((t) => BLOCK_META[t].essencial)

/**
 * Onde o bloco entra ao ser devolvido.
 *
 * Sem isto ele cai no fim da folha, e um "Conteúdo" removido por engano volta
 * depois da assinatura — o modelo continua quebrado mesmo com o bloco de volta.
 */
export function inserirNaOrdem(blocos: Block[], novo: Block): Block[] {
  const alvo = BLOCK_META[novo.type].ordem
  const i = blocos.findIndex((b) => BLOCK_META[b.type].ordem > alvo)
  if (i === -1) return [...blocos, novo]
  return [...blocos.slice(0, i), novo, ...blocos.slice(i)]
}

let contador = 0
export function novoBloco(type: BlockType): Block {
  contador += 1
  const id = `b${Date.now().toString(36)}${contador}`
  if (type === 'spacer') return { id, type, heightMm: 10 }
  if (type === 'signature') return { id, type, align: 'center', heightMm: 24, options: { qr: true } }
  if (type === 'text') return { id, type, html: '', align: 'left' }
  return { id, type }
}

export const CORES_PADRAO = { accentColor: '#b08d57', textColor: '#2c2c2c' }

/** Arranjo de quem cria um modelo do zero. */
export function blocosPadrao(): Block[] {
  return [
    novoBloco('clinic'),
    novoBloco('divider'),
    novoBloco('title'),
    novoBloco('patient'),
    novoBloco('content'),
    novoBloco('signature'),
  ]
}

/**
 * Converte um modelo do formato antigo para blocos.
 *
 * Os primeiros modelos guardavam cabeçalho e rodapé como dois campos de HTML.
 * Em vez de migrar o banco, a conversão acontece ao abrir: o modelo antigo vira
 * a mesma folha em blocos, e só grava no formato novo quando a médica salva.
 */
export function ensureBlocks(layout: TemplateLayout | null | undefined): Block[] {
  if (layout?.blocks?.length) return layout.blocks

  const blocos: Block[] = []
  if (layout?.showClinicHeader !== false) blocos.push(novoBloco('clinic'))
  if (layout?.headerHtml) blocos.push({ ...novoBloco('text'), html: layout.headerHtml })
  blocos.push(novoBloco('divider'), novoBloco('title'), novoBloco('patient'), novoBloco('content'))
  blocos.push({
    ...novoBloco('signature'),
    align: layout?.signaturePosition ?? 'center',
    heightMm: layout?.signatureSpaceMm ?? 24,
    options: { qr: layout?.showVerificationQr !== false },
  })
  if (layout?.footerHtml) blocos.push({ ...novoBloco('text'), html: layout.footerHtml })
  return blocos
}

/** Blocos que já existem e não podem ser adicionados de novo. */
export function tiposDisponiveis(blocos: Block[]): BlockType[] {
  const usados = new Set(blocos.map((b) => b.type))
  return (Object.keys(BLOCK_META) as BlockType[]).filter(
    (t) => !BLOCK_META[t].unico || !usados.has(t),
  )
}

/** Rótulo do conteúdo conforme o tipo do documento, para a prévia. */
export function contentLabel(kind: DocumentKind): string {
  if (kind === 'PRESCRIPTION') return 'Medicamentos prescritos'
  if (kind === 'EXAM_REQUEST') return 'Exames solicitados'
  return 'Texto do documento'
}
