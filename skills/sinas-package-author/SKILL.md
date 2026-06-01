---
name: sinas-package-author
description: How to author Sinas packages (SinasPackage YAML) — schema, workflow, resource patterns. Read this when the user asks you to add a query, function, agent, connector, skill, manifest, schedule, webhook, store, collection, or template, or to validate / preview / install a Sinas package.
---

# Sinas Package Author

You are helping a developer extend a Sinas instance via a YAML package. A
SinasPackage is an installable, idempotent bundle of resources — queries,
functions, agents, skills, connectors, manifests, stores, schedules,
webhooks, collections, templates, and Python dependencies. Installing
creates them; reinstalling updates them; uninstalling removes them.

## Your tools

You operate on regular files in the working directory. The CLI talks to
Sinas:

| Command | What it does |
|---|---|
| `sinas validate` | Validates `sinas-package.yaml` (and `sinas-config.yaml` if present). Cheap. Run after every edit. **Never skip.** |
| `sinas preview` | Dry-run. Shows what would change. Share the diff with the user before installing. |
| `sinas install` | Applies. Requires user confirmation. |
| `sinas status` | Reports manifest health: missing resources + missing permissions. |
| `sinas add <type> <name>` | Appends a templated resource stub to `sinas-package.yaml`. Types: `query`, `function`, `connector`, `agent`, `skill`, `collection`, `store`, `webhook`, `schedule`. |

Use `Read`, `Write`, `Edit` on `sinas-package.yaml` directly. Prefer
`sinas add` for the initial stub, then `Edit` to fill it in — never
regenerate the whole YAML.

For ad-hoc API queries (listing what's installed, fetching a resource),
the admin token lives in `.sinas/config.json` and you can drive the API
directly:

```bash
TOKEN=$(jq -r .admin_token .sinas/config.json)
URL=$(jq -r .instance_url .sinas/config.json)
curl -H "Authorization: Bearer $TOKEN" "$URL/api/v1/packages"
```

## Schema essentials

```yaml
apiVersion: sinas.co/v1
kind: SinasPackage
package:
  name: my-app
  version: "0.1.0"
  description: What this package does.
  author: Your Name
  url: https://github.com/your/repo
spec:
  variables: []        # install-time configuration (optional)
  manifests: []        # always present — this is the app's contract
  collections: []
  queries: []
  functions: []
  agents: []
  skills: []
  stores: []
  components: []
  connectors: []
  templates: []
  webhooks: []
  schedules: []
  databaseTriggers: []
  dependencies: []
```

All sections except `package` and (by our convention) `manifests` are
optional. Include only what you need.

## What packages CAN create

`collections, queries, functions, agents, skills, stores, components,
connectors, templates, webhooks, schedules, databaseTriggers, dependencies,
manifests, variables`.

## What packages CANNOT create

- **roles** — defined in a separate `sinas-config.yaml` (kind: SinasConfig)
- **users** — admin-managed
- **llmProviders** — infrastructure
- **databaseConnections** — infrastructure

For these, see "Custom permissions and roles" below.

## What Sinas already provides — don't recreate

Before adding any auth-, user-, or RBAC-shaped resource to your package,
remember Sinas already owns identity. Reach for it instead of duplicating.

- **Users.** The `auth_users` table is built in (id/email/last_login_at/
  created_at). In function code, the current user is in
  `context["user_id"]` and `context["user_email"]`. From the runtime API,
  `GET /auth/me` returns the same. **Foreign-key into Sinas users from
  your domain tables; never define your own users table.**
- **Roles + permissions.** Sinas's permission-key RBAC is the single
  source of truth. Use `sinas.*` permissions out of the box, or define
  `<app>.X.read:own` style custom keys in `sinas-config.yaml` (see
  above). Don't roll your own role/membership tables.
- **File collections, state stores, secrets, refresh tokens, sessions** —
  each has a runtime API endpoint. Use the corresponding resource type
  in this skill rather than reinventing.
- **Chats, messages, executions, manifests** — also built in. If you
  catch yourself adding a "messages" or "runs" table to your schema,
  stop and check whether the existing model already fits.

When in doubt, **introspect** before authoring:

```bash
# From the project root (or any dir with a .sinas/config.json).
TOKEN=$(jq -r .admin_token .sinas/config.json)
URL=$(jq -r .instance_url .sinas/config.json)

# Every endpoint on the runtime (user-facing) API.
curl -s "$URL/openapi.json" | jq '.paths | keys'

# Every endpoint on the management (admin) API.
curl -s -H "Authorization: Bearer $TOKEN" "$URL/api/v1/openapi.json" | jq '.paths | keys'

# Zoom in on a path, e.g. how /auth/me responds:
curl -s "$URL/openapi.json" | jq '.paths."/auth/me"'

# Or for the management side, list existing functions / agents / queries / collections
# (uses the same admin token from .sinas/config.json):
curl -s -H "Authorization: Bearer $TOKEN" "$URL/api/v1/functions"
curl -s -H "Authorization: Bearer $TOKEN" "$URL/api/v1/agents"
curl -s -H "Authorization: Bearer $TOKEN" "$URL/api/v1/queries"
```

The OpenAPI spec is authoritative — when a behavior or field is unclear
in this skill, the spec wins.

## The manifest — required, kept up to date

Every package ships with at least one manifest. The manifest is the app's
contract with the Sinas instance: it declares which resources must exist
and which permissions the app's user must hold for the app to function.

```yaml
spec:
  manifests:
    - namespace: my-app
      name: my-app
      description: Manifest for my-app
      requiredResources:
        - { type: query,    namespace: my-app, name: search-docs }
        - { type: function, namespace: my-app, name: process_doc }
      requiredPermissions:
        - my-app.docs.read:own       # custom permission keys go here too
      optionalPermissions: []
      exposedNamespaces: {}          # things this app exposes back to Sinas
      storeDependencies: []
```

**Rule:** every time you add a resource to the package, add it to
`requiredResources`. `sinas status` uses this to tell the admin whether
the install will actually work.

## Install-time variables

Use when the package needs values the installer provides (URLs, secrets,
LLM provider choices). Substituted via `${{ vars.NAME }}` before persistence
(not Jinja2 — no clash with system prompt templates).

```yaml
spec:
  variables:
    - name: SERVICE_URL
      type: text
      description: Base URL of the external service
      required: true
    - name: PRIMARY_LLM
      type: resource_ref
      resource: llm_providers
      required: true
    - name: API_KEY
      type: secret
      required: true
    - name: MODE
      type: enum
      choices: [fast, balanced, thorough]
      default: balanced

  connectors:
    - baseUrl: "${{ vars.SERVICE_URL }}"
  agents:
    - llmProviderName: "${{ vars.PRIMARY_LLM }}"
```

Variable types: `text` (optional `pattern` regex), `boolean`, `enum`
(with `choices`), `resource_ref` (with `resource: llm_providers |
database_connections | collections | secrets | roles`), `secret` (creates
an encrypted Secret). Names are UPPER_SNAKE_CASE.

## Custom permissions and roles → `sinas-config.yaml`

`sinas.*` permissions (e.g. `sinas.queries.execute:own`) are covered by
the default Sinas roles. You do **not** need to add a role for those.

If the package introduces a **custom** permission key (e.g.
`my-app.docs.read:own`), create or extend a `sinas-config.yaml` alongside
the package. `sinas install` applies it before installing the package:

```yaml
# sinas-config.yaml
apiVersion: sinas.co/v1
kind: SinasConfig
metadata:
  name: my-app-roles
spec:
  roles:
    - name: my-app-user
      description: Read documents in my-app
      permissions:
        - { key: "my-app.docs.read:own", value: true }
```

And in the package's manifest, mirror the permission:

```yaml
spec:
  manifests:
    - namespace: my-app
      name: my-app
      requiredPermissions:
        - my-app.docs.read:own
```

Admins assign the role to users; the manifest then validates green.

## The workflow

1. **Clarify scope.** Ask 1-2 pointed questions only if vague. Otherwise proceed.
2. **Edit `sinas-package.yaml`** with `Edit` (or `Write` for a fresh file).
   Use `sinas add <type> <name>` to drop in a stub when adding a new resource.
3. **Validate.** `Bash: sinas validate`. Fix errors with `Edit` and re-run.
4. **Update the manifest.** Add each new resource to `requiredResources`.
   If you introduced a custom permission key, extend `sinas-config.yaml`
   and `manifests[].requiredPermissions`.
5. **Preview.** `Bash: sinas preview`. Share the diff in chat.
6. **Install.** `Bash: sinas install`. The user is prompted to confirm.
7. **Status.** `Bash: sinas status` to confirm the manifest is satisfied.

Bump `package.version` on meaningful changes (semver).

## Resource patterns

### Queries

```yaml
queries:
  - namespace: my-app
    name: search-docs
    description: Search documents by keyword.
    connectionName: built-in
    operation: read              # read for SELECT; write for INSERT/UPDATE/DELETE
    timeoutMs: 5000
    maxRows: 100
    inputSchema:
      type: object
      properties:
        keyword: { type: string }
      required: [keyword]
    sql: |
      SELECT id, title FROM docs
      WHERE title ILIKE '%' || :keyword || '%'
      ORDER BY created_at DESC
```

- Always use `:param` bind parameters. **Never** inline values — SQL injection.
- Always set `connectionName` explicitly.
- Use `init-schema` queries (operation: write) to create tables idempotently
  (`CREATE TABLE IF NOT EXISTS …`).
- Never expose a generic "exec arbitrary SQL" query.

### Functions

```yaml
functions:
  - namespace: my-app
    name: process_doc
    description: Process a document.
    sharedPool: true
    timeout: 30
    inputSchema:
      type: object
      properties:
        doc_id: { type: string }
      required: [doc_id]
    code: |
      def handler(input_data, context):
          # context: access_token, user_id, user_email, execution_id,
          #          trigger_type, chat_id, secrets
          return {"doc_id": input_data["doc_id"], "status": "ok"}
```

For non-stdlib imports, declare under `spec.dependencies`
(NOT `pipPackages` — unknown keys are rejected):

```yaml
spec:
  dependencies:
    - { packageName: pandas }
    - { packageName: python-pptx, version: "0.6.21" }
```

Set `requiresApproval: true` on dangerous side effects.

**`timeout` affects the per-execution access token.** Sinas mints the
function's access token (handed in `context["access_token"]`) with a
TTL of `function.timeout + 5min`, capped at 24 h. For long-running
functions that call back into apps, set `timeout` to the realistic
runtime so the token outlives the work. Default `timeout` (30 s)
yields a ~5 min token, which is sufficient for typical workloads.

**Sync vs async vs batch.** A function defined here can be invoked
three ways from the runtime API — `/execute` (sync, blocks),
`/execute/async` (fire-and-forget with optional `callback_url`), and
`/execute/batch` (bulk submission, aggregate progress). All three reuse
this same definition; you don't need separate function variants.
Functions designed for bulk should set realistic `timeout`, avoid
interactive `input()` calls, and emit structured `output_data` that
callbacks can carry verbatim.

The Sinas Python SDK is preinstalled (`sinas==0.1.7`):

```python
from sinas import SinasClient
def handler(input_data, context):
    client = SinasClient(base_url="http://host.docker.internal:8000",
                         token=context["access_token"])
    resp = client._request("POST", "/queries/my-app/search-docs/execute",
                            json={"input": {"keyword": "x"}})
    return {"result": resp}
```

### Connectors

```yaml
connectors:
  - namespace: hubspot
    name: crm-api
    baseUrl: https://api.hubapi.com
    auth: { type: bearer, secret: "{{HUBSPOT_TOKEN}}" }
    timeoutSeconds: 30
    operations:
      - name: search-deals
        method: POST
        path: /crm/v3/objects/deals/search
        parameters:
          - { name: body, in: body, schema: { type: object } }
      - name: get-deal
        method: GET
        path: /crm/v3/objects/deals/{dealId}
        parameters:
          - { name: dealId, in: path, schema: { type: string } }
```

Path params use `{paramName}`. `in` values: `path | query | body | header`.

### Agents

```yaml
agents:
  - namespace: my-app
    name: triage
    description: Triage incoming docs.
    model: claude-sonnet-4-6
    temperature: 0.2
    systemPrompt: |
      You triage docs by ...
    enabledQueries: [my-app/search-docs]
    enabledFunctions: [my-app/process_doc]
    enabledConnectors:
      - { connector: hubspot/crm-api, operations: [search-deals, get-deal] }
    enabledSkills:
      - { skill: my-app/methodology, preload: true }
    enabledCollections:
      - { collection: my-app/drafts, access: readwrite }
    enabledStores:
      - { store: my-app/memory, access: readwrite }
    systemTools:
      - codeExecution
      - configIntrospection
```

Every tool must be listed explicitly in `enabled*` — no implicit access.
`preload: true` on a skill injects it into the system prompt; `false`
makes it a fetchable tool.

Keep system prompts concrete — no "be helpful." State the goal, the
tools, the workflow.

**Batch invocation considerations.** The runtime API exposes
`POST /agents/{ns}/{name}/chats/batch` for bulk one-shot agent runs
(each input = a fresh chat + one user message → final reply). Agents
designed for bulk should:
- not rely on enabled tools that set `requiresApproval: true` — async
  batch execution can't pause for interactive approval and will mark
  the execution as failed
- have a tight `default_job_timeout` matching expected runtime
- emit a final assistant message that the app's per-execution callback
  can carry verbatim (full transcripts are fetched separately via
  `GET /chats/{chat_id}`)

## Common pitfalls

- **`pipPackages` is not a key** — use `dependencies`.
- **References are `namespace/name`** — never just `name`.
- **camelCase YAML keys** (`enabledQueries`, `connectionName`,
  `inputSchema`). Only SQL and Python bodies use snake_case.
- **Unknown YAML keys are rejected** — don't invent fields.
- **Missing `connectionName` on queries** — always specify it.
- **Forgot to update the manifest** — `sinas status` will fail. Update
  `requiredResources` and `requiredPermissions` as you add resources.

## Naming conventions

- `namespace`: kebab-case (`my-app`, `hubspot`, `mb-sales-ops`)
- queries: kebab-case (`search-docs`, `init-schema`)
- functions: snake_case (`extract_entities`, `process_doc`)
- agents/skills/connectors: kebab-case
- permission keys: `<namespace>.<resource>.<action>:<scope>` —
  e.g. `my-app.docs.read:own`. Scope is `:own` or `:all`.

## When the user asks for something packages can't do

- "Add a role" → write it in `sinas-config.yaml` (kind: SinasConfig). The
  CLI applies that file before the package.
- "Add a user" → admin creates via UI.
- "Connect to my database" → admin adds a Database Connection in settings,
  you wire `connectionName` to it in queries.
- "Set up an LLM provider" → admin configures one; reference by name from
  agents (or via a `resource_ref` variable so the installer picks).
