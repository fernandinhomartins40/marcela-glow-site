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

function SeletorDeIcone({
  valor,
  opcoes,
  onChange,
}: {
  valor: string
  opcoes: readonly (readonly [string, string])[]
  onChange: (v: string) => void
}) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)}>
      {opcoes.map(([id, nome]) => (
        <option key={id} value={id}>{nome}</option>
      ))}
    </select>
  )
}

/* Os mesmos nomes de `TRUST_ICONS` e `CARE_ICONS` na API: outro valor é recusado. */
const ICONES_CONFIANCA = [
  ['registro', 'Estetoscópio (registro)'],
  ['pessoa', 'Pessoa (atendimento)'],
  ['local', 'Marcador (endereço)'],
  ['agenda', 'Agenda'],
  ['coracao', 'Coração'],
  ['estrela', 'Estrela'],
] as const

const ICONES_CUIDADO = [
  ['rosto', 'Rosto'],
  ['pele', 'Brilho (pele)'],
  ['pescoco', 'Ondas (pescoço)'],
  ['corpo', 'Linhas (corpo)'],
  ['cabelo', 'Flor (cabelo)'],
  ['bemestar', 'Pulso (bem-estar)'],
] as const

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

        <Bloco
          title="Legenda e assinatura"
          hint="Valem para todos os slides."
        >
          <StringList
            label="Palavra"
            titulo="Legenda vertical ao lado do retrato"
            items={draft.pillars ?? []}
            max={4}
            placeholder="Ex.: Ciência"
            onChange={(items) => set('pillars', items)}
          />
          <Field label="Assinatura sob os botões" hint="A linha pequena em maiúsculas. Deixe vazio para não mostrar.">
            <input value={draft.signature ?? ''} onChange={(e) => set('signature', e.target.value)} />
          </Field>
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
                <Field label="Título — 1ª linha">
                  <input value={slide.titleTop} onChange={(e) => update({ ...slide, titleTop: e.target.value })} />
                </Field>
                <Field label="Título — 2ª linha">
                  <input value={slide.titleBottom} onChange={(e) => update({ ...slide, titleBottom: e.target.value })} />
                </Field>
              </div>
              <Field label="Texto de apoio" hint="Uma ou duas frases sob o título.">
                <textarea rows={3} value={slide.subtitle} onChange={(e) => update({ ...slide, subtitle: e.target.value })} />
              </Field>
            </>
          )}
        />
      </>
    )
  }

  if (id === 'ABOUT') {
    return (
      <>
        <Bloco title="Apresentação" hint="O lado do mármore: título, parágrafo e botão.">
          <Field label="Linha pequena acima do título" hint="Sai em maiúsculas, com um traço ao lado.">
            <input value={draft.philosophyLabel ?? ''} onChange={(e) => set('philosophyLabel', e.target.value)} />
          </Field>
          <div className="form-row form-row-2">
            <Field label="Título — 1ª linha">
              <input value={draft.titleTop ?? ''} onChange={(e) => set('titleTop', e.target.value)} />
            </Field>
            <Field label="Título — 2ª linha">
              <input value={draft.titleBottom ?? ''} onChange={(e) => set('titleBottom', e.target.value)} />
            </Field>
          </div>
          <Field label="Texto de apresentação" hint="O parágrafo sobre a filosofia da doutora.">
            <textarea rows={5} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Bloco>

        <Bloco title="Citação" hint="O lado das folhas: a frase da doutora e quem assina.">
          <Field label="Frase" hint="Sai em itálico, entre aspas — não precisa digitar as aspas.">
            <textarea rows={3} value={draft.quote ?? ''} onChange={(e) => set('quote', e.target.value)} />
          </Field>
          <Field label="Assinatura" hint="Sai em maiúsculas sob o traço.">
            <input value={draft.quoteAuthor ?? ''} onChange={(e) => set('quoteAuthor', e.target.value)} />
          </Field>
          <Field label="Nome completo sob a assinatura">
            <input value={draft.eyebrow ?? ''} onChange={(e) => set('eyebrow', e.target.value)} />
          </Field>
          <div className="form-row form-row-2">
            <Field label="Sigla do registro" hint="Ex.: CRM/MS.">
              <input value={draft.crmLabel ?? ''} onChange={(e) => set('crmLabel', e.target.value)} />
            </Field>
            <Field label="Número" hint="Só os dígitos.">
              <input value={draft.crmNumber ?? ''} onChange={(e) => set('crmNumber', e.target.value)} />
            </Field>
          </div>
        </Bloco>
      </>
    )
  }

  if (id === 'TRUST') {
    const items: any[] = draft.items ?? []
    return (
      <RepeatingList
        label="Itens da faixa"
        singular="item"
        hint="De um a quatro, lado a lado no computador e um embaixo do outro no celular."
        items={items}
        max={4}
        itemTitle={(item, index) => item.title || `Item ${index + 1}`}
        onChange={(next) => set('items', next)}
        blank={() => ({ icon: 'estrela', title: '', detail: '' })}
        render={(item, _index, update) => (
          <>
            <div className="form-row form-row-2">
              <Field label="Título" hint="Em letra de destaque.">
                <input value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
              </Field>
              <Field label="Ícone">
                <SeletorDeIcone valor={item.icon} opcoes={ICONES_CONFIANCA} onChange={(icon) => update({ ...item, icon })} />
              </Field>
            </div>
            <Field label="Linha de apoio" hint="Pequena, em maiúsculas. Pode deixar vazio.">
              <input value={item.detail ?? ''} onChange={(e) => update({ ...item, detail: e.target.value })} />
            </Field>
          </>
        )}
      />
    )
  }

  if (id === 'CARE') {
    const items: any[] = draft.items ?? []
    return (
      <>
        <Bloco title="Cabeçalho da seção" hint="O título centralizado acima dos cartões.">
          <Field label="Linha pequena acima do título">
            <input value={draft.eyebrow ?? ''} onChange={(e) => set('eyebrow', e.target.value)} />
          </Field>
          <Field label="Título">
            <input value={draft.title ?? ''} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Texto de apoio">
            <textarea rows={3} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
        </Bloco>
        <RepeatingList
          label="Cartões"
          singular="cartão"
          hint="Até quatro. Cada cartão tem a sua foto; sem foto enviada, o site usa a que já vem pronta."
          items={items}
          max={4}
          itemTitle={(item, index) => item.name || `Cartão ${index + 1}`}
          onChange={(next) => set('items', next)}
          blank={() => ({ name: '', description: '', icon: 'pele', alt: '' })}
          render={(item, index, update) => (
            <>
              <ImageField slot={`care.${index}`} images={images} targets={targets} onChanged={onChanged} />
              <div className="form-row form-row-2">
                <Field label="Nome da área">
                  <input value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} />
                </Field>
                <Field label="Ícone no círculo">
                  <SeletorDeIcone valor={item.icon} opcoes={ICONES_CUIDADO} onChange={(icon) => update({ ...item, icon })} />
                </Field>
              </div>
              <Field label="Descrição" hint="Uma frase curta.">
                <textarea rows={2} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
              </Field>
              <Field label="Descrição da foto" hint="Para quem usa leitor de tela. Ex.: Pescoço e colo em close.">
                <input value={item.alt ?? ''} onChange={(e) => update({ ...item, alt: e.target.value })} />
              </Field>
            </>
          )}
        />
      </>
    )
  }

  if (id === 'VALUES') {
    return (
      <Bloco
        title="Palavras da faixa"
        hint="De duas a oito, separadas por traços no computador."
        nota={<>No celular aparecem as <strong>quatro primeiras</strong>, em lista.</>}
      >
        <StringList
          label="Palavra"
          items={draft.items ?? []}
          max={8}
          placeholder="Ex.: Resultados Reais"
          onChange={(items) => set('items', items)}
        />
      </Bloco>
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
        </Bloco>

        <RepeatingList
          label="Equipamentos e recursos"
          singular="recurso"
          hint="Cada recurso vira uma capa editorial com nome e categoria, ao lado do texto. Não há foto de equipamento nesta seção."
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
                <Field label="Iniciais decorativas" hint="1 a 3 letras, discretas ao fundo da capa editorial.">
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
        <Bloco
          title="Convite"
          hint="O texto ao lado do formulário de agendamento."
          nota={
            <>
              O telefone, o e-mail e o endereço ao lado do formulário vêm de{' '}
              <strong>Rodapé e contato</strong> — mudar lá muda aqui também.
            </>
          }
        >
          <HeadingFields draft={draft} set={set} lead />
        </Bloco>
        <Bloco title="Aviso" hint="A frase sob o botão de enviar.">
          <Field
            label="Aviso sob o formulário"
            hint="Explique o que acontece depois que a paciente envia o pedido."
          >
            <textarea rows={3} value={draft.disclaimer ?? ''} onChange={(e) => set('disclaimer', e.target.value)} />
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

        <Bloco title="Contato" hint="Aparece no rodapé e ao lado do formulário de agendamento.">
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

        <Bloco title="Horário de atendimento" hint="Uma linha por faixa de dias, na coluna Horário do rodapé.">
          <StringList
            label="Linha"
            items={draft.hours ?? []}
            max={4}
            placeholder="Ex.: Segunda a sexta: 9h às 18h"
            onChange={(items) => set('hours', items)}
          />
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
