/**
 * Troca o manifesto do build pelo que a clínica editou no painel.
 *
 * O HTML aponta para o arquivo estático, que sempre existe: assim o app
 * continua instalável mesmo com a API fora do ar — e instalabilidade que
 * depende de servidor é instalabilidade que some justo quando a rede falha.
 *
 * Depois que a página carrega, este código pergunta à API se há uma versão
 * editada. Se houver, troca o `href` do link. O navegador relê o manifesto ao
 * oferecer a instalação, então a troca chega a tempo de valer.
 *
 * Quem já instalou não é afetado: o app instalado guarda o manifesto do momento
 * da instalação, e uma edição posterior só aparece numa reinstalação.
 */

export function usarManifestoDaClinica(app: 'admin' | 'patient'): void {
  if (typeof document === 'undefined') return

  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) return

  const daApi = `/api/landing/manifest/${app}.webmanifest`

  /* `GET` e não `HEAD`: além de saber se a rota responde, o corpo é usado
     abaixo para achar o ícone do iPhone. O navegador relê o manifesto na hora
     de instalar, então isto não substitui a leitura dele. */
  fetch(daApi)
    .then(async (resposta) => {
      if (!resposta.ok) return
      link.href = daApi
      aplicarIconeDoIphone(await resposta.json())
    })
    .catch(() => {
      // API fora do ar: o manifesto do build continua valendo, que é o ponto.
    })
}

/**
 * O iOS não lê `icons` do manifesto para a tela de início — ele lê a tag
 * `apple-touch-icon` do HTML. Sem isto, o "Ícone do iPhone" que a clínica envia
 * pelo painel ia para o storage e entrava no manifesto, mas o iPhone continuava
 * mostrando o ícone que veio no build: a tela prometia uma coisa e o aparelho
 * fazia outra.
 *
 * O ícone de 180px é o do campo "Ícone do iPhone"; na falta dele, o de 192px
 * serve — é quadrado e opaco, que é o que o iOS espera. O `maskable` fica de
 * fora de propósito: ele tem margem para o recorte em círculo do Android, e no
 * iPhone apareceria pequeno demais dentro do quadrado.
 */
function aplicarIconeDoIphone(manifesto: unknown): void {
  const icones = (manifesto as { icons?: { src?: string; sizes?: string; purpose?: string }[] })?.icons
  if (!Array.isArray(icones)) return

  const semMascara = icones.filter((i) => i?.src && !/maskable/.test(i.purpose ?? ''))
  const escolhido = semMascara.find((i) => i.sizes === '180x180') ?? semMascara.find((i) => i.sizes === '192x192')
  if (!escolhido?.src) return

  const tag = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (tag) tag.href = escolhido.src
}
