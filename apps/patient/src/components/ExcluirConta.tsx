import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { excluirConta, getErrorMessage } from '@/lib/api'
import { Feedback } from './ui'
import { abrirExterno, URL_DO_SITE } from '@/lib/nativo'

/**
 * Exclusão do acesso ao portal, exigida pelas lojas (Apple 5.1.1(v)) e
 * oferecida também na web.
 *
 * O prontuário tem guarda legal obrigatória: o que sai é o acesso — senha,
 * sessões e lembretes —, não o registro clínico. A tela diz isso antes de
 * pedir a senha, para ninguém achar que apagou o que não apagou.
 */
export function ExcluirConta({ onFechar }: { onFechar: () => void }) {
  const [senha, setSenha] = React.useState('')
  const excluir = useMutation({ mutationFn: () => excluirConta(senha) })

  React.useEffect(() => {
    const fechar = (event: KeyboardEvent) => event.key === 'Escape' && onFechar()
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [onFechar])

  function enviar(event: React.FormEvent) {
    event.preventDefault()
    if (excluir.isPending || !senha) return
    excluir.mutate()
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="excluir-conta-titulo">
      <button type="button" className="absolute inset-0 w-full bg-[hsl(var(--espresso))]/40" onClick={onFechar} aria-label="Fechar" tabIndex={-1} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl bg-card px-5 pt-4 shadow-2xl" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <p id="excluir-conta-titulo" className="font-display text-xl text-primary">Excluir minha conta</p>
          <button type="button" onClick={onFechar} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary" aria-label="Fechar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={enviar} className="mt-2 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O seu acesso ao portal é removido: a senha deixa de valer, as sessões abertas são encerradas e os lembretes
            param. O seu registro clínico é mantido pela clínica, por obrigação legal. Detalhes na{' '}
            <button type="button" className="underline underline-offset-2" onClick={() => abrirExterno(`${URL_DO_SITE}/privacidade`)}>
              política de privacidade
            </button>
            .
          </p>
          <div>
            <label htmlFor="excluir-senha" className="block text-sm font-medium text-foreground mb-1.5">
              Confirme com a sua senha
            </label>
            <input
              id="excluir-senha"
              type="password"
              className="field"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </div>
          {excluir.isError && <Feedback tone="error">{getErrorMessage(excluir.error)}</Feedback>}
          <button type="submit" className="btn-primary w-full" disabled={excluir.isPending || !senha}>
            {excluir.isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {excluir.isPending ? 'Excluindo...' : 'Excluir meu acesso'}
          </button>
          <button type="button" onClick={onFechar} className="btn-outline w-full">
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}
