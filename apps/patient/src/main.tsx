import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TOKEN_KEY } from '@/lib/api'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import './styles.css'
import { registrarModoAplicativo, marcarDocumentoComoAplicativo } from '@/lib/standalone'
import { usarManifestoDaClinica } from '@/lib/manifesto'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

const routerBase = import.meta.env.BASE_URL === '/'
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
    }
  }, [])

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
   responde, sem impedir a instalacao se ela nao responder. */
usarManifestoDaClinica('patient')

/* O ErrorBoundary por fora do QueryClient e do roteador: assim ele alcanca
   erro de render de qualquer tela, inclusive das que o roteador monta. */
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
