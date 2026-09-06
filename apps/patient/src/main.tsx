import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TOKEN_KEY } from '@/lib/api'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import './styles.css'
import { registrarModoAplicativo } from '@/lib/standalone'

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
      <Route path="/:section" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}

/* Antes do React: o roteador redireciona a rota raiz e descarta a query,
   entao o `?app=1` do manifesto precisa ser lido aqui. */
registrarModoAplicativo()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBase}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
