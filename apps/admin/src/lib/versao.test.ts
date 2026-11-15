import { describe, expect, it } from 'vitest'
import { versaoMenor } from './versao'

describe('versão mínima do app', () => {
  it('compara número a número, não como texto', () => {
    expect(versaoMenor('1.9.3', '1.10.0')).toBe(true)
    expect(versaoMenor('1.10.0', '1.9.3')).toBe(false)
  })

  it('igual não é menor, e parte ausente vale zero', () => {
    expect(versaoMenor('1.2.0', '1.2.0')).toBe(false)
    expect(versaoMenor('1.2', '1.2.0')).toBe(false)
    expect(versaoMenor('1.2', '1.2.1')).toBe(true)
  })

  it('o padrão da API (0.0.0) nunca bloqueia', () => {
    expect(versaoMenor('1.0.0', '0.0.0')).toBe(false)
    expect(versaoMenor('0.0.1', '0.0.0')).toBe(false)
  })

  it('ignora sufixo de pré-lançamento', () => {
    expect(versaoMenor('2.0.0-beta.1', '2.0.0')).toBe(false)
  })
})
