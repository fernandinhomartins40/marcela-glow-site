import type { CapacitorConfig } from '@capacitor/cli'

/*
 * Build de teste do verificador (`npm run build:nativo:teste`), nunca o de loja:
 * a página `https://localhost` fala com a API local em `http://10.0.2.2:3001`,
 * o que é conteúdo misto. O tráfego em claro só é liberado no APK de depuração
 * (`android/app/src/debug`), e o release se recusa a sair com isto ligado
 * (`preReleaseBuild` em `android/app/build.gradle`).
 */
const testeLocal = process.env.CAP_TESTE_LOCAL === '1'

/**
 * Casca nativa do portal da paciente.
 *
 * Os arquivos vão dentro do app (`webDir`, gerado por `npm run build:nativo`).
 * Nunca `server.url`: app que só carrega o site é recusado pela Apple (4.2) e
 * não abre sem rede.
 */
const config: CapacitorConfig = {
  appId: 'br.com.dramarceladuch.paciente',
  appName: 'Minha Jornada',
  webDir: 'dist',
  ...(testeLocal ? { android: { allowMixedContent: true } } : {}),
  plugins: {
    SplashScreen: {
      // Quem esconde é o `iniciarCasca()`, depois do primeiro render.
      launchAutoHide: false,
      backgroundColor: '#fff8f1',
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
  experimental: {
    ios: {
      spm: {
        // Evita a colisão de identidade de pacote SwiftPM (README do plugin, Capacitor CLI 8.4+).
        packageOptions: {
          '@capacitor-firebase/messaging': { symlink: true },
        },
      },
    },
  },
}

export default config
