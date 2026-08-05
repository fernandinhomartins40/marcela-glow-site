/**
 * Regras dos documentos clínicos entregues à paciente.
 *
 * Base legal (pesquisada em 2026-08):
 *
 * - Lei 14.063/2020, art. 4º: receitas eletrônicas só valem com assinatura
 *   avançada ou qualificada. Receituário de controle especial e antimicrobianos
 *   exigem obrigatoriamente assinatura QUALIFICADA (ICP-Brasil).
 * - MP 2.200-2/2001: a assinatura qualificada é a emitida por AC credenciada
 *   na ICP-Brasil, vinculada ao CPF do prescritor.
 * - CFM: oferece certificado ICP-Brasil em nuvem gratuito a médicos ativos.
 *
 * O que este arquivo NÃO faz: gerar assinatura qualificada. A chave privada
 * precisa estar sob controle exclusivo da médica (token, cartão ou nuvem da
 * AC). O que existe aqui é a assinatura do servidor, que garante integridade e
 * permite verificar que o documento não foi adulterado — mas não tem fé
 * pública. Por isso todo documento carrega seu `signatureLevel`, e a interface
 * avisa quando ele não é aceito em farmácia.
 */

export type MedicationControl = 'COMMON' | 'ANTIMICROBIAL' | 'CONTROLLED'
export type SignatureLevel = 'INTERNAL' | 'ADVANCED' | 'QUALIFIED'
export type DocumentKind = 'PRESCRIPTION' | 'EXAM_REQUEST' | 'GUIDANCE' | 'CERTIFICATE'

/** Validade em dias por tipo de medicamento, conforme prática sanitária. */
const VALIDITY_DAYS: Record<MedicationControl, number> = {
  COMMON: 30,
  ANTIMICROBIAL: 10, // RDC 20/2011
  CONTROLLED: 30, // Portaria 344/98 — varia por lista; 30 é o mais restritivo comum
}

export interface PrescriptionItemInput {
  name: string
  control?: MedicationControl
}

/** O controle mais restritivo entre os itens define as regras do documento. */
export function highestControl(items: PrescriptionItemInput[]): MedicationControl {
  if (items.some((i) => i.control === 'CONTROLLED')) return 'CONTROLLED'
  if (items.some((i) => i.control === 'ANTIMICROBIAL')) return 'ANTIMICROBIAL'
  return 'COMMON'
}

/** Nível mínimo de assinatura exigido por lei para o documento. */
export function requiredSignatureLevel(
  kind: DocumentKind,
  items: PrescriptionItemInput[],
): SignatureLevel {
  // Pedido de exame e orientação não são receita: não caem no art. 4º
  if (kind !== 'PRESCRIPTION') return 'INTERNAL'

  const control = highestControl(items)
  // Controlados e antimicrobianos: qualificada obrigatória
  if (control === 'CONTROLLED' || control === 'ANTIMICROBIAL') return 'QUALIFIED'
  // Demais medicamentos: avançada já basta
  return 'ADVANCED'
}

export function validUntilFor(kind: DocumentKind, items: PrescriptionItemInput[], from = new Date()): Date | null {
  if (kind !== 'PRESCRIPTION') return null
  const days = VALIDITY_DAYS[highestControl(items)]
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return date
}

export interface ComplianceCheck {
  /** Nível exigido por lei */
  required: SignatureLevel
  /** Nível que o sistema consegue aplicar hoje */
  available: SignatureLevel
  /** true quando o disponível atende ao exigido */
  compliant: boolean
  /** Mensagem para a equipe, quando não atende */
  warning?: string
}

const LEVEL_RANK: Record<SignatureLevel, number> = { INTERNAL: 0, ADVANCED: 1, QUALIFIED: 2 }

/**
 * Nível que o servidor consegue aplicar. Sobe para ADVANCED quando há chave RSA
 * dedicada configurada; QUALIFIED só com integração a provedor ICP-Brasil, que
 * ainda não existe — a variável fica preparada para quando existir.
 */
export function availableSignatureLevel(): SignatureLevel {
  if (process.env.PRESCRIPTION_SIGNING_PRIVATE_KEY) return 'ADVANCED'
  return 'INTERNAL'
}

/**
 * @param cloudReady true quando há certificado em nuvem configurado e testado —
 *        nesse caso o documento pode alcançar assinatura qualificada.
 */
export function checkCompliance(
  kind: DocumentKind,
  items: PrescriptionItemInput[],
  cloudReady = false,
): ComplianceCheck {
  const required = requiredSignatureLevel(kind, items)
  const available: SignatureLevel = cloudReady ? 'QUALIFIED' : availableSignatureLevel()
  const compliant = LEVEL_RANK[available] >= LEVEL_RANK[required]

  if (compliant) return { required, available, compliant }

  const control = highestControl(items)
  const warning =
    required === 'QUALIFIED'
      ? `Receita com ${
          control === 'CONTROLLED' ? 'medicamento controlado' : 'antimicrobiano'
        } exige assinatura qualificada ICP-Brasil (Lei 14.063/2020, art. 4º). ` +
        'Este documento não será aceito na farmácia. Emita pela plataforma de ' +
        'Prescrição Eletrônica do CFM ou configure um certificado ICP-Brasil.'
      : 'Receita eletrônica exige assinatura avançada ou qualificada. Configure ' +
        'um certificado para que o documento tenha validade em farmácia.'

  return { required, available, compliant, warning }
}

export const SIGNATURE_LABELS: Record<SignatureLevel, string> = {
  INTERNAL: 'Assinatura interna (sem validade em farmácia)',
  ADVANCED: 'Assinatura eletrônica avançada',
  QUALIFIED: 'Assinatura qualificada ICP-Brasil',
}

export const CONTROL_LABELS: Record<MedicationControl, string> = {
  COMMON: 'Comum',
  ANTIMICROBIAL: 'Antimicrobiano',
  CONTROLLED: 'Controlado',
}

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  PRESCRIPTION: 'Receita',
  EXAM_REQUEST: 'Solicitação de exames',
  GUIDANCE: 'Orientações',
  CERTIFICATE: 'Atestado',
}

/** Linha legível de um item, usada no PDF e na verificação pública. */
export function formatItemLine(item: {
  name: string
  strength?: string | null
  form?: string | null
  dose?: string | null
  quantity?: string | null
  route?: string | null
}): string {
  const head = [item.name, item.strength, item.form].filter(Boolean).join(' ')
  const detail = [
    item.quantity ? `Quantidade: ${item.quantity}` : null,
    item.dose ? `Posologia: ${item.dose}` : null,
    item.route ? `Via: ${item.route}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return detail ? `${head}\n${detail}` : head
}
