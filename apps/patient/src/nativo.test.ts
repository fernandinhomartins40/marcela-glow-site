import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..')
const ler = (app: string) => readFileSync(join(root, `apps/${app}/src/lib/nativo.ts`))

describe('fronteira nativa', () => {
  it('nativo.ts é byte-idêntico no paciente e no painel', () => {
    // Os apps não importam um do outro; a cópia é a regra, e esta é a trava dela.
    expect(Buffer.compare(ler('patient'), ler('admin'))).toBe(0)
  })
})
