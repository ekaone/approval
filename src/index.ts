/**
 * @file index.ts
 * @description Core entry point for @ekaone/approval
 * @author Eka Prasetia
 * @website https://prasetia.me
 * @license MIT
 */

import { createCliSurface } from './surfaces/cli.js'
import { createNoopSurface } from './surfaces/noop.js'
import { createWebhookSurface } from './surfaces/webhook.js'
import type {
  Task,
  PendingTask,
  ApprovalDecision,
  ApprovalResponse,
  ApprovalSurface,
  ApprovalPolicyRule,
  ApprovalSurfaceKey,
  ApprovalConfig,
  ApprovalInstance,
} from './types.js'

export type {
  Task,
  PendingTask,
  ApprovalDecision,
  ApprovalResponse,
  ApprovalSurface,
  ApprovalPolicyRule,
  ApprovalSurfaceKey,
  ApprovalConfig,
  ApprovalInstance,
}

export { createCliSurface, createNoopSurface, createWebhookSurface }
export type { WebhookSurfaceOptions } from './surfaces/webhook.js'

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((resolve) => {
    timerId = setTimeout(() => resolve(onTimeout()), ms)
  })
  return Promise.race([
    promise.then((v) => {
      clearTimeout(timerId)
      return v
    }),
    timeoutPromise,
  ])
}

function resolveSurface(
  key: ApprovalSurfaceKey | ApprovalSurface,
  config: ApprovalConfig,
): ApprovalSurface {
  if (typeof key !== 'string') return key
  switch (key) {
    case 'cli':
      return createCliSurface()
    case 'noop':
      return createNoopSurface()
    case 'webhook': {
      if (!config.webhookUrl) throw new Error('webhookUrl is required for webhook surface')
      const opts: { url: string; secret?: string } = { url: config.webhookUrl }
      if (config.webhookSecret !== undefined) opts.secret = config.webhookSecret
      return createWebhookSurface(opts)
    }
  }
}

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

  const makeTimeoutResponse = (decision: ApprovalDecision): ApprovalResponse => ({
    decision,
    reason: 'timeout',
    approvedBy: 'system',
    timestamp: Date.now(),
  })

  return {
    async request(task: Task): Promise<ApprovalResponse> {
      const pendingTask: PendingTask = { ...task, status: 'PENDING_APPROVAL' }
      const rule = rules.find((r) => r.match(task))

      if (!rule) {
        return {
          decision: 'approve',
          reason: 'no matching policy',
          approvedBy: 'system',
          timestamp: Date.now(),
        }
      }

      return withTimeout(
        rule.surface.request(pendingTask),
        rule.timeout,
        () => makeTimeoutResponse(rule.fallback),
      )
    },

    addPolicy(rule: ApprovalPolicyRule): void {
      rules.push(rule)
    },
  }
}
