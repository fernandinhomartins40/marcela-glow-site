import React from 'react'

/**
 * Se o painel está rodando como aplicativo instalado.
 *
 * A diferença importa porque as duas situações pedem telas diferentes: no
 * navegador a pessoa tem barra de endereço, botão de voltar e abas, e a página
 * pode se comportar como página. Instalado, nada disso existe — o app precisa
 * carregar a própria navegação, respeitar o entalhe da câmera e não deixar a
 * rolagem revelar o fundo do sistema.
 *
 * Três formas de detectar, porque nenhuma cobre todos os aparelhos:
 *
 * - `display-mode: standalone` é o padrão, e funciona no Android e no desktop.
 * - `navigator.standalone` é o jeito antigo do Safari no iOS, que ignora a
 *   media query acima quando o app foi salvo na tela de início.
 * - `?app=1` na URL é a saída manual: serve para testar sem instalar, e para o
 *   `start_url` do manifesto forçar o modo mesmo onde a detecção falha. Ele é
 *   guardado no `sessionStorage` porque a primeira navegação interna descarta a
 *   query — sem isso o modo duraria só até a primeira troca de tela. A escolha
 *   do `sessionStorage` e não do `localStorage` é deliberada: o modo vale para
 *   esta aba, e não deve grudar no navegador de quem testou uma vez.
 *
 * O valor é fixo depois do primeiro cálculo. Um app não deixa de ser app no
 * meio do uso, e reavaliar a cada render faria a barra de navegação piscar.
 */
/**
 * Guarda a marca do `?app=1` antes de o roteador limpar a URL.
 *
 * O roteador dos dois apps redireciona a rota raiz com `replace`, e isso
 * descarta a query antes de qualquer componente montar — ler o parametro
 * dentro de um componente sempre encontrava a URL ja limpa. Chamar isto no
 * arranque, antes do React, resolve.
 */
export function registrarModoAplicativo(): void {
  if (typeof window === 'undefined') return
  try {
    if (new URLSearchParams(window.location.search).get('app') === '1') {
      sessionStorage.setItem('modo-aplicativo', '1')
    }
  } catch {
    // Armazenamento bloqueado: as outras deteccoes bastam.
  }
}

export function ehAplicativoInstalado(): boolean {
  if (typeof window === 'undefined') return false

  const porMediaQuery = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const porSafariIOS = (window.navigator as { standalone?: boolean }).standalone === true
  const CHAVE = 'modo-aplicativo'
  let porParametro = false
  try {
    if (new URLSearchParams(window.location.search).get('app') === '1') {
      sessionStorage.setItem(CHAVE, '1')
      porParametro = true
    } else {
      porParametro = sessionStorage.getItem(CHAVE) === '1'
    }
  } catch {
    // Navegador com armazenamento bloqueado: as outras duas deteccoes bastam.
  }

  return porMediaQuery || porSafariIOS || porParametro
}

/**
 * O mesmo valor, para componentes.
 *
 * `useState` com função de inicialização em vez de `useMemo`: o cálculo lê a
 * URL e o `matchMedia`, e precisa acontecer uma vez só. Com `useMemo` ele
 * rodaria de novo a cada remontagem.
 */
export function useAplicativoInstalado(): boolean {
  const [instalado] = React.useState(ehAplicativoInstalado)
  return instalado
}

/**
 * Marca o documento como aplicativo e desliga o zoom por pinça.
 *
 * `user-scalable=no` na meta viewport não resolve: o iOS o ignora desde a
 * versão 10, de propósito, para que página nenhuma bloqueie acessibilidade. O
 * que ele respeita é `touch-action`, e o duplo toque precisa ser cancelado no
 * gesto.
 *
 * Só vale instalado. No navegador o zoom continua funcionando — ali é uma
 * página, e uma página que não deixa aproximar o texto é um problema de
 * acessibilidade, não um app.
 *
 * A classe vai no `<html>`, não num `<div>`: pinça e duplo toque acontecem no
 * documento inteiro, inclusive sobre a barra de navegação, que é justamente
 * onde o zoom denuncia que aquilo não é um app.
 */
export function marcarDocumentoComoAplicativo(): void {
  if (typeof document === 'undefined') return
  if (!ehAplicativoInstalado()) return

  document.documentElement.classList.add('modo-aplicativo')

  /* O gesto de pinça do Safari não é coberto por `touch-action` em todos os
     casos, então é cancelado direto. `passive: false` é obrigatório: sem ele o
     `preventDefault` é ignorado. */
  const cancelar = (evento: Event) => evento.preventDefault()
  document.addEventListener('gesturestart', cancelar, { passive: false })
  document.addEventListener('gesturechange', cancelar, { passive: false })

  /* Duplo toque amplia mesmo com `touch-action` posto. Dois toques em menos de
     300ms são o gesto; acima disso é a pessoa tocando rápido em dois botões
     diferentes, que deve continuar funcionando. */
  let ultimoToque = 0
  document.addEventListener(
    'touchend',
    (evento) => {
      const agora = Date.now()
      if (agora - ultimoToque < 300) evento.preventDefault()
      ultimoToque = agora
    },
    { passive: false },
  )
}
