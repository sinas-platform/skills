# sinas-skills

Skills and a CLI for AI coding agents (Claude Code, Cursor, etc.) building
on [Sinas](https://github.com/sinas-platform/sinas).

Two skills — plain markdown your coding agent reads — and one CLI:

| Piece | Purpose |
|---|---|
| [`skills/sinas-package-author`](skills/sinas-package-author) | Extend a Sinas instance via packages: queries, functions, agents, pipelines, connectors, triggers — schema, workflow, patterns |
| [`skills/sinas-ui`](skills/sinas-ui) | Build a UI or client on the Sinas runtime API: auth in every mode, agents, streaming, pipelines, files — framework-agnostic |
| [`@sinas/cli`](packages/cli) | `sinas` binary — init, validate, preview, install packages against an instance |

There is deliberately **no app scaffolding** here. `sinas init` drops the
skills into any existing repo's `.claude/skills/` plus a starter
`sinas-package.yaml`; your agent does the rest in whatever stack the
project already uses.

## Getting started

```bash
# In your project:
npx @sinas/cli init      # skills + starter package file
npx @sinas/cli login     # instance URL + admin API key → .sinas/config.json
```

Create the admin API key in the Sinas console under **Settings → API
keys** (needs management permissions). Then ask your coding agent for
what you want — "add a pipeline that syncs deals nightly", "build a
review screen for the triage agent" — and it will use the skills.

The authoring loop the agent follows:

```bash
sinas add <type> <name>   # stub a resource in sinas-package.yaml
sinas validate            # after every edit
sinas preview             # dry-run diff
sinas install             # apply (asks for confirmation)
sinas status              # manifest health: resources + permissions
```

## Compatibility

Tracks Sinas 0.4.x (pipelines, provider batch mode, agent provider
overrides, OIDC token verification). Instances report their version in
the `X-Sinas-Version` response header and at `GET /info`. The instance's
`/openapi.json` is always the authority when details differ.

## License

AGPL-3.0
