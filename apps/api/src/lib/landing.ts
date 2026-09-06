import { z } from 'zod'

/**
 * Forma do conteúdo de cada seção da landing page.
 *
 * `LandingContent.content` é `Json` no banco porque as seções não têm nada em
 * comum — o hero tem slides, o rodapé tem endereço. Estes schemas são o que
 * dá forma àquele Json: a API recusa o que não bate, e o painel monta o
 * formulário a partir da mesma definição.
 *
 * Os textos aqui reproduzem o que hoje está escrito à mão nos componentes de
 * `apps/web`. São o padrão de quando a clínica ainda não editou nada, para que
 * o site nunca apareça vazio.
 */

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max)

/** Referência a uma imagem enviada pelo painel; `null` usa a que já vem no build. */
const imageSlot = z.string().trim().max(120).nullable().default(null)

// ── Hero ─────────────────────────────────────────────────────────────────────

export const heroSlideSchema = z.object({
  eyebrow: trimmed(2, 80),
  titleTop: trimmed(1, 40),
  titleBottom: trimmed(1, 40),
  subtitle: trimmed(10, 300),
  /** Palavra gigante no fundo; some abaixo de `lg`. */
  watermark: trimmed(1, 20),
  image: imageSlot,
})

export const heroSchema = z.object({
  /* Três é o que o carrossel comporta sem virar apresentação de slides; menos
     de um deixaria a primeira tela do site em branco. */
  slides: z.array(heroSlideSchema).min(1).max(5),
  primaryCta: trimmed(2, 40).default('Agendar Avaliação'),
  secondaryCta: trimmed(2, 40).default('Conheça os Protocolos'),
})

// ── Sobre ────────────────────────────────────────────────────────────────────

export const aboutSchema = z.object({
  eyebrow: trimmed(2, 100),
  titleTop: trimmed(1, 60),
  titleBottom: trimmed(1, 60),
  lead: trimmed(20, 600),
  /** As linhas com traço à esquerda. */
  highlights: z.array(trimmed(3, 160)).max(8),
  crmLabel: trimmed(1, 20).default('CRM/MS'),
  crmNumber: trimmed(1, 20),
  ctaLabel: trimmed(2, 40).default('Conhecer a Abordagem'),
  portrait: imageSlot,
  watermark: trimmed(1, 20).default('marcela'),
})

// ── Procedimentos ────────────────────────────────────────────────────────────

/* A lista em si vem de `Procedure`, que já tem CRUD próprio. Aqui só o texto
   que emoldura a seção. */
export const proceduresSchema = z.object({
  eyebrow: trimmed(2, 80),
  titleTop: trimmed(1, 60),
  titleBottom: trimmed(1, 60),
  lead: trimmed(10, 400),
  ctaLabel: trimmed(2, 40).default('Ver todos os protocolos'),
})

// ── Tecnologia ───────────────────────────────────────────────────────────────

export const technologyItemSchema = z.object({
  number: trimmed(1, 4),
  name: trimmed(2, 80),
  eyebrow: trimmed(2, 60),
  /** Duas letras desenhadas em tipo grande — a seção não usa foto. */
  monogram: trimmed(1, 3),
  description: trimmed(20, 600),
  points: z.array(trimmed(3, 200)).max(8),
})

export const technologySchema = z.object({
  eyebrow: trimmed(2, 80),
  titleTop: trimmed(1, 60),
  titleBottom: trimmed(1, 60),
  lead: trimmed(10, 400),
  items: z.array(technologyItemSchema).max(6),
  watermark: trimmed(1, 24).default('tecnologia'),
})

// ── Depoimentos ──────────────────────────────────────────────────────────────

/* Os depoimentos vêm de `Testimonial`, com CRUD próprio. */
export const testimonialsSchema = z.object({
  eyebrow: trimmed(2, 80),
  titleTop: trimmed(1, 60),
  titleBottom: trimmed(1, 60),
})

// ── Agendamento ──────────────────────────────────────────────────────────────

export const appointmentSchema = z.object({
  eyebrow: trimmed(2, 80),
  titleTop: trimmed(1, 60),
  titleBottom: trimmed(1, 60),
  lead: trimmed(10, 400),
  /** Aviso sob o formulário sobre o que acontece depois do envio. */
  disclaimer: trimmed(10, 400),
  whatsapp: z.string().trim().max(20).nullable().default(null),
})

// ── Rodapé ───────────────────────────────────────────────────────────────────

export const footerSchema = z.object({
  tagline: trimmed(10, 300),
  address: trimmed(5, 200),
  phone: z.string().trim().max(30).nullable().default(null),
  email: z.string().trim().email().nullable().default(null),
  instagram: z.string().trim().max(120).nullable().default(null),
  newsletterTitle: trimmed(3, 80).default('Novidades'),
  newsletterLead: trimmed(10, 300),
  logo: imageSlot,
})

// ── SEO ──────────────────────────────────────────────────────────────────────

export const seoSchema = z.object({
  title: trimmed(10, 70),
  description: trimmed(50, 180),
  /** Imagem de compartilhamento — 1200x630 é o que as redes recortam. */
  ogImage: imageSlot,
})

// ── Cores ────────────────────────────────────────────────────────────────────

/**
 * Uma cor da paleta, no formato que o CSS do site espera: "H S% L%".
 *
 * Os tokens do site são declarados sem `hsl()` em volta (`--bronze: 28 22% 55%`)
 * justamente para poderem ser compostos com opacidade — `hsl(var(--bronze) / .5)`.
 * Guardar a cor nesse mesmo formato deixa o valor entrar direto na folha de
 * estilo, sem conversão em nenhuma ponta.
 *
 * A validação é estrita porque este valor é interpolado dentro de um `<style>`:
 * aceitar texto livre aqui seria deixar o painel escrever CSS arbitrário na
 * página pública.
 */
const hslColor = z
  .string()
  .trim()
  .regex(/^\d{1,3} \d{1,3}% \d{1,3}%$/, 'Use o formato "matiz saturação% luminosidade%", por exemplo "28 22% 55%"')
  .refine((v) => {
    const [h, s, l] = v.split(/[ %]+/).map(Number)
    return h <= 360 && s <= 100 && l <= 100
  }, 'Matiz vai até 360, saturação e luminosidade até 100%')

/**
 * A paleta do site.
 *
 * São seis cores, não as dezenas de tokens que o CSS declara: as outras são
 * derivadas destas por opacidade ou mistura. Expor todas transformaria a tela
 * num painel de designer, e a decisão que a clínica realmente toma é "a marca
 * mudou de bronze para verde".
 */
export const themeSchema = z.object({
  cream: hslColor,
  creamDeep: hslColor,
  espresso: hslColor,
  bronze: hslColor,
  bronzeLight: hslColor,
  marbleVein: hslColor,
})

// ─────────────────────────────────────────────────────────────────────────────

export const LANDING_SCHEMAS = {
  HERO: heroSchema,
  ABOUT: aboutSchema,
  PROCEDURES: proceduresSchema,
  TECHNOLOGY: technologySchema,
  TESTIMONIALS: testimonialsSchema,
  APPOINTMENT: appointmentSchema,
  FOOTER: footerSchema,
  SEO: seoSchema,
  THEME: themeSchema,
} as const

export type LandingSectionId = keyof typeof LANDING_SCHEMAS

export function isLandingSection(value: string): value is LandingSectionId {
  return value in LANDING_SCHEMAS
}

/**
 * Alvos de recorte por uso. O painel corta no navegador antes de enviar e a
 * API confere aqui — sem isto uma foto de celular de 4000px entra inteira e a
 * primeira tela do site passa a baixar 6MB.
 */
export const IMAGE_TARGETS: Record<string, { width: number; height: number; mime: string; label: string }> = {
  'hero.0': { width: 1080, height: 1350, mime: 'image/jpeg', label: 'Hero — slide 1' },
  'hero.1': { width: 1080, height: 1350, mime: 'image/jpeg', label: 'Hero — slide 2' },
  'hero.2': { width: 1080, height: 1350, mime: 'image/jpeg', label: 'Hero — slide 3' },
  'hero.3': { width: 1080, height: 1350, mime: 'image/jpeg', label: 'Hero — slide 4' },
  'hero.4': { width: 1080, height: 1350, mime: 'image/jpeg', label: 'Hero — slide 5' },
  'about.portrait': { width: 1080, height: 1350, mime: 'image/jpeg', label: 'Sobre — retrato' },
  'background.marble': { width: 1920, height: 1080, mime: 'image/jpeg', label: 'Fundo de mármore' },
  'footer.logo': { width: 512, height: 512, mime: 'image/png', label: 'Logo' },
  'seo.og': { width: 1200, height: 630, mime: 'image/jpeg', label: 'Imagem de compartilhamento' },

  /* Icones dos aplicativos instalaveis.

     Sao PNG porque o manifesto precisa de fundo transparente possivel e as
     lojas de aplicativo nao aceitam JPEG. Os quatro tamanhos existem porque
     cada sistema pede o seu: 192 e o basico do Android, 512 alimenta a tela de
     abertura, 180 e o da tela inicial do iPhone, e o maskable e recortado pelo
     launcher em circulo ou quadrado arredondado — por isso ele pede margem de
     seguranca ao redor da marca. */
  'app.admin.192': { width: 192, height: 192, mime: 'image/png', label: 'Painel — icone 192' },
  'app.admin.512': { width: 512, height: 512, mime: 'image/png', label: 'Painel — icone 512' },
  'app.admin.apple': { width: 180, height: 180, mime: 'image/png', label: 'Painel — icone do iPhone' },
  'app.admin.maskable': { width: 512, height: 512, mime: 'image/png', label: 'Painel — icone com mascara' },
  'app.patient.192': { width: 192, height: 192, mime: 'image/png', label: 'Portal — icone 192' },
  'app.patient.512': { width: 512, height: 512, mime: 'image/png', label: 'Portal — icone 512' },
  'app.patient.apple': { width: 180, height: 180, mime: 'image/png', label: 'Portal — icone do iPhone' },
  'app.patient.maskable': { width: 512, height: 512, mime: 'image/png', label: 'Portal — icone com mascara' },
}

/** Conteúdo de partida: o que hoje está escrito nos componentes de `apps/web`. */
export const LANDING_DEFAULTS: { [K in LandingSectionId]: z.input<(typeof LANDING_SCHEMAS)[K]> } = {
  HERO: {
    slides: [
      {
        eyebrow: 'Medicina estética & saúde da pele',
        titleTop: 'Beleza',
        titleBottom: 'com estratégia',
        subtitle:
          'Tratamentos personalizados para preservar identidade, melhorar qualidade de pele e acompanhar cada fase com naturalidade.',
        watermark: 'PELE',
        image: null,
      },
      {
        eyebrow: 'Envelhecimento inteligente',
        titleTop: 'Evoluir',
        titleBottom: 'sem exageros',
        subtitle:
          'Gerenciamento de envelhecimento, Botox, bioestimuladores e protocolos regenerativos guiados por análise médica.',
        watermark: 'TEMPO',
        image: null,
      },
      {
        eyebrow: 'Face · Pele · Pescoço · Corpo',
        titleTop: 'Saúde',
        titleBottom: 'e beleza',
        subtitle: 'A medicina a seu favor: onde saúde, autoestima e naturalidade caminham juntas.',
        watermark: 'SAÚDE',
        image: null,
      },
    ],
    primaryCta: 'Agendar Avaliação',
    secondaryCta: 'Conheça os Protocolos',
  },
  ABOUT: {
    eyebrow: 'Dra. Marcela Campanini Duch',
    titleTop: 'Saúde, beleza',
    titleBottom: 'e naturalidade.',
    lead:
      'A medicina a seu favor: onde saúde e beleza andam juntas. Cada plano é construído com análise médica, estratégia e respeito à identidade de cada paciente, buscando qualidade de pele, harmonia e evolução natural.',
    highlights: [
      'Médica com CRM/MS 5691 em Chapadão do Sul/MS',
      'Gerenciamento de envelhecimento com foco em naturalidade',
      'Protocolos para face, pele, pescoço, corpo e cabelo',
      'Abordagem integrada entre estética, saúde da pele e bem-estar',
    ],
    crmLabel: 'CRM/MS',
    crmNumber: '5691',
    ctaLabel: 'Conhecer a Abordagem',
    portrait: null,
    watermark: 'marcela',
  },
  PROCEDURES: {
    eyebrow: 'Protocolos',
    titleTop: 'Tratamentos',
    titleBottom: 'com propósito.',
    lead: 'Cada protocolo nasce de uma análise médica e do que a sua pele precisa naquele momento.',
    ctaLabel: 'Ver todos os protocolos',
  },
  TECHNOLOGY: {
    eyebrow: 'Recursos médicos',
    titleTop: 'Tecnologia',
    titleBottom: 'a serviço do plano.',
    lead: 'Recursos escolhidos conforme a necessidade de cada paciente — nunca o contrário.',
    items: [
      {
        number: '01',
        name: 'T-Sculptor',
        eyebrow: 'Escultura corporal',
        monogram: 'TS',
        description:
          'Tecnologia para escultura corporal que estimula contrações musculares de alta intensidade e pode compor protocolos para contorno, firmeza e melhora corporal.',
        points: [
          'Planejamento para abdome, braços, glúteos e contorno corporal',
          'Associação com bioestimuladores quando há indicação médica',
          'Estímulo muscular e melhora de definição sem cirurgia',
          'Plano individual para resultados progressivos e naturais',
        ],
      },
      {
        number: '02',
        name: 'Peptídeos e Qualidade de Pele',
        eyebrow: 'Regeneração celular',
        monogram: 'PE',
        description:
          'Protocolos regenerativos voltados à atividade celular, produção de colágeno, reparação tecidual e melhora real da qualidade da pele.',
        points: [
          'Foco em viço, textura, firmeza e resistência da pele',
          'Abordagem progressiva, consistente e biologicamente sustentada',
          'Combinação possível com peelings, skinbooster e bioestimuladores',
        ],
      },
    ],
    watermark: 'tecnologia',
  },
  TESTIMONIALS: {
    eyebrow: 'Depoimentos',
    titleTop: 'Quem já',
    titleBottom: 'passou por aqui.',
  },
  APPOINTMENT: {
    eyebrow: 'Agendamento',
    titleTop: 'Vamos conversar',
    titleBottom: 'sobre você.',
    lead: 'Escolha o melhor horário e conte o que procura. A equipe confirma em seguida.',
    disclaimer:
      'O horário fica reservado como solicitação até a equipe confirmar — você recebe o aviso por WhatsApp e na Área da Paciente.',
    whatsapp: null,
  },
  FOOTER: {
    tagline:
      'Medicina estética com estratégia: saúde da pele, gerenciamento de envelhecimento e naturalidade em cada plano.',
    address: 'Chapadão do Sul/MS',
    phone: null,
    email: null,
    instagram: null,
    newsletterTitle: 'Novidades',
    newsletterLead: 'Receba conteúdos sobre saúde da pele e novidades da clínica.',
    logo: null,
  },
  /* Os mesmos valores que `apps/web/src/index.css` declara como padrão. Se um
     dia a marca mudar no CSS, este bloco precisa acompanhar — é o que
     "Restaurar padrão" devolve. */
  THEME: {
    cream: '36 35% 96%',
    creamDeep: '34 28% 88%',
    espresso: '22 30% 14%',
    bronze: '28 22% 55%',
    bronzeLight: '32 25% 75%',
    marbleVein: '36 25% 80%',
  },
  SEO: {
    title: 'Dra. Marcela Duch — Medicina Estética',
    description:
      'Medicina estética com estratégia em Chapadão do Sul/MS: saúde da pele, gerenciamento de envelhecimento e protocolos personalizados com naturalidade.',
    ogImage: null,
  },
}
