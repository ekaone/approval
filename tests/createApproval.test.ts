import { describe, it, expect, vi } from 'vitest'
import { createApproval, createNoopSurface } from '../src/index.js'
import type { ApprovalSurface, PendingTask, Task } from '../src/index.js'

const makeTask = (overrides?: Partial<Task>): Task => ({ id: 'task-001', tags: [], ...overrides })

describe('createApproval — predicate sugar', () => {
  it('wraps a single predicate into a one-rule list', async () => {
    const approval = createApproval({ surface: createNoopSurface('approve'), policy: () => true })
    expect((await approval.request(makeTask())).decision).toBe('approve')
  })

  it('default policy matches every task when omitted', async () => {
    const approval = createApproval({ surface: createNoopSurface('approve') })
    expect((await approval.request(makeTask())).decision).toBe('approve')
  })

  it('auto-approves when predicate never matches', async () => {
    const approval = createApproval({ surface: createNoopSurface('reject'), policy: () => false })
    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')
    expect(res.reason).toBe('no matching policy')
  })

  it('gates on tags', async () => {
    const approval = createApproval({
      surface: createNoopSurface('reject'),
      policy: (t) => t.tags?.includes('destructive') ?? false,
    })
    expect((await approval.request(makeTask({ tags: ['read-only'] }))).decision).toBe('approve')
    expect((await approval.request(makeTask({ tags: ['destructive'] }))).decision).toBe('reject')
  })
})

describe('createApproval — ordered rule list', () => {
  it('first matching rule wins', async () => {
    const approval = createApproval({
      policy: [
        { match: (t) => t.tags?.includes('urgent') ?? false, surface: createNoopSurface('approve'), timeout: 5_000, fallback: 'reject' },
        { match: () => true, surface: createNoopSurface('reject'), timeout: 5_000, fallback: 'reject' },
      ],
    })
    expect((await approval.request(makeTask({ tags: ['urgent'] }))).decision).toBe('approve')
    expect((await approval.request(makeTask({ tags: [] }))).decision).toBe('reject')
  })

  it('auto-approves when no rule in the list matches', async () => {
    const approval = createApproval({
      policy: [{ match: () => false, surface: createNoopSurface('reject'), timeout: 5_000, fallback: 'reject' }],
    })
    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')
    expect(res.reason).toBe('no matching policy')
  })
})

describe('createApproval — timeout fallback', () => {
  it('fires fallback when surface does not respond in time', async () => {
    vi.useFakeTimers()
    const hanging: ApprovalSurface = { request: (_: PendingTask) => new Promise(() => {}) }
    const approval = createApproval({ surface: hanging, timeout: 1_000, fallback: 'reject', policy: () => true })
    const promise = approval.request(makeTask())
    vi.advanceTimersByTime(1_001)
    const res = await promise
    expect(res.decision).toBe('reject')
    expect(res.reason).toBe('timeout')
    vi.useRealTimers()
  })
})

describe('createApproval — addPolicy', () => {
  it('appends a rule and uses it for subsequent requests', async () => {
    const approval = createApproval({ surface: createNoopSurface('approve'), policy: () => false })

    expect((await approval.request(makeTask({ tags: ['admin'] }))).decision).toBe('approve')

    approval.addPolicy({
      match: (t) => t.tags?.includes('admin') ?? false,
      surface: createNoopSurface('reject'),
      timeout: 5_000,
      fallback: 'reject',
    })

    expect((await approval.request(makeTask({ tags: ['admin'] }))).decision).toBe('reject')
  })
})
