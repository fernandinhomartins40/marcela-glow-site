import React from 'react'
import ReactDOM from 'react-dom/client'
import { AdminApp } from './AdminApp'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registrarModoAplicativo, marcarDocumentoComoAplicativo } from './lib/standalone'
import { usarManifestoDaClinica } from './lib/manifesto'
import { ehNativo, iniciarCasca, restaurarSessao } from './lib/nativo'
import { TOKEN_KEY } from './lib/ui'
/* Os mesmos pesos e itálicos que o `<link>` do Google Fonts pedia. */
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

/* Antes do React: o roteador redireciona a rota raiz e descarta a query,
   entao o `?app=1` do manifesto precisa ser lido aqui. */
registrarModoAplicativo()
marcarDocumentoComoAplicativo()

/* O manifesto do build ja esta no HTML; isto troca pelo da API quando ela
   responde, sem impedir a instalacao se ela nao responder. */
if (!ehNativo) usarManifestoDaClinica('admin')
iniciarCasca()

/* O ErrorBoundary envolve tudo: erro de render em qualquer tela do painel cai
   numa pagina com mensagem e saida, em vez de deixar a clinica com a tela
   branca.

   A sessao do armazenamento do sistema volta antes de montar, para as telas
   continuarem lendo o token de forma sincrona. Na web resolve na hora. */
void restaurarSessao(TOKEN_KEY).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AdminApp />
      </ErrorBoundary>
    </React.StrictMode>,
  )
})
