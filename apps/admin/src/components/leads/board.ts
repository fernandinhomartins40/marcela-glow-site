import {
  Award,
  CircleDashed,
  Flag,
  Handshake,
  PhoneCall,
  Sparkles,
  Star,
  ThumbsDown,
  Trophy,
  UserCheck,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

/**
 * Colunas do quadro de leads.
 *
 * O status é um enum do banco — não dá para criar coluna nova sem migração, e
 * não faria sentido: o status é o que a API valida e o que os relatórios
 * agrupam. O que a clínica personaliza é a apresentação de cada um: nome, cor,
 * ícone, ordem e se aparece no quadro.
 */

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'

export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']

export interface LeadColumn {
  status: LeadStatus
  label: string
  color?: string
  icon?: string
  hidden?: boolean
}

/** Ícones oferecidos na edição da coluna. */
export const COLUMN_ICONS: Record<string, LucideIcon> = {
  circle: CircleDashed,
  userPlus: UserPlus,
  phone: PhoneCall,
  star: Star,
  userCheck: UserCheck,
  handshake: Handshake,
  sparkles: Sparkles,
  trophy: Trophy,
  award: Award,
  flag: Flag,
  thumbsDown: ThumbsDown,
  xCircle: XCircle,
}

export const COLUMN_COLORS = [
  '#8c7a68', // neutro
  '#b08d57', // bronze da marca
  '#3f7d5c', // verde
  '#2f6f9e', // azul
  '#8a5fa8', // roxo
  '#c2853a', // âmbar
  '#a33131', // vermelho
]

/** Arranjo de quem nunca mexeu no quadro. */
export const COLUNAS_PADRAO: LeadColumn[] = [
  { status: 'NEW', label: 'Novo', color: '#8c7a68', icon: 'userPlus' },
  { status: 'CONTACTED', label: 'Contatado', color: '#2f6f9e', icon: 'phone' },
  { status: 'QUALIFIED', label: 'Qualificado', color: '#8a5fa8', icon: 'star' },
  { status: 'PROPOSAL', label: 'Proposta', color: '#c2853a', icon: 'handshake' },
  { status: 'WON', label: 'Ganho', color: '#3f7d5c', icon: 'trophy' },
  { status: 'LOST', label: 'Perdido', color: '#a33131', icon: 'xCircle' },
]

export const ICONE_PADRAO = CircleDashed

export function iconOf(column: LeadColumn): LucideIcon {
  return (column.icon && COLUMN_ICONS[column.icon]) || ICONE_PADRAO
}

/**
 * Completa a configuração salva com os status que faltarem.
 *
 * Um status fora da lista deixaria os leads dele invisíveis — e eles continuam
 * existindo no banco. Então o que não foi configurado entra escondido, e a tela
 * avisa quando há lead numa coluna oculta.
 */
export function normalizeColumns(salvas: LeadColumn[] | null | undefined): LeadColumn[] {
  if (!salvas?.length) return COLUNAS_PADRAO

  const porStatus = new Map(salvas.map((c) => [c.status, c]))
  const faltando = LEAD_STATUSES.filter((s) => !porStatus.has(s)).map((s) => ({
    ...(COLUNAS_PADRAO.find((c) => c.status === s) as LeadColumn),
    hidden: true,
  }))
  return [...salvas, ...faltando]
}
