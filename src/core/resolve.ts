import type { ApprovalSurface } from '../types/surface.js'
import type { ApprovalSurfaceKey, ApprovalConfig } from '../types/policy.js'
import { createCliSurface } from '../surfaces/cli.js'
import { createNoopSurface } from '../surfaces/noop.js'
import { createWebhookSurface } from '../surfaces/webhook.js'

export function resolveSurface(
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
