# @ekaone/approval

## What is it?

`@ekaone/approval` is a human-in-the-loop policy engine for autonomous agents. It lets you declare rules that intercept agent tasks before they execute and route them to a human (or automated) decision surface — terminal prompt, webhook, or a custom adapter.

## Why it exists

Fully autonomous agents that touch real systems (file writes, API calls, database mutations) have no natural checkpoint for human authority. This package fills that gap. You define which tasks require approval, where the approval request is sent, and what happens if no response arrives in time. Everything else is handled for you.

## Installation

### As a library

```bash
npm install @ekaone/approval
# or
pnpm add @ekaone/approval
# or
yarn add @ekaone/approval
```

Requires **Node >= 18** and **TypeScript >= 5** (strict mode supported).

### As a global CLI

```bash
npm install -g @ekaone/approval
# or
pnpm add -g @ekaone/approval
```

Or run without installing:

```bash
npx @ekaone/approval --help
```

---

## Core concepts

| Concept | Description |
|---|---|
| **Task** | The unit of work an agent wants to execute. Has an `id`, optional `tags`, `description`, and `payload`. |
| **Policy** | A predicate `(task) => boolean` that decides which tasks need approval. |
| **Surface** | Where the approval request is sent — CLI terminal, webhook URL, or a custom adapter. |
| **Fallback** | The automatic decision (`approve` / `reject` / `escalate`) taken when the surface does not respond within `timeout` ms. |

---

## API

### `createApproval(config)`

Creates and returns an approval instance.

```ts
import { createApproval } from '@ekaone/approval'

const approval = createApproval(config)
```

#### `config` options

| Option | Type | Default | Description |
|---|---|---|---|
| `surface` | `'cli' \| 'webhook' \| 'noop' \| ApprovalSurface` | `'cli'` | Where approval requests are sent. |
| `timeout` | `number` | `30_000` | Milliseconds before fallback fires. |
| `fallback` | `'approve' \| 'reject' \| 'escalate'` | `'reject'` | Decision taken on timeout. |
| `policy` | `(task) => boolean \| ApprovalPolicyRule[]` | `() => true` | Single predicate or ordered rule list. |
| `webhookUrl` | `string` | — | Required when `surface` is `'webhook'`. |
| `webhookSecret` | `string` | — | Sent as `X-Approval-Secret` header. |

#### Returns: `ApprovalInstance`

| Method | Signature | Description |
|---|---|---|
| `request` | `(task: Task) => Promise<ApprovalResponse>` | Runs the policy check and, if matched, waits for a decision. |
| `addPolicy` | `(rule: ApprovalPolicyRule) => void` | Appends a rule to the end of the policy list at runtime. |

---

### `ApprovalResponse`

```ts
type ApprovalResponse = {
  decision: 'approve' | 'reject' | 'escalate'
  reason?: string
  approvedBy?: string
  timestamp: number
}
```

---

### Built-in surfaces

#### `'cli'` (default)

Prints task details to stdout and reads a decision from stdin. Good for local development and scripts.

```
--- Approval Required ---
Task ID    : deploy-001
Description: Deploy v2.3.1 to production
Tags       : destructive, deploy

Decision [approve/reject/escalate] (default: reject):
```

#### `'noop'`

Auto-resolves with a preset decision. Intended for tests and CI — requires an explicit opt-in call.

```ts
import { createNoopSurface } from '@ekaone/approval'

const surface = createNoopSurface('approve') // or 'reject' | 'escalate'
```

#### `'webhook'`

POSTs the pending task as JSON to a URL and reads the decision from the synchronous HTTP response.

```ts
createApproval({
  surface: 'webhook',
  webhookUrl: 'https://your-service/approve',
  webhookSecret: process.env.APPROVAL_SECRET,
})
```

Expected response body from your endpoint:

```json
{
  "decision": "approve",
  "approvedBy": "alice@example.com",
  "reason": "looks good"
}
```

#### Custom surface

Implement `ApprovalSurface` directly for Telegram bots, Slack, email, or any other channel:

```ts
import type { ApprovalSurface } from '@ekaone/approval'

const slackSurface: ApprovalSurface = {
  async request(task) {
    // send a Slack message, await user reaction...
    return { decision: 'approve', approvedBy: 'bob', timestamp: Date.now() }
  },
}
```

---

### `ApprovalPolicyRule`

Used when you need multiple rules with different surfaces or timeouts.

```ts
type ApprovalPolicyRule = {
  match: (task: Task) => boolean
  surface: ApprovalSurface
  timeout: number
  fallback: 'approve' | 'reject' | 'escalate'
}
```

Rules are evaluated in order — the first match wins. Tasks that match no rule are auto-approved without interruption.

---

## CLI

The package ships a standalone `approval` binary for sending approval requests directly from the terminal — useful for shell scripts, CI pipelines, or manual smoke-testing.

### Syntax

```bash
approval [options]
```

### Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--id` | `string` | `task-<timestamp>` | Task ID |
| `--tags` | `string` | — | Comma-separated tags |
| `--description` | `string` | — | Human-readable task description |
| `--timeout` | `number` | `30000` | Milliseconds before fallback fires |
| `--fallback` | `approve \| reject \| escalate` | `reject` | Decision taken on timeout |
| `-h, --help` | — | — | Print help and exit |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Decision was `approve` |
| `1` | Decision was `reject` or `escalate` |

### Output

The command always prints the full `ApprovalResponse` as JSON to stdout before exiting, regardless of the decision.

### CLI examples

#### Gate a deploy with a 60-second window

```bash
approval \
  --id deploy-prod-v2 \
  --tags destructive,deploy \
  --description "Deploy v2.3.1 to production" \
  --timeout 60000 \
  --fallback reject
```

Terminal prompt:

```
--- Approval Required ---
Task ID    : deploy-prod-v2
Description: Deploy v2.3.1 to production
Tags       : destructive, deploy

Decision [approve/reject/escalate] (default: reject): approve
```

Output on approve:

```json
{
  "decision": "approve",
  "approvedBy": "cli-operator",
  "timestamp": 1718000000000
}
```

Exit code: `0`

---

#### Use in a shell script

Integrate with any deployment script using the exit code:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Requesting approval before migration..."

if approval \
  --id "db-migrate-$(date +%s)" \
  --tags high-risk,database \
  --description "Run migration 042 on the users table" \
  --timeout 120000 \
  --fallback reject; then
  echo "Approved — running migration"
  pnpm db:migrate
else
  echo "Rejected — migration cancelled"
  exit 1
fi
```

---

#### Quick smoke-test (no real prompt needed)

Use `--timeout 1` with `--fallback approve` to confirm the binary is wired up without waiting for input:

```bash
approval --id smoke-test --timeout 1 --fallback approve
```

Output:

```json
{
  "decision": "approve",
  "reason": "timeout",
  "approvedBy": "system",
  "timestamp": 1718000000001
}
```

---

## Examples

### Example 1 — Gate destructive tasks via the CLI

An agent runs file operations. Any task tagged `destructive` stops and waits for a human to approve it in the terminal. Everything else runs uninterrupted. If no answer arrives within 30 seconds, the task is rejected automatically.

```ts
import { createApproval } from '@ekaone/approval'

const approval = createApproval({
  surface: 'cli',
  timeout: 30_000,
  fallback: 'reject',
  policy: (task) => task.tags?.includes('destructive') ?? false,
})

// Safe operation — no approval needed, runs immediately
const readResult = await approval.request({
  id: 'read-config',
  tags: ['read-only'],
  description: 'Read application config',
})
console.log(readResult.decision) // 'approve' (no matching policy)

// Destructive operation — pauses for human input
const deployResult = await approval.request({
  id: 'deploy-001',
  tags: ['destructive', 'deploy'],
  description: 'Deploy v2.3.1 to production',
  payload: { version: '2.3.1', environment: 'production' },
})

if (deployResult.decision === 'approve') {
  // proceed with deploy
} else {
  console.log('Deploy rejected:', deployResult.reason)
}
```

---

### Example 2 — Multi-tier policy (ordered rules)

A production agent applies different approval surfaces depending on task severity. Low-risk tasks auto-approve, medium-risk go to a webhook, and high-risk tasks go to a stricter webhook with a shorter timeout.

```ts
import { createApproval, createNoopSurface, createWebhookSurface } from '@ekaone/approval'

const approval = createApproval({
  policy: [
    // High-risk: short window, strict webhook
    {
      match: (task) => task.tags?.includes('high-risk') ?? false,
      surface: createWebhookSurface({
        url: 'https://ops.internal/approve/critical',
        secret: process.env.OPS_SECRET,
      }),
      timeout: 10_000,
      fallback: 'reject',
    },
    // Medium-risk: standard webhook, 60s window
    {
      match: (task) => task.tags?.includes('medium-risk') ?? false,
      surface: createWebhookSurface({
        url: 'https://ops.internal/approve/standard',
        secret: process.env.OPS_SECRET,
      }),
      timeout: 60_000,
      fallback: 'reject',
    },
    // Low-risk: auto-approve, no human needed
    {
      match: (task) => task.tags?.includes('low-risk') ?? false,
      surface: createNoopSurface('approve'),
      timeout: 1_000,
      fallback: 'approve',
    },
    // No match → tasks without a risk tag are blocked by default
  ],
})

const result = await approval.request({
  id: 'db-migrate-042',
  tags: ['high-risk', 'database'],
  description: 'Run migration 042 on the users table',
})

console.log(result.decision)   // 'approve' | 'reject' | 'escalate'
console.log(result.approvedBy) // who or what approved it
```

---

### Example 3 — Dynamic policy at runtime

Start with a conservative policy and unlock task types as the agent earns trust.

```ts
import { createApproval, createNoopSurface } from '@ekaone/approval'

const approval = createApproval({
  surface: 'cli',
  timeout: 30_000,
  fallback: 'reject',
  policy: (task) => task.tags?.includes('write') ?? false, // gate all writes
})

// Later, once a category is trusted, auto-approve it without restarting:
approval.addPolicy({
  match: (task) => task.tags?.includes('write') && task.tags?.includes('trusted-source') || false,
  surface: createNoopSurface('approve'),
  timeout: 1_000,
  fallback: 'approve',
})
```

---

## Types

```ts
type Task = {
  id: string
  tags?: string[]
  description?: string
  payload?: unknown
}

type ApprovalDecision = 'approve' | 'reject' | 'escalate'

type ApprovalResponse = {
  decision: ApprovalDecision
  reason?: string
  approvedBy?: string
  timestamp: number
}

type ApprovalSurface = {
  request(task: PendingTask): Promise<ApprovalResponse>
}

type ApprovalPolicyRule = {
  match: (task: Task) => boolean
  surface: ApprovalSurface
  timeout: number
  fallback: ApprovalDecision
}

type ApprovalConfig = {
  surface?: 'cli' | 'webhook' | 'noop' | ApprovalSurface
  timeout?: number
  fallback?: ApprovalDecision
  policy?: ((task: Task) => boolean) | ApprovalPolicyRule[]
  webhookUrl?: string
  webhookSecret?: string
}
```

---

## License

MIT © [Eka Prasetia](./LICENSE)

## Links

- [npm Package](https://www.npmjs.com/package/@ekaone/approval)
- [GitHub Repository](https://github.com/ekaone/approval)
- [Issue Tracker](https://github.com/ekaone/approval/issues)
