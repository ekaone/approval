import type { ApprovalResponse } from './approval.js'

export type Task = {
  id: string
  tags?: string[]
  description?: string
  payload?: unknown
}

export type PendingTask = Task & {
  status: 'PENDING_APPROVAL'
}

export type ApprovalSurface = {
  request(task: PendingTask): Promise<ApprovalResponse>
}
