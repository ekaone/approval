import { createInterface } from 'node:readline'
import type { ApprovalDecision, ApprovalResponse, ApprovalSurface, PendingTask } from '../types.js'

const VALID_DECISIONS = new Set<string>(['approve', 'reject', 'escalate'])

export function createCliSurface(): ApprovalSurface {
  return {
    request(task: PendingTask): Promise<ApprovalResponse> {
      const rl = createInterface({ input: process.stdin, output: process.stdout })

      process.stdout.write(`\n--- Approval Required ---\n`)
      process.stdout.write(`Task ID    : ${task.id}\n`)
      if (task.description) process.stdout.write(`Description: ${task.description}\n`)
      if (task.tags?.length) process.stdout.write(`Tags       : ${task.tags.join(', ')}\n`)
      process.stdout.write(`\n`)

      return new Promise<ApprovalResponse>((resolve) => {
        rl.question('Decision [approve/reject/escalate] (default: reject): ', (answer) => {
          rl.close()
          const raw = answer.trim().toLowerCase()
          const decision: ApprovalDecision = VALID_DECISIONS.has(raw)
            ? (raw as ApprovalDecision)
            : 'reject'
          resolve({ decision, approvedBy: 'cli-operator', timestamp: Date.now() })
        })
      })
    },
  }
}
