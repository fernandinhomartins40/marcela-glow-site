/**
 * Se a versão instalada é menor que a mínima que a API aceita.
 *
 * Compara número a número (`1.10.0` > `1.9.3`). Valor ausente ou fora do
 * formato não bloqueia: um aviso de "atualize" por engano tranca a paciente
 * fora do app, que é pior do que deixá-la numa versão velha.
 */
export function versaoMenor(instalada: string | null | undefined, minima: unknown): boolean {
  const formato = /^\d+(\.\d+)*$/
  if (!instalada || typeof minima !== 'string' || !formato.test(instalada) || !formato.test(minima)) return false
  const a = instalada.split('.').map(Number)
  const b = minima.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diferenca = (a[i] ?? 0) - (b[i] ?? 0)
    if (diferenca !== 0) return diferenca < 0
  }
  return false
}
