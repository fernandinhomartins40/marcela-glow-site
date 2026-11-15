import React from 'react'
import { Download } from 'lucide-react'
import { api } from '@/lib/api'
import { abrirExterno, ehNativo, plataforma, versaoDoApp } from '@/lib/nativo'
import { versaoMenor } from '@/lib/versao'

/* shortcut: no iOS abre a busca da loja, porque o id do app só existe depois
   do primeiro envio à Apple; trocar por `https://apps.apple.com/app/id<id>`
   assim que ele for publicado. */
const LOJA = plataforma === 'ios'
  ? 'https://apps.apple.com/br/search?term=Minha%20Jornada'
  : 'https://play.google.com/store/apps/details?id=br.com.dramarceladuch.paciente'

/**
 * Se o app de loja está abaixo da versão que a API aceita.
 *
 * O app não se atualiza junto com o deploy; quando a API precisa quebrar
 * contrato, ela sobe a mínima e a versão velha pede atualização em vez de
 * mostrar erro. Falha de rede não bloqueia: sem resposta, segue o app.
 */
export function useAppDesatualizado(): boolean {
  const [desatualizado, setDesatualizado] = React.useState(false)

  React.useEffect(() => {
    if (!ehNativo) return
    let vivo = true
    Promise.all([versaoDoApp(), api.get('/app/versao', { timeout: 8000 })])
      .then(([instalada, { data }]) => {
        if (vivo && versaoMenor(instalada, data?.patient?.minima)) setDesatualizado(true)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [])

  return desatualizado
}

export function AtualizeOApp() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 sm:p-10">
      <div className="panel panel-pad text-center py-12 w-full max-w-sm">
        <div className="w-11 h-11 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
          <Download size={18} className="text-accent" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl text-primary">Atualize o aplicativo</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Esta versão do Minha Jornada não é mais compatível. Instale a atualização para continuar acompanhando o
          seu cuidado.
        </p>
        <button type="button" onClick={() => abrirExterno(LOJA)} className="btn-primary w-full mt-6">
          Atualizar agora
        </button>
      </div>
    </main>
  )
}
