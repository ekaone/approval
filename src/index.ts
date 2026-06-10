/**
 * @file index.ts
 * @description Core entry point for @ekaone/approval
 * @author Eka Prasetia
 * @website https://prasetia.me
 * @license MIT
 */

export { createApproval } from './createApproval.js'

export type {
  ApprovalDecision,
  ApprovalResponse,
  Task,
  PendingTask,
  ApprovalSurface,
  ApprovalPolicyRule,
  ApprovalSurfaceKey,
  ApprovalConfig,
  ApprovalInstance,
} from './types/index.js'

export {
  createCliSurface,
  createNoopSurface,
  createWebhookSurface,
  createTelegramSurface,
} from './surfaces/index.js'

export type { WebhookSurfaceOptions, TelegramSurfaceOptions } from './surfaces/index.js'
