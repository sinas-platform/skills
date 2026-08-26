---
name: sinas-ui
description: How to build a user-facing app (web UI, mobile, or companion backend) on top of a Sinas instance's runtime API — instance discovery, every auth mode, chatting with agents, invoke, streaming, files, pipelines, batches, and verifying Sinas tokens from your own services. Read this when the user wants a UI or client for something running on Sinas, in any framework.
---

# Building a UI on Sinas

You are building a client — a web app, mobile app, script, or companion
backend — against a Sinas instance's **runtime API**. Sinas owns identity,
permissions, agents, functions, queries, pipelines, files, and state; your
app consumes them over HTTP. No scaffold is assumed: these patterns work in
any framework.

Two API surfaces on one host:

| Surface | Base | Audience |
|---|---|---|
| Runtime API | `/` | End users (your app). Auth: user JWT or API key |
| Management API | `/api/v1` | Admins and tooling (the `sinas-package-author` skill + CLI) |

CORS is open on the backend, so browsers can call it directly. Every
response carries an `X-Sinas-Version` header (0.4.0+); `GET /health` is an
unauthenticated liveness ping.

**The OpenAPI spec is authoritative** — `GET {base}/openapi.json`. When
this skill and the spec disagree, the spec wins.

## Instance discovery — always start here

```
GET /info        (no auth)
→ { "auth_mode": "otp" | "password" | "password+otp",
    "version": "0.4.0",
    "features": { "code_execution": true, ... } }
```

Render the login form `auth_mode` demands; gate UI affordances on
`features` (e.g. `code_execution: false` → hide anything that executes
user code — the Sinas console greys those out, do the same).

## Auth

### Interactive login (Sinas-owned accounts)

- `password`: `POST /auth/login {email, password}` → tokens.
- `otp`: `POST /auth/login {email}` → `{session_id}` →
  `POST /auth/verify-otp {session_id, otp_code}` → tokens.
- `password+otp`: login with both fields → `{session_id}` → verify-otp (same `otp_code` field).

Tokens: `{access_token, refresh_token}`. Access tokens live ~15 min;
`POST /auth/refresh {refresh_token}` renews. `GET /auth/me` returns the
current user (id, email, roles, custom_fields). `POST /auth/logout`
revokes the refresh token.

Client pattern: send `Authorization: Bearer <access_token>`; on 401,
refresh once and retry; if refresh fails, clear tokens and return to
login.

### Your app already has auth? Token exchange

If your backend authenticates users itself, don't run a second login.
Exchange your knowledge of "who is logged in" for Sinas tokens,
server-side, using an API key holding `sinas.auth.exchange:all`:

```
POST /auth/token/exchange
X-API-Key: <exchange key>
{ "provider": "my-app", "subject": "usr_8f3a2", "email": "jane@acme.com",
  "custom_fields": {"plan": "enterprise"}, "auto_provision": true }
→ normal access + refresh token pair for that user
```

All `:own` scoping and audit applies as if they logged in directly.
Treat the exchange key like an admin credential — never ship it to a
browser.

### Verifying Sinas tokens in YOUR backend (no round-trip)

When the instance runs `JWT_ALGORITHM=RS256` (opt-in, 0.4.0+), any JWT
middleware can verify Sinas access tokens offline: keys at
`GET /.well-known/jwks.json`, standard `iss`/`aud` claims, and
`GET /userinfo` (OIDC-style: sub, email, roles, custom fields as flat
claims). Default HS256 instances don't publish keys — verify by calling
`/auth/me` instead.

## Permissions in one paragraph

Every action checks a key like `sinas.agents/{ns}/{name}.chat:all` or
`my-app.docs.read:own`. `:own` = only the caller's resources; `:all` =
everyone's. 403 means the user's roles lack the key — surface it as
"ask your admin", don't retry. Apps declare what they need in their
package manifest (see `sinas-package-author`).

## Talking to agents

### One call, one answer: invoke

```
POST /agents/{ns}/{name}/invoke
{ "message": "Summarise this", "input": {"doc_id": "42"} }
→ { "reply": "...", "chat_id": "..." }
```

- Add `"session_key": "case-4711"` for conversation continuity: same key
  (per agent) continues the same chat; `"reset": true` archives and
  starts fresh. Keys are scoped per agent, not per user — namespace them
  yourself (`user123:case-4711`) if end users pick them, or a stranger's
  key collision returns 403.
- `input` (agent input variables) is only read when the chat is created.
- Every invoke persists a chat + transcript, and long sessions grow
  context/cost — `reset` periodically for long-lived keys.

### Full conversations: chats + streaming

```
POST /agents/{ns}/{name}/chats                        # create (agent in the PATH)
     { "input": {...}, "expires_in": 86400,
       "keep_alive": false, "job_timeout": 300 }
POST /chats/{id}/messages { "content": "..." }        # blocking
POST /chats/{id}/messages/stream { "content": "..." } # SSE
GET  /chats/{id}                                       # transcript
GET  /chats                                            # list
DELETE /chats/{id}
```

There is **no `POST /chats`** — that path is GET/DELETE only, so posting
to it returns 405. Chats are always created under their agent.

SSE frames are JSON objects with a `type`:

| `type` | Meaning |
|---|---|
| `message` | content delta — append `content` as it arrives |
| `tool_start` / `tool_end` | a tool call began/finished (agents' `statusTemplates` render here) |
| `approval_required` | a `requiresApproval` tool is waiting — call `POST /chats/{id}/approve-tool/{tool_call_id}` |
| `delegation_pending` | a sub-agent was delegated to |
| `done` | turn complete |
| `error` | turn failed — show it, don't swallow |

A tool-using agent goes quiet between `tool_start` and `tool_end`; show
those events rather than a dead spinner. Set `expires_in` on throwaway
chats; nothing auto-deletes chats without it.

### Bulk: agent batches

```
POST /agents/{ns}/{name}/chats/batch
{ "inputs": [{"message": "..."}, ...],
  "execution_mode": "provider" }         # optional, 0.4.0+
→ { "batch_id", "execution_ids", "chat_ids", ... }
GET /batches/{batch_id}                   # aggregate progress
```

`execution_mode: "provider"` = the LLM provider's native batch API:
~50% token cost, up to 24h turnaround, tool-less agents only. Default
(`queue`) runs through the internal queue at full price and speed.

## Functions, queries, pipelines

```
POST /functions/{ns}/{name}/execute            { "input": {...} }   # sync
POST /functions/{ns}/{name}/execute/async      + optional callback_url
GET  /executions/{execution_id}                                      # poll
POST /queries/{ns}/{name}/execute              { "input": {...} }
POST /pipelines/{ns}/{name}/run                { "mode": "sync" | "async", "input": {...} }
GET  /pipelines/{ns}/{name}/runs                                     # history
GET  /pipelines/runs/{run_id}                  # status, steps, output
POST /pipelines/runs/{run_id}/replay
```

Pipeline notes for UIs: async/replay 202s return the future run's id —
the run record appears when execution starts, so treat one early 404 as
"queued", not "gone". Run records include per-step status and the final
`output` (0.4.0+). A busy sync run returns 409 with the active run id.

## Files and state

- Collections: `POST /files/{ns}/{collection}` upload (versioned),
  `GET /files/{ns}/{collection}/{name}` download. Uploads may trigger
  package-defined post-upload processing — that runs async; don't block
  the UI on it.
- Stores: `GET/PUT /stores/{ns}/{name}/states/{key}` (list at
  `/stores/{ns}/{name}/states`) — per-user or shared key-value state for
  your app.
- Discovery: `GET /agents`, `/functions`, `/skills`, `/collections`,
  `/templates` list what the current user can see — build dynamic menus
  from these rather than hardcoding.

## SDKs, honestly

`@sinas/sdk` (JS) and `sinas` (Python) cover auth, chats, functions,
queries, and files well. They predate 0.4.0's pipelines, batch
`execution_mode`, and provider overrides — for those, call the endpoints
above directly (plain `fetch` beside the SDK client is fine; reuse its
token getters). Regenerate/upgrade when a newer SDK ships.

## Pitfalls seen in the field

- **Don't poll `/auth/me` per request** — verify locally (RS256) or
  cache the session; under load that endpoint is your first casualty.
- **Handle 429/5xx from agent calls** — provider quota errors surface as
  errors on the message; show them, offer retry, don't silently drop
  the turn.
- **Chats accumulate** — anything that creates chats in a loop needs
  `expires_in` or `session_key`, or the instance stores every one
  forever.
- **`input` vs `message`** on invoke: `input` fills the agent's input
  schema/template variables once; `message` is the user turn.
- **Feature-gate on `/info`**, not on version-string parsing.
