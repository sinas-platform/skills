# sinas-skills

> ⚠️ **Under active development.** This project is very much still a work in
> progress — APIs, package layout, and skill contents may change without notice.

Skills and scaffolding tools for AI coding agents (Claude Code, Cursor, etc.)
working with [Sinas](https://github.com/sinas-platform/sinas).

Use the scaffolding (`@sinas/create-app`) to spin up a working base app in one
command — the quickest way to start. Or skip the scaffolding entirely and just
drop the skills into your own coding agent: they're plain markdown that teaches
the agent how to author Sinas packages and integrate an app, so it can do the
work in whatever project you already have.

Two pieces:

| Package | Purpose |
|---|---|
| [`@sinas/cli`](packages/cli) | `sinas` binary — validate, preview, install Sinas packages from your terminal |
| [`@sinas/create-app`](packages/create-app) | `npx @sinas/create-app` — scaffold a React app that integrates with Sinas |

Two skills (markdown docs read by your AI coding agent):

| Skill | What it teaches |
|---|---|
| [`sinas-package-author`](skills/sinas-package-author) | Authoring SinasPackage YAMLs: schema, workflow, resource patterns |
| [`sinas-app`](skills/sinas-app) | Scaffolding and integrating a Node app with Sinas |

When you run `npx @sinas/create-app`, the skill markdown is copied into the
new project's `.claude/skills/` so the agent reading your repo can use it
without any global install.

## Getting started

### 1. Create an admin API key

The CLI talks to the Management API, which needs an admin token. Create one in
the **Sinas management console**:

1. Open your instance's management console and go to **Settings → API keys**.
2. Create a new key with the permission `sinas.*:all` (full management access).
3. Copy the token — you won't be able to view it again.

> The admin token is used only by the CLI for the Management API. It never goes
> into your browser bundle.

### 2. Install the CLI and log in

```bash
npm i -g @sinas/cli
sinas login                       # paste your instance URL + admin token
```

`sinas login` verifies the token against `/auth/me` and writes it to
`./.sinas/config.json` (or `~/.sinas/config.json` with `--global`).

### 3. Scaffold an app

```bash
npx @sinas/create-app my-app
cd my-app
npm install
npm run dev
```

### 4. Author and install the Sinas package side

```bash
sinas validate                    # validate sinas-package.yaml + sinas-config.yaml
sinas preview                     # dry-run, show the diff
sinas install                     # apply config, then install the package
sinas status                      # check resources + required permissions
```

## License

AGPL-3.0
