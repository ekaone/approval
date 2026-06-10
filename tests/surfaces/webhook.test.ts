import { describe, it, expect, vi, afterEach } from 'vitest'
import { createWebhookSurface } from '../../src/surfaces/webhook.js'
import type { PendingTask } from '../../src/types/index.js'

const task: PendingTask = { id: 'task-001', status: 'PENDING_APPROVAL' }

function mockFetch(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => body,
    }),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('createWebhookSurface — happy path', () => {
  it('POSTs the task and returns the parsed decision', async () => {
    mockFetch({ decision: 'approve', approvedBy: 'alice', reason: 'lgtm' })
    const surface = createWebhookSurface({ url: 'https://example.com/approve' })
    const res = await surface.request(task)
    expect(res.decision).toBe('approve')
    expect(res.approvedBy).toBe('alice')
    expect(res.reason).toBe('lgtm')
    expect(res.timestamp).toBeTypeOf('number')
  })

  it('accepts reject decision', async () => {
    mockFetch({ decision: 'reject', reason: 'policy violation' })
    const res = await createWebhookSurface({ url: 'https://example.com/approve' }).request(task)
    expect(res.decision).toBe('reject')
    expect(res.reason).toBe('policy violation')
  })

  it('accepts escalate decision', async () => {
    mockFetch({ decision: 'escalate' })
    const res = await createWebhookSurface({ url: 'https://example.com/approve' }).request(task)
    expect(res.decision).toBe('escalate')
  })

  it('omits optional fields when not present in response', async () => {
    mockFetch({ decision: 'approve' })
    const res = await createWebhookSurface({ url: 'https://example.com/approve' }).request(task)
    expect(res.reason).toBeUndefined()
    expect(res.approvedBy).toBeUndefined()
  })
})

describe('createWebhookSurface — request shape', () => {
  it('sends X-Approval-Secret header when secret is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ decision: 'approve' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await createWebhookSurface({ url: 'https://example.com/approve', secret: 'secret-123' }).request(task)

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(options.headers['X-Approval-Secret']).toBe('secret-123')
  })

  it('omits X-Approval-Secret header when no secret is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ decision: 'approve' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await createWebhookSurface({ url: 'https://example.com/approve' }).request(task)

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(options.headers['X-Approval-Secret']).toBeUndefined()
  })

  it('sends the task in the POST body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ decision: 'approve' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await createWebhookSurface({ url: 'https://example.com/approve' }).request(task)

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as { task: PendingTask }
    expect(body.task.id).toBe('task-001')
    expect(body.task.status).toBe('PENDING_APPROVAL')
  })
})

describe('createWebhookSurface — error handling', () => {
  it('throws on non-ok HTTP response', async () => {
    mockFetch({}, false, 403)
    await expect(
      createWebhookSurface({ url: 'https://example.com/approve' }).request(task),
    ).rejects.toThrow('403')
  })

  it('throws on an invalid decision value', async () => {
    mockFetch({ decision: 'maybe' })
    await expect(
      createWebhookSurface({ url: 'https://example.com/approve' }).request(task),
    ).rejects.toThrow('Invalid decision')
  })

  it('throws when decision is missing from response', async () => {
    mockFetch({})
    await expect(
      createWebhookSurface({ url: 'https://example.com/approve' }).request(task),
    ).rejects.toThrow('Invalid decision')
  })
})
