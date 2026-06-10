import { describe, it, expect } from 'vitest'
import { matchRule, noMatchResponse, timeoutResponse, toPendingTask } from '../src/core/engine.js'
import { createNoopSurface } from '../src/surfaces/noop.js'
import type { ApprovalPolicyRule, Task } from '../src/types/index.js'

const makeRule = (match: (t: Task) => boolean): ApprovalPolicyRule => ({
  match,
  surface: createNoopSurface('approve'),
  timeout: 5_000,
  fallback: 'reject',
})

describe('matchRule', () => {
  it('returns the first matching rule', () => {
    const r1 = makeRule((t) => t.tags?.includes('a') ?? false)
    const r2 = makeRule(() => true)
    expect(matchRule([r1, r2], { id: 'x', tags: ['a'] })).toBe(r1)
  })

  it('skips non-matching leading rules', () => {
    const r1 = makeRule(() => false)
    const r2 = makeRule(() => true)
    expect(matchRule([r1, r2], { id: 'x' })).toBe(r2)
  })

  it('returns undefined when no rule matches', () => {
    expect(matchRule([makeRule(() => false)], { id: 'x' })).toBeUndefined()
  })

  it('returns undefined for an empty list', () => {
    expect(matchRule([], { id: 'x' })).toBeUndefined()
  })
})

describe('noMatchResponse', () => {
  it('auto-approves with no-match reason', () => {
    const res = noMatchResponse()
    expect(res.decision).toBe('approve')
    expect(res.reason).toBe('no matching policy')
    expect(res.approvedBy).toBe('system')
    expect(res.timestamp).toBeTypeOf('number')
  })
})

describe('timeoutResponse', () => {
  it('carries the given fallback decision', () => {
    expect(timeoutResponse('reject').decision).toBe('reject')
    expect(timeoutResponse('approve').decision).toBe('approve')
    expect(timeoutResponse('escalate').decision).toBe('escalate')
  })

  it('marks reason as timeout', () => {
    expect(timeoutResponse('reject').reason).toBe('timeout')
    expect(timeoutResponse('reject').approvedBy).toBe('system')
  })
})

describe('toPendingTask', () => {
  it('stamps PENDING_APPROVAL status onto the task', () => {
    const task: Task = { id: 'x', tags: ['foo'], description: 'bar' }
    const pending = toPendingTask(task)
    expect(pending.status).toBe('PENDING_APPROVAL')
    expect(pending.id).toBe('x')
    expect(pending.tags).toEqual(['foo'])
    expect(pending.description).toBe('bar')
  })
})
