import type { CapacitorConfig } from '@capacitor/cli'

/*
 * Build de teste do verificador (`npm run build:nativo:teste`), nunca o de loja:
 * a página `https://localhost` fala com a API local em `http://10.0.2.2:3001`,
 * o que é conteúdo misto. O tráfego em claro só é liberado no APK de depuração
 * (`android/app/src/debug`), e o release se recusa a sair com isto ligado
 * (`preReleaseBuild` em `android/app/build.gradle`).
 */
const testeLocal = process.env.CAP_TESTE_LOCAL === '1'

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
  ...(testeLocal ? { android: { allowMixedContent: true } } : {}),
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
