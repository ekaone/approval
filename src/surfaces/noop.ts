import type { ApprovalDecision, ApprovalResponse, ApprovalSurface, PendingTask } from '../types/index.js'

export function createNoopSurface(autoDecision: ApprovalDecision = 'approve'): ApprovalSurface {
  return {
    async request(_task: PendingTask): Promise<ApprovalResponse> {
      return {
        decision: autoDecision,
        approvedBy: 'noop',
        reason: `auto-${autoDecision} by noop surface`,
        timestamp: Date.now(),
      }
    },
  }
}
