export type ApprovalDecision = 'approve' | 'reject' | 'escalate'

export type ApprovalResponse = {
  decision: ApprovalDecision
  reason?: string
  approvedBy?: string
  timestamp: number
}
