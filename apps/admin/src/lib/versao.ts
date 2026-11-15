/**
 * Se a versão instalada do app é menor que a mínima que a API aceita.
 *
 * Compara número a número (`1.10.0` > `1.9.3`); o que vier depois de `-` ou
 * `+` (pré-lançamento, build) não conta. Parte ausente vale zero.
 */
export function versaoMenor(atual: string, minima: string): boolean {
  const partes = (v: string) => v.split(/[-+]/)[0].split('.').map((n) => Number.parseInt(n, 10) || 0)
  const a = partes(atual)
  const m = partes(minima)
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    const x = a[i] ?? 0
    const y = m[i] ?? 0
    if (x !== y) return x < y
  }
  return false
}
