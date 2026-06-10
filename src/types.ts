export type ApprovalDecision = 'approve' | 'reject' | 'escalate'

export type Task = {
  id: string
  tags?: string[]
  description?: string
  payload?: unknown
}

export type PendingTask = Task & {
  status: 'PENDING_APPROVAL'
}

export type ApprovalResponse = {
  decision: ApprovalDecision
  reason?: string
  approvedBy?: string
  timestamp: number
}

export type ApprovalSurface = {
  request(task: PendingTask): Promise<ApprovalResponse>
}

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
  /**
   * Single predicate — applies to every task routed through this instance.
   * Or an ordered list of rules; first match wins.
   */
  policy?: ((task: Task) => boolean) | ApprovalPolicyRule[]
  /** Required when surface is 'webhook'. */
  webhookUrl?: string
  webhookSecret?: string
}

export type ApprovalInstance = {
  request(task: Task): Promise<ApprovalResponse>
  /** Append a rule at the end of the ordered policy list. */
  addPolicy(rule: ApprovalPolicyRule): void
}
