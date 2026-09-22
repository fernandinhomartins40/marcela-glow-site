import { z } from 'zod'

/** Mesmo limite para a paciente e a equipe; espaços isolados não são mensagem. */
export const messageInputSchema = z.object({
  body: z.string().trim().min(1, 'Escreva uma mensagem').max(4000, 'Mensagem muito longa'),
})
