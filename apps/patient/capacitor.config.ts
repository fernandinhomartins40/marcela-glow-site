import type { CapacitorConfig } from '@capacitor/cli'

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
