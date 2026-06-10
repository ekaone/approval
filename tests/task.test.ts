import { describe, it, expect, vi } from 'vitest'
import { createApproval, createNoopSurface } from '../src/index.js'
import type { ApprovalSurface, PendingTask, Task } from '../src/index.js'

const makeTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-001',
  tags: [],
  ...overrides,
})

describe('createNoopSurface', () => {
  it('auto-approves by default', async () => {
    const surface = createNoopSurface()
    const task: PendingTask = { ...makeTask(), status: 'PENDING_APPROVAL' }
    const res = await surface.request(task)
    expect(res.decision).toBe('approve')
    expect(res.approvedBy).toBe('noop')
    expect(res.timestamp).toBeTypeOf('number')
  })

  it('auto-rejects when configured', async () => {
    const surface = createNoopSurface('reject')
    const task: PendingTask = { ...makeTask(), status: 'PENDING_APPROVAL' }
    const res = await surface.request(task)
    expect(res.decision).toBe('reject')
  })

  it('escalates when configured', async () => {
    const surface = createNoopSurface('escalate')
    const task: PendingTask = { ...makeTask(), status: 'PENDING_APPROVAL' }
    const res = await surface.request(task)
    expect(res.decision).toBe('escalate')
  })
})

describe('createApproval — basic', () => {
  it('approves a matching task', async () => {
    const approval = createApproval({
      surface: createNoopSurface('approve'),
      timeout: 5_000,
      fallback: 'reject',
      policy: () => true,
    })
    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')
  })

  it('auto-approves when no policy matches', async () => {
    const approval = createApproval({
      surface: createNoopSurface('reject'),
      timeout: 5_000,
      fallback: 'reject',
      policy: () => false,
    })
    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')
    expect(res.reason).toBe('no matching policy')
  })

  it('gates on tags', async () => {
    const approval = createApproval({
      surface: createNoopSurface('reject'),
      timeout: 5_000,
      fallback: 'approve',
      policy: (task) => task.tags?.includes('destructive') ?? false,
    })

    const safe = await approval.request(makeTask({ tags: ['read-only'] }))
    expect(safe.decision).toBe('approve') // no match → no-policy auto-approve

    const destructive = await approval.request(makeTask({ tags: ['destructive'] }))
    expect(destructive.decision).toBe('reject') // matched → noop rejects
  })

  it('default policy matches every task when omitted', async () => {
    const approval = createApproval({ surface: createNoopSurface('approve') })
    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')
  })
})

describe('createApproval — timeout fallback', () => {
  it('uses fallback decision after timeout expires', async () => {
    vi.useFakeTimers()

    const hanging: ApprovalSurface = {
      request: (_task: PendingTask) => new Promise(() => {}),
    }

    const approval = createApproval({
      surface: hanging,
      timeout: 1_000,
      fallback: 'reject',
      policy: () => true,
    })

    const promise = approval.request(makeTask())
    vi.advanceTimersByTime(1_001)
    const res = await promise

    expect(res.decision).toBe('reject')
    expect(res.reason).toBe('timeout')
    expect(res.approvedBy).toBe('system')

    vi.useRealTimers()
  })

  it('clears the timer when surface resolves before timeout', async () => {
    vi.useFakeTimers()

    const fast = createNoopSurface('approve')
    const approval = createApproval({
      surface: fast,
      timeout: 10_000,
      fallback: 'reject',
      policy: () => true,
    })

    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')

    vi.useRealTimers()
  })
})

describe('createApproval — ordered policy rules (first-match wins)', () => {
  it('applies the first matching rule and skips the rest', async () => {
    const approveUrgent = createNoopSurface('approve')
    const rejectAll = createNoopSurface('reject')

    const approval = createApproval({
      policy: [
        { match: (t) => t.tags?.includes('urgent') ?? false, surface: approveUrgent, timeout: 5_000, fallback: 'reject' },
        { match: () => true, surface: rejectAll, timeout: 5_000, fallback: 'reject' },
      ],
    })

    const urgent = await approval.request(makeTask({ tags: ['urgent'] }))
    expect(urgent.decision).toBe('approve') // rule 1 matched

    const normal = await approval.request(makeTask({ tags: [] }))
    expect(normal.decision).toBe('reject') // rule 1 skipped, rule 2 matched
  })

  it('auto-approves when no rule in the list matches', async () => {
    const approval = createApproval({
      policy: [
        { match: () => false, surface: createNoopSurface('reject'), timeout: 5_000, fallback: 'reject' },
      ],
    })
    const res = await approval.request(makeTask())
    expect(res.decision).toBe('approve')
    expect(res.reason).toBe('no matching policy')
  })
})

describe('createApproval — addPolicy', () => {
  it('dynamically adds a rule and uses it for subsequent requests', async () => {
    const approval = createApproval({
      surface: createNoopSurface('approve'),
      policy: () => false,
    })

    const before = await approval.request(makeTask({ tags: ['admin'] }))
    expect(before.decision).toBe('approve') // no match → no-policy auto-approve

    approval.addPolicy({
      match: (t) => t.tags?.includes('admin') ?? false,
      surface: createNoopSurface('reject'),
      timeout: 5_000,
      fallback: 'reject',
    })

    const after = await approval.request(makeTask({ tags: ['admin'] }))
    expect(after.decision).toBe('reject') // added rule now matches
  })
})
