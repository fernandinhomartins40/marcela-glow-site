import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  // `build:nativo` (`--mode nativo`): o app de loja serve da raiz, nunca de `/paciente/`.
  // Lido do argv e não de `defineConfig(({ mode }) => ...)`: a forma de função quebra o vitest deste repo.
  base: process.argv.includes('nativo') ? '/' : process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
