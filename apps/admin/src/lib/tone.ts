/**
 * Tons das pastilhas de status, num módulo sem dependências.
 *
 * Vive separado de `lib/ui` porque `lib/schedule` também precisa dele, e
 * aquele é lógica pura de agenda — não deve carregar React nem axios só para
 * tipar um rótulo. Uma única definição garante que `Chip` recuse um tom que
 * não exista no CSS.
 */
export type Tone = 'success' | 'warning' | 'info' | 'neutral' | 'danger'
