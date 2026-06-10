import { createApproval } from './index.js'
import type { ApprovalDecision, Task } from './index.js'

const args = process.argv.slice(2)

function flag(name: string): string | undefined {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : undefined
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`
approval — human-in-the-loop CLI

Usage:
  approval [options]

Options:
  --id <id>              Task ID (default: task-<timestamp>)
  --tags <tag,tag,...>   Comma-separated tags
  --description <text>   Task description
  --timeout <ms>         Timeout in milliseconds (default: 30000)
  --fallback <decision>  Decision on timeout: approve | reject | escalate (default: reject)
  -h, --help             Show this help

Exit codes:
  0  approved
  1  rejected or escalated
`)
  process.exit(0)
}

const DECISIONS = new Set<string>(['approve', 'reject', 'escalate'])

const id = flag('--id') ?? `task-${Date.now()}`
const tagsRaw = flag('--tags')
const description = flag('--description')
const timeoutMs = Number(flag('--timeout') ?? 30_000)
const fallbackRaw = flag('--fallback') ?? 'reject'
const fallback: ApprovalDecision = DECISIONS.has(fallbackRaw)
  ? (fallbackRaw as ApprovalDecision)
  : 'reject'

const task: Task = { id }
if (tagsRaw) task.tags = tagsRaw.split(',').map((t) => t.trim())
if (description) task.description = description

const approval = createApproval({ surface: 'cli', timeout: timeoutMs, fallback })

const response = await approval.request(task)

process.stdout.write(JSON.stringify(response, null, 2) + '\n')
process.exit(response.decision === 'approve' ? 0 : 1)
