import { describe, expect, it } from 'vitest'
import { IMAGE_TARGETS, LANDING_DEFAULTS, LANDING_SCHEMAS } from './landing'

/*
 * A rota pública devolve o padrão de fábrica quando o conteúdo gravado não
 * passa no schema. Então todo campo novo precisa ter padrão: se não tiver, o
 * que a clínica escreveu antes dele existir some do site sem aviso.
 *
 * Estes são os formatos que existiam em produção antes do redesign de
 * 23/09/2026 — sem `pillars`, `signature`, `quote`, `hours`.
 */
const GRAVADO_ANTES = {
  HERO: {
    slides: [{ eyebrow: 'Medicina estética', titleTop: 'Beleza', titleBottom: 'com estratégia', subtitle: 'Texto que a clínica escreveu no painel.', watermark: 'PELE', image: null }],
    primaryCta: 'Agendar',
    secondaryCta: 'Protocolos',
  },
  ABOUT: {
    eyebrow: 'Dra. Marcela', titleTop: 'Saúde, beleza', titleBottom: 'e naturalidade.',
    lead: 'Um parágrafo de apresentação escrito pela clínica no painel.', highlights: ['Um ponto'],
    crmLabel: 'CRM/MS', crmNumber: '5691', ctaLabel: 'Conhecer', portrait: null, watermark: 'marcela',
  },
  FOOTER: {
    tagline: 'Frase escrita pela clínica.', address: 'Chapadão do Sul/MS', phone: null, email: null,
    instagram: null, newsletterTitle: 'Novidades', newsletterLead: 'Receba conteúdos da clínica.', logo: null,
  },
}

describe('conteúdo da landing', () => {
  it('o que foi gravado antes dos campos novos continua valendo', () => {
    for (const [secao, conteudo] of Object.entries(GRAVADO_ANTES)) {
      const r = LANDING_SCHEMAS[secao as keyof typeof GRAVADO_ANTES].safeParse(conteudo)
      expect(r.success, `${secao}: ${r.success ? '' : r.error.message}`).toBe(true)
    }
    // e o texto da clínica sobrevive — o campo novo entra com o padrão
    const hero = LANDING_SCHEMAS.HERO.parse(GRAVADO_ANTES.HERO)
    expect(hero.slides[0].subtitle).toBe('Texto que a clínica escreveu no painel.')
    expect(hero.pillars).toEqual(['Ciência', 'Experiência', 'Naturalidade'])
    expect(LANDING_SCHEMAS.FOOTER.parse(GRAVADO_ANTES.FOOTER).hours).toHaveLength(2)
  })

  it('o padrão de cada seção passa no próprio schema', () => {
    for (const [secao, schema] of Object.entries(LANDING_SCHEMAS)) {
      const r = schema.safeParse(LANDING_DEFAULTS[secao as keyof typeof LANDING_DEFAULTS])
      expect(r.success, secao).toBe(true)
    }
  })

  it('cada cartão das áreas de cuidado tem onde receber a foto', () => {
    const max = LANDING_SCHEMAS.CARE.shape.items._def.maxLength?.value ?? 0
    for (let i = 0; i < max; i++) expect(IMAGE_TARGETS[`care.${i}`], `care.${i}`).toBeDefined()
  })

  it('a faixa de confiança só aceita ícones que o site sabe desenhar', () => {
    const r = LANDING_SCHEMAS.TRUST.safeParse({ items: [{ icon: 'foguete', title: 'Algo', detail: '' }] })
    expect(r.success).toBe(false)
  })
})
