import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
/* As fontes vão no pacote, com os mesmos pesos que o Google Fonts servia: o app
   de loja não tem service worker para guardá-las e precisa abrir sem rede. */
import '@fontsource/cormorant-garamond/300.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/300-italic.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { ouvirPushNativo, TOKEN_KEY } from '@/lib/api'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import './styles.css'
import { registrarModoAplicativo, marcarDocumentoComoAplicativo } from '@/lib/standalone'
import { usarManifestoDaClinica } from '@/lib/manifesto'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AtualizeOApp, useAppDesatualizado } from '@/components/AtualizeOApp'
import { ehNativo, iniciarCasca, restaurarSessao } from '@/lib/nativo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

const routerBase = import.meta.env.BASE_URL === '/'
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  const navegar = useNavigate()
  const desatualizado = useAppDesatualizado()

  React.useEffect(() => {
    // No app de loja os arquivos já são locais: service worker só atrapalharia a atualização.
    if (!ehNativo && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
    }
  }, [])

  React.useEffect(() => {
    void ouvirPushNativo((caminho) => navegar(caminho)).catch(() => undefined)
  }, [navegar])

  if (desatualizado) return <AtualizeOApp />
  if (!localStorage.getItem(TOKEN_KEY)) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      {/* O detalhe de um tratamento tem URL propria: assim o voltar do celular
          funciona, o link sobrevive a recarga e o app nao perde o lugar. */}
      <Route path="/jornada/:planoId" element={<Dashboard />} />
      <Route path="/:section" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}

/* Antes do React: o roteador redireciona a rota raiz e descarta a query,
   entao o `?app=1` do manifesto precisa ser lido aqui. */
registrarModoAplicativo()
marcarDocumentoComoAplicativo()

/* O manifesto do build ja esta no HTML; isto troca pelo da API quando ela
   responde, sem impedir a instalacao se ela nao responder. No app de loja nao
   ha instalacao a oferecer. */
if (!ehNativo) usarManifestoDaClinica('patient')

/* A sessao volta do armazenamento do sistema antes de o React montar: as telas
   leem o token de forma sincrona. Na web resolve na hora. A casca (e o fim da
   abertura nativa) so depois do render, para nao mostrar a tela vazia.

   O ErrorBoundary por fora do QueryClient e do roteador: assim ele alcanca
   erro de render de qualquer tela, inclusive das que o roteador monta. */
void restaurarSessao(TOKEN_KEY).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBase}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
  )
  iniciarCasca()
})
