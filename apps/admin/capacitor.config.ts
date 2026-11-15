import type { CapacitorConfig } from '@capacitor/cli'

/*
 * O app da médica na loja. O código vai dentro do binário (`webDir`), nunca
 * carregado de um endereço: `server.url` faria dele um site embrulhado, o caso
 * clássico de recusa da Apple (diretriz 4.2), e o app não abriria sem rede.
 *
 * Antes de sincronizar: `npm run build:nativo` (base `/`, API e site absolutos).
 */
const config: CapacitorConfig = {
  appId: 'br.com.dramarceladuch.medica',
  appName: 'Marcela CRM',
  webDir: 'dist',
  backgroundColor: '#f6f2ec',
  plugins: {
    SplashScreen: {
      // Quem esconde é o `iniciarCasca()`, no primeiro quadro: daí segue a abertura do `Splash.tsx`.
      launchAutoHide: false,
      backgroundColor: '#f6f2ec',
    },
  },
}

export default config
