/**
 * A única fronteira entre o app e a casca nativa (Capacitor).
 *
 * Tudo o que se comporta diferente dentro do app de loja passa por aqui; na
 * web cada função faz exatamente o que o código fazia antes dela existir.
 *
 * Este arquivo é par byte-idêntico em `apps/admin` e `apps/patient`, como o
 * `manifesto.ts`: os apps não importam um do outro. `nativo.test.ts` (no
 * paciente) guarda a igualdade — ao mudar um, copie para o outro.
 */
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Preferences } from '@capacitor/preferences'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

export const ehNativo: boolean = Capacitor.isNativePlatform()

export const plataforma = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

/** Endereço público do site. Na casca a origem é `https://localhost`, que não serve para link. */
export const URL_DO_SITE: string = (
  (import.meta.env.VITE_SITE_URL as string | undefined) || window.location.origin
).replace(/\/+$/, '')

/**
 * Copia o token do armazenamento do sistema para o `localStorage`.
 *
 * Roda antes de o React montar, para as telas continuarem lendo o token de
 * forma síncrona. O iOS pode limpar o armazenamento da WebView sob pressão de
 * espaço; o do sistema (Preferences) não.
 */
export async function restaurarSessao(chave: string): Promise<void> {
  if (!ehNativo) return
  try {
    const { value } = await Preferences.get({ key: chave })
    if (value) localStorage.setItem(chave, value)
    else {
      // Sessão aberta antes de o espelho existir: sobe para o sistema.
      const local = localStorage.getItem(chave)
      if (local) await Preferences.set({ key: chave, value: local })
    }
  } catch {
    // Sem o armazenamento do sistema o app segue com o que a WebView tiver.
  }
}

export function guardarSessao(chave: string, token: string): void {
  localStorage.setItem(chave, token)
  if (ehNativo) void Preferences.set({ key: chave, value: token }).catch(() => undefined)
}

export function esquecerSessao(chave: string): void {
  localStorage.removeItem(chave)
  if (ehNativo) void Preferences.remove({ key: chave }).catch(() => undefined)
}

/** Anexo, WhatsApp, site: no app abre o navegador do sistema, que sabe baixar e trocar de app. */
export function abrirExterno(url: string): void {
  if (ehNativo) {
    void Browser.open({ url }).catch(() => undefined)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Comportamentos de casca: voltar do Android, barra de status, abertura nativa.
 *
 * A cor da barra vem da `<meta name="theme-color">` de cada app, para este
 * arquivo não precisar saber em qual dos dois está.
 */
export function iniciarCasca(): void {
  if (!ehNativo) return

  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })

  const cor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content
  // Android: a barra é pintada com a cor do tema (escura), ícones claros. `setBackgroundColor` não vale no Android 15+ (edge-to-edge).
  // iOS: a página passa por baixo da barra e o fundo dos dois apps é creme — texto escuro, senão a hora some.
  void StatusBar.setStyle({ style: plataforma === 'ios' ? Style.Light : Style.Dark }).catch(() => undefined)
  if (cor && plataforma === 'android') {
    void StatusBar.setBackgroundColor({ color: cor }).catch(() => undefined)
  }

  // A abertura nativa (cor + ícone) sai no primeiro quadro; daí assume a animada do `Splash.tsx`.
  requestAnimationFrame(() => void SplashScreen.hide().catch(() => undefined))
}

export async function versaoDoApp(): Promise<string | null> {
  if (!ehNativo) return null
  try {
    return (await App.getInfo()).version
  } catch {
    return null
  }
}
