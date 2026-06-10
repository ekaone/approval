import type { ApprovalSurface, PendingTask, ApprovalResponse } from '../types/index.js'

export type TelegramSurfaceOptions = {
  botToken: string
  chatId: string | number
}

// Not yet implemented — requires a Telegram bot adapter dependency.
// When complete: sends a message with inline approve/reject/escalate buttons,
// then awaits a callback_query from the bot before resolving.
export function createTelegramSurface(_options: TelegramSurfaceOptions): ApprovalSurface {
  return {
    request(_task: PendingTask): Promise<ApprovalResponse> {
      throw new Error(
        'createTelegramSurface is not yet implemented. ' +
          'Install a Telegram bot adapter and provide a request() implementation.',
      )
    },
  }
}
