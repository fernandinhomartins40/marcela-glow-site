import { describe, expect, it } from 'vitest'
import { messageInputSchema } from './message-input'

describe('mensagem do portal', () => {
  it('remove espaços antes de salvar', () => {
    expect(messageInputSchema.parse({ body: '  Olá, equipe  ' }).body).toBe('Olá, equipe')
  })

  it('rejeita vazio e excesso de texto', () => {
    expect(messageInputSchema.safeParse({ body: '  \n  ' }).success).toBe(false)
    expect(messageInputSchema.safeParse({ body: 'a'.repeat(4001) }).success).toBe(false)
    expect(messageInputSchema.safeParse({ body: 'a'.repeat(4000) }).success).toBe(true)
  })
})
