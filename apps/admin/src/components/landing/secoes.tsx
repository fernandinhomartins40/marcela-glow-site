import React from 'react'
import { Field } from '../../lib/ui'
import { Bloco, HeadingFields, ImageField, RepeatingList, StringList } from './campos'
import { CORES, ColorField } from './cores'
import type { LandingData, SectionId } from './types'

/**
 * Os campos de cada seção da landing.
 *
 * Um ramo por seção: cada uma tem o seu próprio conjunto de campos (a primeira
 * tela tem slides, o rodapé tem contato), então um formulário genérico só
 * caberia com configuração suficiente para ficar mais difícil de ler que os
 * ramos.
 *
 * Duas regras valem em todos eles:
 *
 * - **Nada nasce fechado.** Antes, um grupo dobrado escondia o campo e a pessoa
 *   tinha de adivinhar onde ele estava. Os blocos aqui são só divisórias com
 *   título — separam assunto sem esconder nada.
 * - **O rótulo diz o que a visitante vê**, não como o campo se chama no código.
 *   "Sobrelinha" virou "Linha pequena acima do título"; "palavra de fundo"
 *   ganhou a explicação de que ela é decorativa.
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
  if (id === 'THEME') {
    return (
      <Bloco
        title="Cores da marca"
        hint="Seis cores, e o site inteiro se pinta a partir delas."
        nota={
          <>
            Mudar aqui muda <strong>todas as secoes de uma vez</strong> — inclusive o menu
            do topo e a faixa rolante, que nao tem aba propria.
          </>
        }
      >
        {CORES.map((c) => (
          <ColorField
            key={c.campo}
            nome={c.nome}
            onde={c.onde}
            valor={draft[c.campo] ?? ''}
            onChange={(hsl) => set(c.campo, hsl)}
          />
        ))}
      </Bloco>
    )
  }

  if (id === 'HERO') {
    const slides: any[] = draft.slides ?? []
    return (
      <>
        <Bloco
          title="Botões de chamada"
          hint="Os dois botões sob o título. Aparecem em todos os slides."
        >
          <div className="form-row form-row-2">
            <Field label="Botão principal" hint="O mais destacado, escuro.">
              <input value={draft.primaryCta ?? ''} onChange={(e) => set('primaryCta', e.target.value)} />
            </Field>
            <Field label="Botão secundário" hint="O de contorno, ao lado.">
              <input value={draft.secondaryCta ?? ''} onChange={(e) => set('secondaryCta', e.target.value)} />
            </Field>
          </div>
        </Bloco>

        <RepeatingList
          label="Slides"
          singular="slide"
          hint="O site troca de slide sozinho, a cada poucos segundos."
          items={slides}
          max={5}
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
              <Field label="Linha pequena acima do título" hint="Sai em maiúsculas, discreta.">
                <input value={slide.eyebrow} onChange={(e) => update({ ...slide, eyebrow: e.target.value })} />
              </Field>
              <div className="form-row form-row-2">
                <Field label="Título — 1ª linha" hint="Sai em letra reta, mais firme.">
                  <input value={slide.titleTop} onChange={(e) => update({ ...slide, titleTop: e.target.value })} />
                </Field>
                <Field label="Título — 2ª linha" hint="Sai em itálico, mais leve.">
                  <input value={slide.titleBottom} onChange={(e) => update({ ...slide, titleBottom: e.target.value })} />
                </Field>
              </div>
              <Field label="Texto de apoio" hint="Uma ou duas frases sob o título.">
                <textarea rows={3} value={slide.subtitle} onChange={(e) => update({ ...slide, subtitle: e.target.value })} />
              </Field>
              <Field
                label="Palavra decorativa de fundo"
                hint="Uma palavra que aparece gigante e clarinha atrás do texto, só em telas grandes. Pode deixar vazio."
              >
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
        <Bloco title="Retrato" hint="A foto que aparece ao lado do texto.">
          <ImageField slot="about.portrait" images={images} targets={targets} onChanged={onChanged} />
        </Bloco>

        <Bloco title="Apresentação" hint="O título da seção e o parágrafo de abertura.">
          <HeadingFields draft={draft} set={set} />
          <Field label="Texto de apresentação" hint="O parágrafo principal sobre a doutora.">
            <textarea rows={6} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
        </Bloco>

        <Bloco
          title="Pontos de destaque"
          hint="Aparecem em lista, cada um com um tracinho à esquerda."
        >
          <StringList
            label="Ponto"
            items={highlights}
            max={8}
            placeholder="Ex.: Médica com CRM/MS 5691 em Chapadão do Sul"
            onChange={(items) => set('highlights', items)}
          />
        </Bloco>

        <Bloco title="Registro e botão" hint="O selo com o CRM e a chamada final.">
          <div className="form-row form-row-3">
            <Field label="Sigla do registro" hint="Ex.: CRM/MS.">
              <input value={draft.crmLabel ?? ''} onChange={(e) => set('crmLabel', e.target.value)} />
            </Field>
            <Field label="Número" hint="Só os dígitos.">
              <input value={draft.crmNumber ?? ''} onChange={(e) => set('crmNumber', e.target.value)} />
            </Field>
            <Field label="Palavra decorativa" hint="Fundo, opcional.">
              <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
            </Field>
          </div>
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Bloco>
      </>
    )
  }

  if (id === 'PROCEDURES') {
    return (
      <>
        <Bloco
          title="Cabeçalho da seção"
          hint="O título e o texto que apresentam a lista."
          nota={
            <>
              Os tratamentos em si não se escrevem aqui: eles vêm de{' '}
              <strong>Cadastros → Procedimentos</strong> e entram na lista automaticamente.
            </>
          }
        >
          <HeadingFields draft={draft} set={set} lead />
        </Bloco>
        <Bloco title="Botão" hint="A chamada que fica abaixo da lista.">
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Bloco>
      </>
    )
  }

  if (id === 'TECHNOLOGY') {
    const items: any[] = draft.items ?? []
    return (
      <>
        <Bloco title="Cabeçalho da seção" hint="O título e o texto de abertura.">
          <HeadingFields draft={draft} set={set} lead />
          <Field label="Palavra decorativa de fundo" hint="Opcional.">
            <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
          </Field>
        </Bloco>

        <RepeatingList
          label="Equipamentos e recursos"
          singular="recurso"
          hint="Cada um vira um bloco com foto de um lado e texto do outro."
          items={items}
          max={6}
          itemTitle={(item, index) => item.name || `Recurso ${index + 1}`}
          onChange={(next) => set('items', next)}
          blank={() => ({ number: '', name: '', eyebrow: '', monogram: '', description: '', points: [] })}
          render={(item, _index, update) => (
            <>
              <Field label="Nome do recurso">
                <input value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} />
              </Field>
              <div className="form-row form-row-2">
                <Field label="Numeração" hint="Ex.: 01, 02 — só decorativa.">
                  <input value={item.number} onChange={(e) => update({ ...item, number: e.target.value })} />
                </Field>
                <Field label="Iniciais" hint="1 a 3 letras, grandes ao fundo da foto.">
                  <input value={item.monogram} onChange={(e) => update({ ...item, monogram: e.target.value })} maxLength={3} />
                </Field>
              </div>
              <Field label="Linha pequena acima do nome">
                <input value={item.eyebrow} onChange={(e) => update({ ...item, eyebrow: e.target.value })} />
              </Field>
              <Field label="O que este recurso faz">
                <textarea rows={4} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
              </Field>
              <StringList
                label="Ponto"
                titulo="Pontos deste recurso"
                items={item.points ?? []}
                max={8}
                placeholder="Ex.: Estímulo muscular sem cirurgia"
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
      <Bloco
        title="Cabeçalho da seção"
        hint="O título acima dos depoimentos."
        nota={
          <>
            Os depoimentos das pacientes ficam em <strong>Cadastros → Depoimentos</strong>.
          </>
        }
      >
        <HeadingFields draft={draft} set={set} />
      </Bloco>
    )
  }

  if (id === 'APPOINTMENT') {
    return (
      <>
        <Bloco title="Convite" hint="O texto ao lado do formulário de agendamento.">
          <HeadingFields draft={draft} set={set} lead />
        </Bloco>
        <Bloco title="Aviso e WhatsApp" hint="O que aparece depois do formulário.">
          <Field
            label="Aviso sob o formulário"
            hint="Explique o que acontece depois que a paciente envia o pedido."
          >
            <textarea rows={3} value={draft.disclaimer ?? ''} onChange={(e) => set('disclaimer', e.target.value)} />
          </Field>
          <Field
            label="WhatsApp da clínica"
            hint="Só números, com DDD. Deixe vazio para não mostrar o botão."
          >
            <input
              value={draft.whatsapp ?? ''}
              onChange={(e) => set('whatsapp', e.target.value || null)}
              placeholder="67999998888"
              inputMode="numeric"
            />
          </Field>
        </Bloco>
      </>
    )
  }

  if (id === 'FOOTER') {
    return (
      <>
        <Bloco title="Marca" hint="A logo e a frase de apresentação no rodapé.">
          <ImageField slot="footer.logo" images={images} targets={targets} onChanged={onChanged} />
          <Field label="Frase de apresentação">
            <textarea rows={3} value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </Bloco>

        <Bloco title="Contato" hint="Como a paciente encontra e fala com a clínica.">
          <Field label="Endereço">
            <input value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <div className="form-row form-row-2">
            <Field label="Telefone" hint="Deixe vazio para não mostrar.">
              <input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value || null)} />
            </Field>
            <Field label="E-mail" hint="Deixe vazio para não mostrar.">
              <input value={draft.email ?? ''} onChange={(e) => set('email', e.target.value || null)} />
            </Field>
          </div>
          <Field label="Instagram" hint="Só o nome do perfil, sem @ e sem link.">
            <input
              value={draft.instagram ?? ''}
              onChange={(e) => set('instagram', e.target.value || null)}
              placeholder="dramarceladuch"
            />
          </Field>
        </Bloco>

        <Bloco title="Newsletter" hint="A caixinha de inscrição por e-mail.">
          <Field label="Título">
            <input value={draft.newsletterTitle ?? ''} onChange={(e) => set('newsletterTitle', e.target.value)} />
          </Field>
          <Field label="Chamada">
            <textarea rows={2} value={draft.newsletterLead ?? ''} onChange={(e) => set('newsletterLead', e.target.value)} />
          </Field>
        </Bloco>
      </>
    )
  }

  // SEO
  const titulo = (draft.title ?? '') as string
  const descricao = (draft.description ?? '') as string
  return (
    <>
      <Bloco
        title="Como o site aparece no Google"
        hint="É o que a pessoa lê antes de decidir clicar."
      >
        <Field label="Título do resultado" required hint={contador(titulo.length, 70)}>
          <input value={titulo} onChange={(e) => set('title', e.target.value)} maxLength={70} />
        </Field>
        <Field label="Resumo do resultado" required hint={contador(descricao.length, 180)}>
          <textarea
            rows={4}
            value={descricao}
            onChange={(e) => set('description', e.target.value)}
            maxLength={180}
          />
        </Field>
      </Bloco>
      <Bloco
        title="Imagem do link"
        hint="A foto que acompanha o endereço do site quando ele é colado no WhatsApp ou no Instagram."
      >
        <ImageField slot="seo.og" images={images} targets={targets} onChanged={onChanged} />
      </Bloco>
    </>
  )
}

/** Avisa quando o texto passa do que o Google mostra, em vez de só contar letras. */
function contador(atual: number, limite: number) {
  const sobrando = limite - atual
  if (atual === 0) return `Até ${limite} letras.`
  if (sobrando <= 0) return `${atual} de ${limite} letras — no limite; o que passar disso o Google corta.`
  if (sobrando <= 10) return `${atual} de ${limite} letras — faltam ${sobrando}.`
  return `${atual} de ${limite} letras.`
}
