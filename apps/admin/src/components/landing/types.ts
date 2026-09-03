import type { CropTarget } from '../../lib/imageCrop'

/**
 * Formato do conteudo editavel da landing.
 *
 * O editor e o preview leem a mesma estrutura: o preview desenha o que o editor
 * acabou de mudar, entao os dois precisam concordar sobre o formato.
 */

export type SectionId =
  | 'HERO'
  | 'ABOUT'
  | 'PROCEDURES'
  | 'TECHNOLOGY'
  | 'TESTIMONIALS'
  | 'APPOINTMENT'
  | 'FOOTER'
  | 'SEO'

export interface SectionState {
  content: Record<string, any>
  isVisible: boolean
  /** false enquanto a seção ainda usa o texto de fábrica. */
  isCustom: boolean
  updatedAt: string | null
}

export interface LandingData {
  sections: Record<SectionId, SectionState>
  images: Record<string, { url: string; width: number; height: number; alt: string }>
  imageTargets: Record<string, CropTarget>
}
