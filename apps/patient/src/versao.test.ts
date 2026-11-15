import { describe, expect, it } from 'vitest'
import { versaoMenor } from './lib/versao'

describe('versão mínima do app', () => {
  it('compara número a número, não como texto', () => {
    expect(versaoMenor('1.9.3', '1.10.0')).toBe(true)
    expect(versaoMenor('1.10.0', '1.9.3')).toBe(false)
    expect(versaoMenor('1.2', '1.2.0')).toBe(false)
    expect(versaoMenor('1.2.0', '1.2.1')).toBe(true)
  })

  it('não bloqueia com valor ausente ou estranho', () => {
    expect(versaoMenor(null, '9.9.9')).toBe(false)
    expect(versaoMenor('1.0.0', undefined)).toBe(false)
    expect(versaoMenor('1.0.0', '0.0.0')).toBe(false)
    expect(versaoMenor('1.0.0', 'abc')).toBe(false)
  })
})
