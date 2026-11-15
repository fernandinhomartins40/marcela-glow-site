import React from 'react'
import { api } from '../lib/ui'
import { abrirExterno, ehNativo, plataforma, versaoDoApp } from '../lib/nativo'
import { versaoMenor } from '../lib/versao'

/* shortcut: o id da App Store só existe depois da primeira publicação; até lá
   o iOS mostra o aviso sem botão. Preencher antes de subir MIN_APP_VERSION_ADMIN. */
const LOJA: Record<string, string> = {
  android: 'https://play.google.com/store/apps/details?id=br.com.dramarceladuch.medica',
  ios: '',
}

/**
 * Se a API já não aceita esta versão do app de loja.
 *
 * O app não se atualiza junto com o deploy. Falha de rede ou de API não
 * bloqueia: na dúvida, o app abre.
 */
export function useAtualizacaoObrigatoria(): boolean {
  const [obrigatoria, setObrigatoria] = React.useState(false)

  React.useEffect(() => {
    if (!ehNativo) return
    let vivo = true
    Promise.all([versaoDoApp(), api.get('/app/versao')])
      .then(([atual, { data }]) => {
        const minima = (data as { admin?: { minima?: unknown } } | undefined)?.admin?.minima
        if (vivo && atual && typeof minima === 'string' && versaoMenor(atual, minima)) setObrigatoria(true)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [])

  return obrigatoria
}

export function AtualizeOApp() {
  const loja = LOJA[plataforma]
  return (
    <div role="alert" className="erro-tela">
      <h1>Atualize o aplicativo</h1>
      <p>
        Esta versão do Marcela CRM não funciona mais com o sistema da clínica.
        Instale a versão nova para continuar.
      </p>
      {loja && (
        <div className="erro-acoes">
          <button type="button" onClick={() => abrirExterno(loja)}>
            Abrir a loja
          </button>
        </div>
      )}
    </div>
  )
}
