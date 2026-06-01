# {{appName}}

A React app integrated with Sinas.

## Two sides

This project has two halves:

- **The React app** (this codebase). Talks to Sinas as a logged-in user via
  the `@sinas/sdk` SDK. Auth is OTP / password / password+OTP — the login
  form auto-detects the workspace's mode via `/info`.
- **The Sinas package** (`sinas-package.yaml`). Declares the queries,
  functions, agents, skills, etc. that the app depends on. Installed into a
  Sinas instance via `sinas install`.

## Run

```bash
npm install
npm run dev          # → http://localhost:5173
```

Sign in with a user that exists on the Sinas instance.

## Sinas package side

The `sinas` CLI (from `@sinas/cli`) drives the package side:

```bash
sinas validate       # check sinas-package.yaml
sinas preview        # dry-run
sinas install        # apply (config first if sinas-config.yaml exists, then package)
sinas status         # manifest health
sinas add query my-query     # append a templated query block
```

Configuration lives in `.sinas/config.json` (gitignored — contains an admin
token). To regenerate, run `sinas login`.

## Custom permissions

If your app needs **custom** permission keys (anything outside `sinas.*`):

1. Add the keys to `spec.manifests[0].requiredPermissions` in
   `sinas-package.yaml`.
2. Create a `sinas-config.yaml` (kind: `SinasConfig`) defining a role that
   grants them. Packages can't create roles, but `sinas install` will apply
   that file first.

If you only use built-in `sinas.*` permissions, no role work needed — the
default Sinas roles cover them.
