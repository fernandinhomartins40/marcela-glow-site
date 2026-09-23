import React from 'react'
import { CalendarCheck, Search, Sparkles } from 'lucide-react'
import type { LandingData, SectionId } from './types'
import { FOTOS_DO_BUILD } from './fotosDoBuild'

/**
 * Espelho do site dentro do painel: mostra como a secao vai aparecer com o
 * texto que a medica esta digitando, para ela nao precisar publicar e conferir.
 */

export function SearchPreview({
  title,
  description,
  og,
}: {
  title: string
  description: string
  og?: { url: string; alt: string }
}) {
  return (
    <div className="preview-stack" style={{ display: 'grid', gap: 10 }}>
      <div className="serp-preview">
        <p className="serp-url">dramarceladuch.com.br</p>
        <p className="serp-title">{title || 'Título da página'}</p>
        <p className="serp-desc">{description || 'A descrição aparece aqui.'}</p>
      </div>
      {/* O mesmo texto acompanha o link quando ele é colado no WhatsApp ou no
          Instagram — lá a imagem é o que aparece primeiro. */}
      {og && <img className="serp-og" src={og.url} alt={og.alt} />}
    </div>
  )
}

/**
 * Fotografia de um espaço do site.
 *
 * A ordem é a mesma do site: a foto enviada pelo painel, e na falta dela a
 * que veio no build. Só quando não existe nenhuma das duas é que aparece o
 * retângulo vazio — e aí ele diz a verdade, porque o site também estaria sem
 * foto ali.
 */
export function Figure({
  image,
  slot,
  ratio,
  label,
}: {
  image?: { url: string; alt: string }
  /** Para achar a foto que o site usa quando nenhuma foi enviada. */
  slot?: string
  ratio: string
  label: string
}) {
  const doBuild = slot ? FOTOS_DO_BUILD[slot] : undefined
  const src = image?.url ?? doBuild

  return (
    <div className="lp-figure" style={{ aspectRatio: ratio }}>
      {src ? (
        <img src={src} alt={image?.alt ?? ''} />
      ) : (
        <span className="lp-figure-empty">{label}</span>
      )}
    </div>
  )
}

/** Título em duas linhas — a segunda sempre itálica, como em todas as seções. */
export function Title({ top, bottom, level }: { top?: string; bottom?: string; level: 'hero' | 'section' | 'block' }) {
  return (
    <p className={`lp-display lp-title-${level}`}>
      {top}
      <span className="lp-title-italic">{bottom}</span>
    </p>
  )
}

export function Points({ items }: { items: string[] }) {
  return (
    <div className="lp-stack-tight">
      {items.map((item, index) => (
        <div key={index} className="lp-point">
          <p className="lp-body">{item}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * O hero da prévia.
 *
 * Mostra um slide por vez, como o site — antes a prévia empilhava os três,
 * o que cabia quando ela era uma coluna estreita ao lado do formulário. Com
 * a prévia ocupando a página inteira, três heros em sequência viravam quase
 * dois mil pixels de rolagem para ver o que o site mostra num lugar só.
 *
 * As bolinhas trocam de slide e são botões de verdade: comparar os três
 * continua possível, agora a um clique em vez de uma rolagem.
 */
function HeroPreview({ draft, images }: { draft: any; images: LandingData['images'] }) {
  const slides: any[] = draft.slides ?? []
  const [atual, setAtual] = React.useState(0)
  // Apagar o último slide deixaria o índice apontando para o vazio.
  const index = Math.min(atual, Math.max(slides.length - 1, 0))
  const slide = slides[index]
  if (!slide) return null

  return (
    <div className="lp-carrossel">
      <section className="lp lp-hero lp-marble">
        <div className="lp-inner">
          <span className="lp-watermark">{slide.watermark}</span>
          <div className="lp-split">
            <div className="lp-stack">
              <p className="lp-eyebrow">{slide.eyebrow}</p>
              <Title top={slide.titleTop} bottom={slide.titleBottom} level="hero" />
              <p className="lp-lead">{slide.subtitle}</p>
              <div className="lp-actions">
                <span className="lp-btn lp-btn-cta">{draft.primaryCta}</span>
                <span className="lp-btn lp-btn-outline">{draft.secondaryCta}</span>
              </div>
            </div>
            <Figure image={images[`hero.${index}`]} slot={`hero.${index}`} ratio="4 / 5" label="foto do site" />
          </div>
        </div>
      </section>

      {slides.length > 1 && (
        <div className="lp-troca">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? 'is-on' : ''}
              onClick={() => setAtual(i)}
              aria-label={`Ver o slide ${i + 1}${s.titleTop ? `: ${s.titleTop}` : ''}`}
              aria-current={i === index}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
/**
 * A seção como ela sai no site.
 *
 * Aqui não há aproximação: as classes `lp-*` repetem os tokens, as fontes e a
 * estrutura de `apps/web`, e a escala tipográfica está ancorada na largura do
 * próprio quadro. O que se vê é a seção inteira reduzida — mesma hierarquia,
 * mesmas cores, mesma proporção entre título, texto e foto — e não uma lista de
 * campos formatada. Por isso dá para decidir olhando se o título ficou grande
 * demais ou se o texto de apoio está longo.
 */
export function SectionPreview({
  id,
  draft,
  images,
}: {
  id: SectionId
  draft: any
  images: LandingData['images']
}) {
  if (id === 'SEO') {
    return (
      <SearchPreview
        title={draft.title ?? ''}
        description={draft.description ?? ''}
        og={images['seo.og']}
      />
    )
  }

  if (id === 'HERO') {
    return <HeroPreview draft={draft} images={images} />
  }

  if (id === 'ABOUT') {
    return (
      <section className="lp">
        <div className="lp-inner">
          <span className="lp-watermark lp-watermark-top">{draft.watermark}</span>
          <div className="lp-split lp-split-reverse">
            <div className="lp-crm-host">
              <Figure image={images['about.portrait']} slot="about.portrait" ratio="4 / 5" label="retrato" />
              <div className="lp-crm">
                <p className="lp-crm-label">{draft.crmLabel}</p>
                <p className="lp-crm-value">{draft.crmNumber}</p>
              </div>
            </div>
            <div className="lp-stack">
              <p className="lp-eyebrow">{draft.eyebrow}</p>
              <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
              <span className="lp-divider" />
              <p className="lp-lead lp-lead-roman">{draft.lead}</p>
              <Points items={draft.highlights ?? []} />
              <div className="lp-actions">
                <span className="lp-btn lp-btn-outline">{draft.ctaLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (id === 'PROCEDURES') {
    return (
      <section className="lp lp-cream-deep">
        <div className="lp-inner">
          <div className="lp-head">
            <p className="lp-eyebrow">{draft.eyebrow}</p>
            <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
            <p className="lp-lead">{draft.lead}</p>
          </div>
          {/* Os tratamentos vêm do cadastro, não deste formulário — o quadro
              marca onde a lista entra para dar a noção do espaço que sobra. */}
          <div className="lp-placeholder">
            <p className="lp-eyebrow">a lista de tratamentos entra aqui</p>
            <p className="lp-body">Cadastros → Procedimentos</p>
          </div>
          <div className="lp-actions" style={{ marginTop: '5cqw', justifyContent: 'center' }}>
            <span className="lp-btn lp-btn-cta">{draft.ctaLabel}</span>
          </div>
        </div>
      </section>
    )
  }

  if (id === 'TECHNOLOGY') {
    const items: any[] = draft.items ?? []
    return (
      <section className="lp">
        <div className="lp-inner">
          <span className="lp-watermark lp-watermark-top">{draft.watermark}</span>
          <div className="lp-head">
            <p className="lp-eyebrow">{draft.eyebrow}</p>
            <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
            <p className="lp-lead">{draft.lead}</p>
          </div>
          <div className="lp-stack" style={{ gap: '7cqw' }}>
            {items.map((item, index) => (
              /* No site os blocos alternam o lado da capa; a prévia faz o
                 mesmo, senão o ritmo da seção não aparece. */
              <div key={index} className={`lp-split${index % 2 ? '' : ' lp-split-reverse'}`}>
                <div
                  className="lp-figure lp-marble"
                  style={{ aspectRatio: '4 / 5', order: index % 2 ? 2 : 0, overflow: 'hidden' }}
                >
                  <span
                    className="lp-display"
                    style={{
                      position: 'absolute',
                      top: '24%',
                      right: '-2cqw',
                      fontSize: '13cqw',
                      color: 'hsl(var(--primary) / .1)',
                    }}
                  >
                    {item.monogram}
                  </span>
                  <span style={{ position: 'absolute', inset: '2cqw', border: '1px solid hsl(var(--primary) / .2)', pointerEvents: 'none' }} />
                  <span
                    className="lp-display"
                    style={{
                      position: 'absolute',
                      top: '3cqw',
                      left: '3cqw',
                      fontSize: '4cqw',
                      color: 'hsl(var(--accent) / .7)',
                    }}
                  >
                    {item.number}
                  </span>
                  <div style={{ position: 'absolute', left: '4cqw', right: '4cqw', bottom: '5cqw', color: 'hsl(var(--primary))' }}>
                    <span className="lp-eyebrow">{item.eyebrow}</span>
                    <span className="lp-display" style={{ display: 'block', marginTop: '1cqw', fontSize: '5cqw', lineHeight: 1.1 }}>{item.name}</span>
                  </div>
                </div>
                <div className="lp-stack">
                  <p className="lp-eyebrow">{item.eyebrow}</p>
                  <p className="lp-display lp-title-block">{item.name}</p>
                  <span className="lp-divider" />
                  <p className="lp-lead lp-lead-roman">{item.description}</p>
                  <Points items={item.points ?? []} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (id === 'TESTIMONIALS') {
    return (
      <section className="lp lp-cream-deep">
        <div className="lp-inner">
          <div className="lp-head">
            <p className="lp-eyebrow">{draft.eyebrow}</p>
            <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
          </div>
          <div className="lp-cards">
            {[0, 1].map((card) => (
              <div key={card} className="lp-card lp-stack-tight">
                <span className="lp-divider" />
                <p className="lp-lead">Depoimento cadastrado</p>
                <p className="lp-eyebrow">nome da paciente</p>
              </div>
            ))}
          </div>
          <p className="lp-body" style={{ marginTop: '4cqw', textAlign: 'center' }}>
            Os depoimentos vêm de Cadastros → Depoimentos.
          </p>
        </div>
      </section>
    )
  }

  if (id === 'APPOINTMENT') {
    return (
      <section className="lp lp-espresso">
        <div className="lp-inner">
          <div className="lp-split">
            <div className="lp-stack">
              <p className="lp-eyebrow">{draft.eyebrow}</p>
              <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
              <span className="lp-divider" />
              <p className="lp-lead">{draft.lead}</p>
              {draft.whatsapp && (
                <div className="lp-actions">
                  <span className="lp-btn lp-btn-cta">WhatsApp</span>
                </div>
              )}
            </div>
            <div className="lp-stack-tight">
              <p className="lp-eyebrow">Solicitação de avaliação</p>
              <div className="lp-input">Nome</div>
              <div className="lp-input">Telefone</div>
              <div className="lp-input">Horário</div>
              <p className="lp-body">{draft.disclaimer}</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // FOOTER
  return (
    <section className="lp lp-espresso">
      <div className="lp-inner">
        <div className="lp-footer-grid">
          <div className="lp-stack-tight">
            <img
              className="lp-footer-logo"
              src={images['footer.logo']?.url ?? FOTOS_DO_BUILD['footer.logo']}
              alt=""
            />
            <p className="lp-brand">Dra. Marcela Duch</p>
            <p className="lp-brand-sub">Médica · CRM/MS 5691</p>
            <p className="lp-lead">{draft.tagline}</p>
            <div className="lp-social" aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
          <div className="lp-stack-tight">
            <p className="lp-field-label">Endereço</p>
            <p className="lp-body">{draft.address}</p>
            {draft.phone && (
              <>
                <p className="lp-field-label">Telefone</p>
                <p className="lp-body">{formatPhone(draft.phone)}</p>
              </>
            )}
            {draft.email && (
              <>
                <p className="lp-field-label">E-mail</p>
                <p className="lp-body">{draft.email}</p>
              </>
            )}
            {draft.instagram && (
              <>
                <p className="lp-field-label">Instagram</p>
                <p className="lp-body">@{draft.instagram}</p>
              </>
            )}
            <p className="lp-field-label">{draft.newsletterTitle}</p>
            <p className="lp-body">{draft.newsletterLead}</p>
            <div className="lp-input">seu@email.com</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** (67) 99944-6066 — o mesmo formato que o rodapé do site imprime. */
export function formatPhone(digits: string) {
  const only = String(digits).replace(/\D/g, '').replace(/^55/, '')
  if (only.length === 11) return `(${only.slice(0, 2)}) ${only.slice(2, 7)}-${only.slice(7)}`
  if (only.length === 10) return `(${only.slice(0, 2)}) ${only.slice(2, 6)}-${only.slice(6)}`
  return digits
}
