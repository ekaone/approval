# Session Note — `@ekaone/approval`

## Context

Part of the Relayhouse Agent OS ecosystem. `@ekaone/approval` is the human-in-the-loop policy engine + surface adapters.

This package is small but covers a genuine behavioral gap: without it, the OS is fully autonomous with no human authority checkpoints. In production agents that touch real systems, this is not acceptable.

Architecturally it crosses three boundaries:

- identity → who holds the authority to approve
- relay → task suspension / resumption at PENDING_APPROVAL status
- memory → approval decisions logged to episodic store

## Three Layers

### 1. Suspension point (lives in agent-relay)

Task status gains a new value: `PENDING_APPROVAL` Task graph halts at that node, full state preserved.

### 2. Approval surface (lives in this package)

Pluggable. Emits `ApprovalResponse` which resumes the relay bus.

```ts
type ApprovalSurface = {
  request(task: PendingTask): Promise<ApprovalResponse>
}

type ApprovalResponse = {
  decision: 'approve' | 'reject' | 'escalate'
  reason?: string
  approvedBy?: string         // agent ID or human identifier
  timestamp: number
}
```

### 3. Policy engine (lives in this package)

```ts
type ApprovalPolicy = {
  match: (task: Task) => boolean        // e.g. task.tags.includes('destructive')
  surface: ApprovalSurface
  timeout: number                       // ms before fallback fires
  fallback: 'approve' | 'reject' | 'escalate'
}
```

## Built-in Surfaces

```
cli      →  @clack/prompts terminal prompt (default, dev-friendly)
webhook  →  POST to URL, await callback (production)
telegram →  Telegram bot message + button reply
noop     →  auto-approve (testing only, explicit opt-in required)
```

`@ekaone/telepath` is the natural transport for cross-context surfaces (browser tab ↔ agent process approval flows).

## Core API (starting point)

```ts
import { createApproval } from '@ekaone/approval'

const approval = createApproval({
  surface: 'cli',
  timeout: 30_000,
  fallback: 'reject',
  policy: (task) => task.tags?.includes('destructive') ?? false,
})

// In relayhouse OS, this is called automatically.
// Can also be used standalone:
const response = await approval.request(task)
```

## Key Design Questions to Answer in Session

- Should policy be a single predicate or an ordered list of rules (first match wins)?
- Webhook surface: how does the callback resume the suspended task? Push (webhook calls back) vs pull (OS polls) — which fits relay's bus model?
- How are approval decisions surfaced in `bus.watch()` event stream?
- Can an agent approve another agent's task? Under what authority constraints?
- Timeout escalation: should 'escalate' route to a different agent or a human?

## Constraints

- Zero dependencies in core (surface adapters may have deps)
- TypeScript strict mode
- Node ≥ 18, ESM + CJS dual output via tsup
- OIDC trusted publishing on `v*` tags

## Feeds Into

- `relayhouse` — OS registers approval policies at boot, auto-gates tasks

## Depends On

- `@ekaone/identity` — authority level determines who can approve what
- `@ekaone/agent-relay` — task suspension / PENDING_APPROVAL status
- `@ekaone/memory` — approval decisions written to episodic store
- `@ekaone/telepath` — cross-context surface transport (optional)

## Toolchain

pnpm · tsup · Vitest · TypeScript strict