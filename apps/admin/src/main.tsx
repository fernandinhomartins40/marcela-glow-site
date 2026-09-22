import React from 'react'
import ReactDOM from 'react-dom/client'
import { AdminApp } from './AdminApp'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registrarModoAplicativo, marcarDocumentoComoAplicativo } from './lib/standalone'
import { usarManifestoDaClinica } from './lib/manifesto'

/* Antes do React: o roteador redireciona a rota raiz e descarta a query,
   entao o `?app=1` do manifesto precisa ser lido aqui. */
registrarModoAplicativo()
marcarDocumentoComoAplicativo()

/* O manifesto do build ja esta no HTML; isto troca pelo da API quando ela
   responde, sem impedir a instalacao se ela nao responder. */
usarManifestoDaClinica('admin')

/* O ErrorBoundary envolve tudo: erro de render em qualquer tela do painel cai
   numa pagina com mensagem e saida, em vez de deixar a clinica com a tela
   branca. */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AdminApp />
    </ErrorBoundary>
  </React.StrictMode>,
)
