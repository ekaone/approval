import type { ApprovalDecision, ApprovalResponse } from '../types/approval.js'
import type { Task, PendingTask } from '../types/surface.js'
import type { ApprovalPolicyRule } from '../types/policy.js'

export function matchRule(
  rules: ApprovalPolicyRule[],
  task: Task,
): ApprovalPolicyRule | undefined {
  return rules.find((r) => r.match(task))
}

export function noMatchResponse(): ApprovalResponse {
  return {
    decision: 'approve',
    reason: 'no matching policy',
    approvedBy: 'system',
    timestamp: Date.now(),
  }
}

export function timeoutResponse(decision: ApprovalDecision): ApprovalResponse {
  return { decision, reason: 'timeout', approvedBy: 'system', timestamp: Date.now() }
}

export function toPendingTask(task: Task): PendingTask {
  return { ...task, status: 'PENDING_APPROVAL' }
}
