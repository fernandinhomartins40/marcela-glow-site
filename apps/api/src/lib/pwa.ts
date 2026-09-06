import { z } from 'zod'

/**
 * Configuração dos aplicativos instaláveis.
 *
 * O manifesto era um arquivo estático em `public/`: mudar o nome ou a cor do
 * app pedia editar o repositório e publicar de novo. Aqui ele passa a sair de
 * `ClinicSetting`, como o quadro de leads já faz, e a clínica edita pelo painel.
 *
 * Os dois apps têm configuração separada porque são coisas diferentes: um vai
 * para o celular da paciente e carrega a marca da clínica; o outro é ferramenta
 * de trabalho e pode querer se distinguir na gaveta de aplicativos justamente
 * para não se confundir com o primeiro.
 */

/** A cor do tema pinta a barra do sistema; a de fundo, a tela de abertura. */
const corHex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #rrggbb, por exemplo #2f221b')

/**
 * `standalone` é o que faz o app abrir sem barra de endereço — é o que a
 * clínica quer em 99% dos casos. Os outros existem porque o padrão os define e
 * alguém pode ter motivo: `fullscreen` esconde até a barra de status,
 * `minimal-ui` mantém os controles de navegação, `browser` desiste de instalar.
 */
export const DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'browser'] as const

export const pwaAppSchema = z.object({
  name: z.string().trim().min(2).max(60),
  /** Aparece sob o ícone, onde cabem poucos caracteres. */
  shortName: z.string().trim().min(2).max(20),
  description: z.string().trim().max(300).default(''),
  themeColor: corHex,
  backgroundColor: corHex,
  display: z.enum(DISPLAY_MODES).default('standalone'),
})

export const pwaSettingsSchema = z.object({
  admin: pwaAppSchema,
  patient: pwaAppSchema,
})

export type PwaApp = z.infer<typeof pwaAppSchema>
export type PwaSettings = z.infer<typeof pwaSettingsSchema>

/** Qual app, e onde ele mora — o `scope` impede a landing de abrir dentro dele. */
export const PWA_APPS = {
  admin: { base: '/admin/', slotPrefix: 'app.admin' },
  patient: { base: '/paciente/', slotPrefix: 'app.patient' },
} as const

export type PwaAppId = keyof typeof PWA_APPS

/**
 * O que vale enquanto a clínica não editou nada.
 *
 * São os mesmos valores dos manifestos estáticos que existiam antes, para que
 * ligar esta tela não mude nenhum app já instalado.
 */
export const PWA_DEFAULTS: PwaSettings = {
  admin: {
    name: 'CRM Dra. Marcela',
    shortName: 'Marcela CRM',
    description: 'Painel administrativo da Clinica Dra. Marcela',
    themeColor: '#17201b',
    backgroundColor: '#f6f2ec',
    display: 'standalone',
  },
  patient: {
    name: 'Minha Jornada Dra. Marcela',
    shortName: 'Minha Jornada',
    description: 'Painel VIP de acompanhamento da paciente',
    themeColor: '#6f4f45',
    backgroundColor: '#fff8f1',
    display: 'standalone',
  },
}

/** A chave em `ClinicSetting`. */
export const PWA_SETTING_KEY = 'pwaApps'

/**
 * Monta o manifesto que o navegador lê.
 *
 * Os ícones enviados pelo painel entram primeiro e o `icon.svg` do build fica
 * por último: um app que nunca teve ícone enviado continua com o que sempre
 * teve, e um que teve não perde nada se o envio falhar pela metade.
 */
export function montarManifesto(
  app: PwaAppId,
  config: PwaApp,
  icones: Partial<Record<'192' | '512' | 'apple' | 'maskable', string>>,
) {
  const { base } = PWA_APPS[app]

  const lista: { src: string; sizes: string; type: string; purpose?: string }[] = []
  if (icones['192']) lista.push({ src: icones['192'], sizes: '192x192', type: 'image/png' })
  if (icones['512']) lista.push({ src: icones['512'], sizes: '512x512', type: 'image/png' })
  if (icones.apple) lista.push({ src: icones.apple, sizes: '180x180', type: 'image/png' })
  if (icones.maskable) {
    lista.push({ src: icones.maskable, sizes: '512x512', type: 'image/png', purpose: 'maskable' })
  }
  /* Sem nenhum ícone enviado, valem os do build.

     Precisam ser os PNG e não só o SVG: o Chrome no Android exige um PNG de
     192px ou maior para oferecer a instalação, e um manifesto com apenas SVG
     não satisfaz o requisito.

     E o caminho precisa ser absoluto. Este manifesto é servido de
     `/api/landing/manifest/...`, e o navegador resolve `src` relativo ao
     endereço do próprio manifesto — `icon-192.png` virava
     `/api/landing/manifest/icon-192.png`, que responde 404. A instalação então
     era oferecida, falhava ao buscar o ícone, e o navegador parava de
     oferecê-la sem dizer por quê. */
  if (lista.length === 0) {
    lista.push(
      { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    )
  }

  return {
    /* O `id` é o que separa um aplicativo do outro para o navegador.

       Sem ele a identidade sai da URL do manifesto — e como os dois HTMLs
       apontam para `/api/landing/manifest/...`, na mesma origem e com o
       caminho quase igual, o navegador podia tratá-los como o mesmo app:
       instalar o segundo substituía o primeiro na tela de início.

       O valor é o próprio `scope`, que já é único por app e não muda quando
       a clínica edita nome ou cores — trocar o `id` de um app instalado o
       faria aparecer como um aplicativo novo, deixando o antigo órfão. */
    id: base,
    name: config.name,
    short_name: config.shortName,
    ...(config.description ? { description: config.description } : {}),
    start_url: `${base}?app=1`,
    scope: base,
    display: config.display,
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    icons: lista,
  }
}
