import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, chmodSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ScaffoldOptions {
  targetPath: string;
  appName: string;
  appNamespace: string;
  instanceUrl: string;
  adminToken: string;
}

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.yaml', '.yml', '.md', '.txt', '.html', '.css', '.scss',
  '.example', '.gitignore', '.env',
]);

function isTextFile(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(path.slice(dot));
}

function applyTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m,
  );
}

function copyDir(src: string, dst: string, vars: Record<string, string>): void {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    // Strip the .tmpl suffix on copy. The suffix lets us name dotfile templates
    // like "_gitignore.tmpl" without npm publishing eating the dot.
    const destName = entry.replace(/^_/, '.').replace(/\.tmpl$/, '');
    const dstPath = join(dst, destName);
    const st = statSync(srcPath);
    if (st.isDirectory()) {
      copyDir(srcPath, dstPath, vars);
    } else if (isTextFile(srcPath) || /\.tmpl$/.test(entry)) {
      const content = readFileSync(srcPath, 'utf8');
      writeFileSync(dstPath, applyTemplate(content, vars));
    } else {
      copyFileSync(srcPath, dstPath);
    }
  }
}

function thisDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function resolveTemplateRoot(): string {
  // When bundled, dist/index.js lives next to ../templates/react-vite
  const here = thisDir();
  const candidates = [
    resolve(here, '../templates/react-vite'),
    resolve(here, '../../templates/react-vite'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(`Template not found. Tried: ${candidates.join(', ')}`);
}

export async function scaffold(opts: ScaffoldOptions): Promise<void> {
  const vars: Record<string, string> = {
    appName: opts.appName,
    appNamespace: opts.appNamespace,
    instanceUrl: opts.instanceUrl,
  };

  const templateRoot = resolveTemplateRoot();
  copyDir(templateRoot, opts.targetPath, vars);

  // Write .sinas/config.json with the admin token (gitignored).
  const sinasDir = join(opts.targetPath, '.sinas');
  if (!existsSync(sinasDir)) mkdirSync(sinasDir, { recursive: true });
  const cfgPath = join(sinasDir, 'config.json');
  writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        instance_url: opts.instanceUrl,
        admin_token: opts.adminToken,
        app: { name: opts.appName, namespace: opts.appNamespace },
      },
      null,
      2,
    ) + '\n',
  );
  try {
    chmodSync(cfgPath, 0o600);
  } catch {
    // ignore
  }

  // SKILL.md docs are bundled inside the template at .claude/skills/, so
  // they were already copied by the template walk above.
}
