# @sinas/cli

`sinas` — author and install Sinas packages from your terminal.

```bash
npm i -g @sinas/cli
sinas login                       # → .sinas/config.json
sinas init my-app                 # scaffold a new app (delegates to @sinas/create-app)
sinas validate                    # validate sinas-package.yaml + sinas-config.yaml
sinas preview                     # dry-run, show diff
sinas install                     # apply config first, then install package
sinas status                      # check manifest health (resources, permissions)
sinas add query search-things     # append a templated resource block
```

## Configuration

Two locations, in order:

1. `./.sinas/config.json` (project-local, gitignored)
2. `~/.sinas/config.json` (global fallback)

Shape:

```json
{
  "instance_url": "https://sinas.example.com",
  "admin_token": "sk_...",
  "app": { "name": "my-app", "namespace": "my-app" }
}
```

The admin token is used for the Management API — it never goes into your browser bundle.

## License

AGPL-3.0
