import { describe, it, expect, vi } from 'vitest'
import { withTimeout } from '../src/core/timeout.js'

describe('withTimeout', () => {
  it('resolves with the promise value when it settles before the deadline', async () => {
    const result = await withTimeout(Promise.resolve(42), 5_000, () => -1)
    expect(result).toBe(42)
  })

  it('fires the fallback when the deadline expires first', async () => {
    vi.useFakeTimers()
    const hanging = new Promise<number>(() => {})
    const promise = withTimeout(hanging, 1_000, () => -1)
    vi.advanceTimersByTime(1_001)
    expect(await promise).toBe(-1)
    vi.useRealTimers()
  })

  it('does not fire the fallback after the promise already resolved', async () => {
    vi.useFakeTimers()
    let fallbackCalled = false
    const result = await withTimeout(Promise.resolve(99), 1_000, () => {
      fallbackCalled = true
      return -1
    })
    vi.advanceTimersByTime(2_000)
    expect(result).toBe(99)
    expect(fallbackCalled).toBe(false)
    vi.useRealTimers()
  })

  it('works with non-numeric generic types', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 5_000, () => 'fallback')
    expect(result).toBe('ok')
  })
})
