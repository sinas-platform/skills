import { requireConfig } from '../config.js';
import { SinasApi } from '../api.js';
import { findConfigFile, findPackageFile } from '../files.js';
import { ok, fail, header, info, ui } from '../ui.js';

function printSummary(
  summary: Record<string, Record<string, number>>,
  changes: Array<{ action: string; resourceType: string; resourceName: string; details?: string }>,
): void {
  const counts = {
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
  };
  for (const [action, byType] of Object.entries(summary)) {
    if (!(action in counts)) continue;
    counts[action as keyof typeof counts] = Object.values(byType).reduce((a, b) => a + b, 0);
  }
  info(
    `${ui.green('+' + counts.created)} created   ` +
      `${ui.yellow('~' + counts.updated)} updated   ` +
      `${ui.gray('·' + counts.unchanged)} unchanged   ` +
      `${ui.red('-' + counts.deleted)} deleted`,
  );

  for (const ch of changes) {
    if (ch.action === 'unchanged') continue;
    const glyph =
      ch.action === 'create' ? ui.green('+') :
        ch.action === 'update' ? ui.yellow('~') :
          ch.action === 'delete' ? ui.red('-') : ui.gray('·');
    console.log(`  ${glyph} ${ui.cyan(ch.resourceType)} ${ch.resourceName}${ch.details ? ui.dim(` — ${ch.details}`) : ''}`);
  }
}

export async function previewCommand(): Promise<void> {
  const config = requireConfig();
  const api = new SinasApi(config.instance_url, config.admin_token);

  const pkg = findPackageFile();
  const cfg = findConfigFile();
  if (!pkg && !cfg) {
    fail('No sinas-package.yaml or sinas-config.yaml found in the current directory.');
    process.exit(1);
  }

  if (cfg) {
    header(`SinasConfig  ${cfg.path}  (dry-run)`);
    try {
      const result = await api.applyConfig(cfg.content, true);
      if (result.errors.length > 0) {
        for (const e of result.errors) fail(e);
        process.exit(1);
      }
      printSummary(result.summary, result.changes);
    } catch (e) {
      fail((e as Error).message);
      process.exit(1);
    }
  }

  if (pkg) {
    header(`SinasPackage  ${pkg.path}  (dry-run)`);
    try {
      const result = await api.previewPackage(pkg.content);
      if (result.requires_input) {
        info('Package declares install-time variables. Provide them on `sinas install` when ready.');
      }
      if (result.errors.length > 0) {
        for (const e of result.errors) fail(e);
        process.exit(1);
      }
      printSummary(result.summary, result.changes);
    } catch (e) {
      fail((e as Error).message);
      process.exit(1);
    }
  }

  ok('Preview complete. Use `sinas install` to apply.');
}
