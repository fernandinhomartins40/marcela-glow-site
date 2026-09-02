import React from 'react'
import { Field } from '../../lib/ui'
import { Fold, HeadingFields, ImageField, RepeatingList, StringList } from './campos'
import type { LandingData, SectionId } from './types'

/**
 * Os campos de cada secao da landing.
 *
 * Um ramo por secao: cada uma tem o seu proprio conjunto de campos (o Hero tem
 * slides, o Rodape tem contato), entao um formulario generico so caberia com
 * configuracao suficiente para ficar mais dificil de ler que os ramos.
 */

export function SectionFields({
  id,
  draft,
  set,
  images,
  targets,
  onChanged,
}: {
  id: SectionId
  draft: any
  set: (path: string, value: unknown) => void
  images: LandingData['images']
  targets: LandingData['imageTargets']
  onChanged: () => void
}) {
  if (id === 'HERO') {
    const slides: any[] = draft.slides ?? []
    return (
      <>
        <Fold title="Botões" hint="As duas chamadas sob o título" defaultOpen>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Botão principal">
              <input value={draft.primaryCta ?? ''} onChange={(e) => set('primaryCta', e.target.value)} />
            </Field>
            <Field label="Botão secundário">
              <input value={draft.secondaryCta ?? ''} onChange={(e) => set('secondaryCta', e.target.value)} />
            </Field>
          </div>
        </Fold>

        <RepeatingList
          label="Slides"
          items={slides}
          max={5}
          /* O primeiro slide é o que abre o site, então é o que quase sempre se
             vem editar; os outros ficam fechados até serem pedidos. */
          openFirst
          itemTitle={(slide, index) =>
            [slide.titleTop, slide.titleBottom].filter(Boolean).join(' ') || `Slide ${index + 1}`
          }
          onChange={(next) => set('slides', next)}
          blank={() => ({
            eyebrow: '',
            titleTop: '',
            titleBottom: '',
            subtitle: '',
            watermark: '',
            image: null,
          })}
          render={(slide, index, update) => (
            <>
              <ImageField
                slot={`hero.${index}`}
                images={images}
                targets={targets}
                onChanged={onChanged}
              />
              <Field label="Sobrelinha">
                <input value={slide.eyebrow} onChange={(e) => update({ ...slide, eyebrow: e.target.value })} />
              </Field>
              <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <Field label="Título — 1ª linha">
                  <input value={slide.titleTop} onChange={(e) => update({ ...slide, titleTop: e.target.value })} />
                </Field>
                <Field label="Título — 2ª linha">
                  <input value={slide.titleBottom} onChange={(e) => update({ ...slide, titleBottom: e.target.value })} />
                </Field>
              </div>
              <Field label="Texto">
                <textarea rows={2} value={slide.subtitle} onChange={(e) => update({ ...slide, subtitle: e.target.value })} />
              </Field>
              <Field label="Palavra de fundo" hint="Aparece gigante atrás do texto, só em telas largas.">
                <input value={slide.watermark} onChange={(e) => update({ ...slide, watermark: e.target.value })} />
              </Field>
            </>
          )}
        />
      </>
    )
  }

  if (id === 'ABOUT') {
    const highlights: string[] = draft.highlights ?? []
    return (
      <>
        <Fold title="Retrato" hint="A foto ao lado do texto" defaultOpen>
          <ImageField slot="about.portrait" images={images} targets={targets} onChanged={onChanged} />
        </Fold>
        <Fold title="Título e texto" hint="Sobrelinha, título e parágrafo" defaultOpen>
          <HeadingFields draft={draft} set={set} />
          <Field label="Texto principal">
            <textarea rows={5} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
        </Fold>
        <Fold title="Pontos" hint="As linhas com traço à esquerda" count={highlights.length}>
          <StringList
            label="Pontos"
            hideLabel
            items={highlights}
            max={8}
            onChange={(items) => set('highlights', items)}
          />
        </Fold>
        <Fold title="Registro e botão" hint="CRM, marca de fundo e chamada">
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Field label="Registro">
              <input value={draft.crmLabel ?? ''} onChange={(e) => set('crmLabel', e.target.value)} />
            </Field>
            <Field label="Número">
              <input value={draft.crmNumber ?? ''} onChange={(e) => set('crmNumber', e.target.value)} />
            </Field>
            <Field label="Palavra de fundo">
              <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
            </Field>
          </div>
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Fold>
      </>
    )
  }

  if (id === 'PROCEDURES') {
    return (
      <>
        <p className="hint">
          Os tratamentos em si ficam em <strong>Cadastros → Procedimentos</strong>. Aqui é o
          texto que emoldura a lista.
        </p>
        <Fold title="Título e texto" hint="O cabeçalho da seção" defaultOpen>
          <HeadingFields draft={draft} set={set} lead />
        </Fold>
        <Fold title="Botão" hint="A chamada abaixo da lista">
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Fold>
      </>
    )
  }

  if (id === 'TECHNOLOGY') {
    const items: any[] = draft.items ?? []
    return (
      <>
        <Fold title="Título e texto" hint="O cabeçalho da seção" defaultOpen>
          <HeadingFields draft={draft} set={set} lead />
          <Field label="Palavra de fundo">
            <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
          </Field>
        </Fold>
        <RepeatingList
          label="Recursos"
          items={items}
          max={6}
          openFirst
          itemTitle={(item, index) => item.name || `Recurso ${index + 1}`}
          onChange={(next) => set('items', next)}
          blank={() => ({ number: '', name: '', eyebrow: '', monogram: '', description: '', points: [] })}
          render={(item, _index, update) => (
            <>
              <div className="form-row" style={{ gridTemplateColumns: '80px minmax(0, 1fr) 90px' }}>
                <Field label="Número">
                  <input value={item.number} onChange={(e) => update({ ...item, number: e.target.value })} />
                </Field>
                <Field label="Nome">
                  <input value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} />
                </Field>
                <Field label="Monograma" hint="1 a 3 letras.">
                  <input value={item.monogram} onChange={(e) => update({ ...item, monogram: e.target.value })} maxLength={3} />
                </Field>
              </div>
              <Field label="Sobrelinha">
                <input value={item.eyebrow} onChange={(e) => update({ ...item, eyebrow: e.target.value })} />
              </Field>
              <Field label="Descrição">
                <textarea rows={3} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
              </Field>
              <StringList
                label="Pontos"
                items={item.points ?? []}
                max={8}
                onChange={(points) => update({ ...item, points })}
              />
            </>
          )}
        />
      </>
    )
  }

  if (id === 'TESTIMONIALS') {
    return (
      <>
        <p className="hint">
          Os depoimentos ficam em <strong>Cadastros → Depoimentos</strong>. Aqui só o título da
          seção.
        </p>
        <Fold title="Título da seção" defaultOpen>
          <HeadingFields draft={draft} set={set} />
        </Fold>
      </>
    )
  }

  if (id === 'APPOINTMENT') {
    return (
      <>
        <Fold title="Título e texto" hint="O que fica ao lado do formulário" defaultOpen>
          <HeadingFields draft={draft} set={set} lead />
        </Fold>
        <Fold title="Aviso e WhatsApp" hint="O que aparece sob o formulário">
          <Field label="Aviso sob o formulário" hint="Explica o que acontece depois do envio.">
            <textarea rows={3} value={draft.disclaimer ?? ''} onChange={(e) => set('disclaimer', e.target.value)} />
          </Field>
          <Field label="WhatsApp" hint="Só números, com DDD. Deixe vazio para não mostrar.">
            <input
              value={draft.whatsapp ?? ''}
              onChange={(e) => set('whatsapp', e.target.value || null)}
              placeholder="67999998888"
            />
          </Field>
        </Fold>
      </>
    )
  }

  if (id === 'FOOTER') {
    return (
      <>
        <Fold title="Marca" hint="Logo e frase de apresentação" defaultOpen>
          <ImageField slot="footer.logo" images={images} targets={targets} onChanged={onChanged} />
          <Field label="Frase de apresentação">
            <textarea rows={3} value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </Fold>
        <Fold title="Contato" hint="Endereço, telefone, e-mail e Instagram" defaultOpen>
          <Field label="Endereço">
            <input value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Telefone">
              <input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value || null)} />
            </Field>
            <Field label="E-mail">
              <input value={draft.email ?? ''} onChange={(e) => set('email', e.target.value || null)} />
            </Field>
          </div>
          <Field label="Instagram" hint="Só o nome do perfil, sem @ nem link.">
            <input value={draft.instagram ?? ''} onChange={(e) => set('instagram', e.target.value || null)} />
          </Field>
        </Fold>
        <Fold title="Newsletter" hint="A caixa de inscrição">
          <Field label="Título da newsletter">
            <input value={draft.newsletterTitle ?? ''} onChange={(e) => set('newsletterTitle', e.target.value)} />
          </Field>
          <Field label="Chamada da newsletter">
            <textarea rows={2} value={draft.newsletterLead ?? ''} onChange={(e) => set('newsletterLead', e.target.value)} />
          </Field>
        </Fold>
      </>
    )
  }

  // SEO
  return (
    <>
      <Fold title="Google" hint="Título e descrição do resultado" defaultOpen>
        <Field
          label="Título na busca"
          required
          hint={`${(draft.title ?? '').length}/70 — o Google corta o que passar disso.`}
        >
          <input value={draft.title ?? ''} onChange={(e) => set('title', e.target.value)} maxLength={70} />
        </Field>
        <Field
          label="Descrição na busca"
          required
          hint={`${(draft.description ?? '').length}/180 — é o parágrafo abaixo do título no resultado.`}
        >
          <textarea rows={3} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} maxLength={180} />
        </Field>
      </Fold>
      <Fold title="Redes sociais" hint="A imagem que acompanha o link" defaultOpen>
        <ImageField slot="seo.og" images={images} targets={targets} onChanged={onChanged} />
      </Fold>
    </>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Listas editáveis
// ─────────────────────────────────────────────────────────────────────────────
