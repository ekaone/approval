import { describe, it, expect } from 'vitest'
import { createNoopSurface } from '../../src/surfaces/noop.js'
import type { PendingTask } from '../../src/types/index.js'

const task: PendingTask = { id: 'task-001', status: 'PENDING_APPROVAL' }

describe('createNoopSurface', () => {
  it('auto-approves by default', async () => {
    const res = await createNoopSurface().request(task)
    expect(res.decision).toBe('approve')
    expect(res.approvedBy).toBe('noop')
    expect(res.timestamp).toBeTypeOf('number')
  })

  it('auto-rejects when configured', async () => {
    expect((await createNoopSurface('reject').request(task)).decision).toBe('reject')
  })

  it('escalates when configured', async () => {
    expect((await createNoopSurface('escalate').request(task)).decision).toBe('escalate')
  })

  it('includes a reason string for every decision', async () => {
    for (const d of ['approve', 'reject', 'escalate'] as const) {
      const res = await createNoopSurface(d).request(task)
      expect(typeof res.reason).toBe('string')
      expect(res.reason).toContain(d)
    }
  })
})
