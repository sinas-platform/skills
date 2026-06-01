---
name: sinas-app
description: How to build a React app that integrates with Sinas using @sinas/sdk — workspace selection, auth-mode-aware login, calling queries / functions / chats, and when to extend the companion sinas-package.yaml. Read this when the user is editing the React app, adding pages or hooks, or wiring the app to a Sinas-side resource.
---

# Sinas App

You are working on a React app that talks to a Sinas instance. The app
was scaffolded by `@sinas/create-app`. It has two halves:

- **The app** (this codebase) — React + Vite + TypeScript + Tailwind,
  using `@sinas/sdk` for everything.
- **The Sinas package** (`sinas-package.yaml`) — declares the queries,
  functions, agents, etc. on the Sinas side. See the
  `sinas-package-author` skill for that side.

When the user asks the app to read or call something on Sinas, you almost
always need to (1) add or extend a resource in `sinas-package.yaml`, then
(2) consume it from the React side.

## Boot sequence

`src/main.tsx` → `<App />` → `<ClientProvider>` → `<SinasProvider>` →
`<AuthProvider>` → `<BrowserRouter>` with `/login` and `/`.

The `SinasClient` is constructed once with:

- `baseUrl`: from `getWorkspaceUrl()` (localStorage → `?ws=` → env default)
- `getAccessToken()` / `getRefreshToken()`: read `localStorage`
- `onTokenRefresh(access)`: writes the refreshed access token back to localStorage
- `onUnauthenticated()`: clears tokens and triggers a re-render to `/login`

The client auto-refreshes on 401 once before bubbling the error.

## Workspace selection

`src/lib/workspace.ts`. Order:

1. `?ws=<host>` query param (deep-linkable)
2. `localStorage["sinas_workspace_url"]`
3. `VITE_DEFAULT_WORKSPACE_URL` env (baked at build time)

`<WorkspaceModal>` on the login page lets the user switch. After saving, the
page reloads so the SinasClient picks up the new `baseUrl`.

## Auth flow

`src/lib/authContext.tsx` + `src/components/LoginForm.tsx`.

1. On boot, `<AuthProvider>` calls `/auth/me` (if there's a token) and
   `/info` in parallel.
2. `<LoginPage>` fetches `/info` again to render the right form via
   `<LoginForm authMode={info.auth_mode} />`:
   - `password`: email + password → tokens returned directly.
   - `otp`: email → `session_id` → 6-digit code → tokens.
   - `password+otp`: email + password → `session_id` → code → tokens.
3. After tokens land, `setSession()` stores them and re-runs `/auth/me`.

You usually don't touch this code. If the user wants to add SSO, social
login, etc., that's a backend question — Sinas doesn't currently support
those, and the app is constrained to whatever `/info.auth_mode` says.

## Sinas owns identity — don't recreate users

The current signed-in user is in `useAuth().user` —
`{id, email, last_login_at, created_at, roles}`. Sinas owns the user
table, auth, and RBAC.

**Never add a users table, a profiles table, or a roles table to your
domain schema.** Reference users by their Sinas UUID (FK into `auth_users`).
Same rule on the package side — see the `sinas-package-author` skill's
"What Sinas already provides" section before authoring any auth-shaped
resource.

When you need:
- "Records owned by the current user" → use `client.auth.getMe()` /
  `useAuth().user.id` in React; `:user_id` in query params on the
  Sinas side; `context["user_id"]` in function code.
- "Lock a feature to admins" → check a permission via
  `client.auth.checkPermissions({permissions: ['my-app.X.read:all']})`.
- "Display the current user" → `useAuth().user.email` (already resolved
  on every render).
- A capability you're not sure exists in Sinas → introspect the spec:
  ```bash
  curl -s "$VITE_DEFAULT_WORKSPACE_URL/openapi.json" | jq '.paths | keys'
  ```
  Runtime spec is unauthenticated. Management spec lives at
  `/api/v1/openapi.json` (admin token required — that's a tool for the
  `sinas-package-author` skill, not for the React app).

## Calling Sinas from React

Use the SDK hooks. They read the client out of `<SinasProvider>` context.

### Queries

```tsx
import { useQuery } from '@sinas/sdk';

function DocList() {
  const { data, loading, error } = useQuery('my-app/search-docs', { keyword: 'invoice' });
  if (loading) return <p>…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return <ul>{data?.map((r) => <li key={r.id as string}>{r.title as string}</li>)}</ul>;
}
```

The first arg is `<namespace>/<query-name>`. The query must exist in
`sinas-package.yaml`. If it doesn't, add it (see the
`sinas-package-author` skill).

### Functions — synchronous

```tsx
import { useExecute } from '@sinas/sdk';

function ProcessButton({ docId }: { docId: string }) {
  const { execute, loading, result } = useExecute('my-app/process_doc');
  return (
    <button disabled={loading} onClick={() => execute({ doc_id: docId })}>
      Process
    </button>
  );
}
```

`useExecute` enqueues + waits. The user's tab holds an HTTP connection
open for the duration. Fine for fast (<30 s) functions; not fine for
long-running ones.

### Functions — async / fire-and-forget

For longer work, enqueue and return the `execution_id` to the user. They
poll (via `client.executions.get`) or you wire a `callback_url` so Sinas
POSTs you when it's done.

```tsx
import { useClient, enqueueFunction } from '@sinas/sdk';

const client = useClient();
const { executionId } = await enqueueFunction(
  client,
  'my-app/ingest_document',
  { doc_id: docId },
  {
    triggerId: `myapp:run:${runId}`,
    callbackUrl: `https://my-app.example.com/sinas/cb/${runId}`,  // optional
  },
);
```

`triggerId` is a free-form correlation string the app stores on the
execution row — great for tying Sinas-side audit lines back to your
own run id.

### Functions — bulk (batches)

When you fan out N runs at once (Grove ingesting 50 docs, a synthesis
agent over 100 dossiers), don't loop `enqueueFunction`. Submit a batch:
one request, one `batch_id` to track, one aggregate poll, optional
single-callback at terminus.

```tsx
import { useClient, submitFunctionBatch, getBatch } from '@sinas/sdk';

const client = useClient();
const batch = await submitFunctionBatch(
  client,
  'my-app/ingest_document',
  docs.map((d) => ({ doc_id: d.id })),
  {
    triggerIdPrefix: `myapp:run:${runId}`,             // per-child id becomes "{prefix}:{i}"
    batchCallbackUrl: `https://my-app.example.com/sinas/batch/${runId}`,
  },
);
// → { batchId, executionIds: [...], total, status: "queued" }
```

Poll the batch:

```tsx
const status = await getBatch(client, batch.batchId);
// { total, completed, failed, running, queued, status: "running" | "completed" | "partial" | ... }
```

Drill into failures:

```tsx
import { listBatchExecutions } from '@sinas/sdk';
const failed = await listBatchExecutions(client, batch.batchId, { status: 'FAILED' });
```

Cancel a batch (queued children become `cancelled`; running ones complete):

```tsx
import { cancelBatch } from '@sinas/sdk';
await cancelBatch(client, batch.batchId);
```

#### When to use which

| Workload | API |
|---|---|
| Fast (<30 s) UI-driven action, want result inline | `useExecute` |
| One long-running async job, just kick it off | `enqueueFunction` + optional `callbackUrl` |
| Bulk N jobs, want aggregate progress / cancel-as-unit | `submitFunctionBatch` + `getBatch` |

### Chats / agents — interactive

```tsx
import { useChat } from '@sinas/sdk';

function TriageChat() {
  const { messages, send, streaming } = useChat({ agent: 'my-app/triage' });
  // ...
}
```

### Agents — bulk (batches)

For running an agent over a corpus (one chat per item, single user
message → final reply), use `submitAgentBatch`. Each input creates a
fresh chat with the agent's `initial_messages` pre-populated.

```tsx
import { useClient, submitAgentBatch } from '@sinas/sdk';

const client = useClient();
const batch = await submitAgentBatch(
  client,
  'my-app/synthesize',
  companies.map((c) => ({
    inputVariables: { company: c.name },
    message: `Synthesize for ${c.name}`,
  })),
  { triggerIdPrefix: `myapp:syn:${runId}` },
);
```

Same `client.batches.get / listExecutions / cancel` apply.

**Approval policy in agent batches:** if a child agent invokes a tool
with `requiresApproval: true`, that execution is marked `failed` — bulk
agent runs must use agents whose enabled tools don't require approval.
There's no interactive approver during batch execution.

**Per-execution callback result shape for agent batches:**

```json
"result": {
  "chat_id": "...",
  "final_message": "...",
  "final_message_role": "assistant",
  "tool_calls": [...]
}
```

Full transcript fetchable via `GET /chats/{chat_id}`.

### Callbacks (`callback_url`, `batch_callback_url`)

Both `enqueueFunction` and the batch helpers accept `callbackUrl` (fires
per execution) and `batchCallbackUrl` (fires once when a batch
terminates). On completion, Sinas POSTs a Sinas-signed access token for
the originating user along with the result payload — your backend
validates it the same way it validates inbound function calls.

Two prerequisites operators must know about:

1. **`CALLBACK_URL_HOSTS` is unset by default.** A fresh Sinas instance
   refuses any `callback_url` until an operator sets it (`*` for
   permissive, or a comma-separated host list). If your dev hits "Callback
   URLs are not enabled on this instance," that's why.
2. **HTTPS + non-private only.** Even with `*`, the URL must use `https://`
   and resolve to a non-private address — no `localhost` callbacks. For
   local dev, use a tunnel (ngrok / Cloudflare Tunnel) or skip callbacks
   and rely on `getBatch` polling.

Callbacks are **fire-and-forget**: one POST attempt with a 10 s timeout,
no retry. If the callback fails to deliver, the execution row records
`callback_status: "failed"` and `callback_response_code` — polling
`getBatch(batchId)` or `client.executions.get(executionId)` is the
fallback resilience story.

### State stores

```tsx
import { useStateStore } from '@sinas/sdk';

const { value, setValue } = useStateStore({ store: 'my-app/prefs', key: 'theme' });
```

### Permission checks

```tsx
import { useClient } from '@sinas/sdk';

const client = useClient();
const { result } = await client.auth.checkPermissions({
  permissions: ['my-app.docs.read:own'],
  logic: 'AND',
});
```

## When to add a connector

If Sinas-side agents need to **call back into this app** (the bidirectional
pattern — see Grove for the reference example), expose your endpoints as a
connector inside `sinas-package.yaml`:

```yaml
connectors:
  - namespace: my-app
    name: api
    baseUrl: "${{ vars.APP_URL }}"     # filled at install time
    auth:
      type: bearer
      secret: "{{MY_APP_TOKEN}}"
    operations:
      - { name: get-status, method: GET, path: /api/status }
```

Then Sinas agents with that operation enabled can call your app. Without a
connector, the integration is one-way: the app reads from Sinas, but Sinas
never touches the app.

## When to update `sinas-package.yaml`

Whenever the React app starts depending on a new query, function, agent,
skill, or store, add it to the package AND to the manifest's
`requiredResources`. The CLI checks the manifest on `sinas status` — a
missing dependency means a broken install.

Workflow:

1. Edit React code (e.g. add `useQuery('my-app/foo')`).
2. Switch to `sinas-package.yaml`. Run `Bash: sinas add query foo`.
3. Fill in the query stub.
4. Update `manifests[0].requiredResources`.
5. `Bash: sinas validate && sinas preview && sinas install`.

## What NOT to do

- **Never read `.sinas/config.json` from the React app.** It contains an
  admin token; that token must not enter the browser bundle. The app uses
  user-scoped JWTs from the auth flow.
- **Never put `VITE_ADMIN_TOKEN` or similar** in env — Vite inlines
  `VITE_*` vars into the client bundle.
- **Never bypass the auth flow** with hardcoded tokens. If you want to
  test offline, run a local Sinas instance and use real login.

## Running

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # production build
npm run typecheck    # tsc --noEmit
```

The Sinas side runs via the `sinas` CLI in the same project root.
