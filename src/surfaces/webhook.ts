import type { ApprovalDecision, ApprovalResponse, ApprovalSurface, PendingTask } from '../types.js'

export type WebhookSurfaceOptions = {
  url: string
  secret?: string
}

const VALID_DECISIONS = new Set<string>(['approve', 'reject', 'escalate'])

export function createWebhookSurface(options: WebhookSurfaceOptions): ApprovalSurface {
  return {
    async request(task: PendingTask): Promise<ApprovalResponse> {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (options.secret) headers['X-Approval-Secret'] = options.secret

      const res = await fetch(options.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task }),
      })

      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status} ${res.statusText}`)
      }

      const data = (await res.json()) as {
        decision?: unknown
        reason?: unknown
        approvedBy?: unknown
      }

      const raw = String(data.decision ?? '')
      if (!VALID_DECISIONS.has(raw)) {
        throw new Error(`Invalid decision from webhook: ${raw}`)
      }

      const response: ApprovalResponse = { decision: raw as ApprovalDecision, timestamp: Date.now() }
      if (typeof data.reason === 'string') response.reason = data.reason
      if (typeof data.approvedBy === 'string') response.approvedBy = data.approvedBy
      return response
    },
  }
}
