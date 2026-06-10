import type { ApprovalDecision, ApprovalResponse } from './approval.js'
import type { ApprovalSurface, Task } from './surface.js'

export type ApprovalPolicyRule = {
  match: (task: Task) => boolean
  surface: ApprovalSurface
  timeout: number
  fallback: ApprovalDecision
}

export type ApprovalSurfaceKey = 'cli' | 'webhook' | 'noop'

export type ApprovalConfig = {
  surface?: ApprovalSurfaceKey | ApprovalSurface
  timeout?: number
  fallback?: ApprovalDecision
  policy?: ((task: Task) => boolean) | ApprovalPolicyRule[]
  webhookUrl?: string
  webhookSecret?: string
}

export type ApprovalInstance = {
  request(task: Task): Promise<ApprovalResponse>
  addPolicy(rule: ApprovalPolicyRule): void
}
