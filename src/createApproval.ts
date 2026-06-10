import type { ApprovalConfig, ApprovalInstance, ApprovalPolicyRule } from './types/policy.js'
import type { Task } from './types/surface.js'
import type { ApprovalResponse } from './types/approval.js'
import { resolveSurface } from './core/resolve.js'
import { withTimeout } from './core/timeout.js'
import { matchRule, noMatchResponse, timeoutResponse, toPendingTask } from './core/engine.js'

export function createApproval(config: ApprovalConfig = {}): ApprovalInstance {
  const { surface = 'cli', timeout = 30_000, fallback = 'reject', policy } = config

  const rules: ApprovalPolicyRule[] = Array.isArray(policy)
    ? [...policy]
    : [
        {
          match: policy ?? (() => true),
          surface: resolveSurface(surface, config),
          timeout,
          fallback,
        },
      ]

  return {
    async request(task: Task): Promise<ApprovalResponse> {
      const pendingTask = toPendingTask(task)
      const rule = matchRule(rules, task)

      if (!rule) return noMatchResponse()

      return withTimeout(
        rule.surface.request(pendingTask),
        rule.timeout,
        () => timeoutResponse(rule.fallback),
      )
    },

    addPolicy(rule: ApprovalPolicyRule): void {
      rules.push(rule)
    },
  }
}
