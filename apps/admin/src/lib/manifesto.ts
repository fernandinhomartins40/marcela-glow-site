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

  /* `HEAD` em vez de `GET`: só interessa saber se a rota responde, e o corpo
     seria baixado de novo pelo navegador na hora de instalar. */
  fetch(daApi, { method: 'HEAD' })
    .then((resposta) => {
      if (resposta.ok) link.href = daApi
    })
    .catch(() => {
      // API fora do ar: o manifesto do build continua valendo, que é o ponto.
    })
}
