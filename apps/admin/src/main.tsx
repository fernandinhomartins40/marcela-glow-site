import React from 'react'
import ReactDOM from 'react-dom/client'
import { AdminApp } from './AdminApp'
import { registrarModoAplicativo } from './lib/standalone'

/* Antes do React: o roteador redireciona a rota raiz e descarta a query,
   entao o `?app=1` do manifesto precisa ser lido aqui. */
registrarModoAplicativo()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
)
