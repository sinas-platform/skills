# @sinas/create-app

Scaffold a React app integrated with Sinas.

```bash
npx @sinas/create-app my-app
cd my-app
npm install
npm run dev
```

The scaffolder prompts for:

- App name + Sinas namespace (defaults derived from the directory name)
- Sinas instance URL (verified against `/info` before scaffolding)
- Admin API token (saved to `.sinas/config.json`, gitignored)

It then writes:

- A Vite + React + TypeScript + Tailwind app
- `<SinasProvider>` and an auth flow auto-adapting to the instance's
  `auth_mode` (otp / password / password+otp)
- `sinas-package.yaml` starter with a manifest
- `.claude/skills/sinas-package-author` and `.claude/skills/sinas-app` so
  Claude Code (or any agent reading the repo) has the schema and workflow
  on hand

## License

AGPL-3.0
