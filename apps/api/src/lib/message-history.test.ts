import { describe, expect, it } from 'vitest'
import { messageHistoryQuerySchema } from './message-history'

describe('message history query', () => {
  it('uses a bounded default page size', () => {
    expect(messageHistoryQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(messageHistoryQuerySchema.parse({ limit: '50', cursor: 'message-1' })).toEqual({ limit: 50, cursor: 'message-1' })
  })

  it('rejects invalid page sizes and empty cursors', () => {
    expect(() => messageHistoryQuerySchema.parse({ limit: '51' })).toThrow()
    expect(() => messageHistoryQuerySchema.parse({ limit: '0' })).toThrow()
    expect(() => messageHistoryQuerySchema.parse({ cursor: '' })).toThrow()
  })
})
