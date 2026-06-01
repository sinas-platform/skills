import prompts from 'prompts';
import { requireConfig } from '../config.js';
import { SinasApi } from '../api.js';
import { findConfigFile, findPackageFile } from '../files.js';
import { ok, fail, header, info, warn } from '../ui.js';

export async function installCommand(opts: { yes?: boolean; variables?: Record<string, unknown> }): Promise<void> {
  const config = requireConfig();
  const api = new SinasApi(config.instance_url, config.admin_token);

  const pkg = findPackageFile();
  const cfg = findConfigFile();
  if (!pkg && !cfg) {
    fail('No sinas-package.yaml or sinas-config.yaml found in the current directory.');
    process.exit(1);
  }

  if (!opts.yes) {
    info('This will modify the Sinas instance at ' + config.instance_url);
    const { go } = await prompts({
      type: 'confirm',
      name: 'go',
      message: 'Continue?',
      initial: false,
    });
    if (!go) {
      warn('Cancelled.');
      return;
    }
  }

  // Apply SinasConfig first (defines roles the package may reference)
  if (cfg) {
    header(`Applying SinasConfig  ${cfg.path}`);
    try {
      const result = await api.applyConfig(cfg.content, false);
      if (!result.success) {
        for (const e of result.errors) fail(e);
        process.exit(1);
      }
      ok('Config applied');
    } catch (e) {
      fail((e as Error).message);
      process.exit(1);
    }
  }

  if (pkg) {
    header(`Installing SinasPackage  ${pkg.path}`);
    try {
      const result = await api.installPackage(pkg.content, opts.variables);
      if (!result.apply.success) {
        for (const e of result.apply.errors) fail(e);
        process.exit(1);
      }
      ok(`Installed ${result.package.name}@${result.package.version}`);
    } catch (e) {
      fail((e as Error).message);
      process.exit(1);
    }
  }
}
