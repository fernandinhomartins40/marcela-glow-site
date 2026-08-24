import React from 'react'

/**
 * Atrasa a propagação de um valor que muda a cada tecla.
 *
 * As buscas do painel vão ao servidor com o texto digitado na `queryKey`, então
 * sem isto "Fernanda" dispara oito requisições e as respostas podem chegar fora
 * de ordem — a lista pisca com o resultado de um prefixo antigo. 250ms é o
 * intervalo em que a lista ainda parece acompanhar a digitação.
 */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
