import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  // O CRM é servido pelo nginx sob `/admin/`. Sem esta base explícita, um
  // build de container pode emitir `/assets/...`, que cai no site público e
  // deixa o painel em branco por receber HTML no lugar do bundle.
  base: '/admin/',
  plugins: [react()],
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
