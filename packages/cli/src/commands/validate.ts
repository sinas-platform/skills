import { requireConfig } from '../config.js';
import { SinasApi } from '../api.js';
import { findAllSinasFiles } from '../files.js';
import { ok, fail, header, info, warn, ui } from '../ui.js';

export async function validateCommand(): Promise<void> {
  const config = requireConfig();
  const api = new SinasApi(config.instance_url, config.admin_token);

  const files = findAllSinasFiles();
  if (files.length === 0) {
    fail('No sinas-package.yaml or sinas-config.yaml found in the current directory.');
    process.exit(1);
  }

  let totalErrors = 0;

  for (const file of files) {
    header(`${file.kind === 'unknown' ? '?' : file.kind}  ${file.path}`);
    try {
      const result = await api.validateConfig(file.content);
      if (result.errors.length === 0 && result.warnings.length === 0) {
        ok('Valid');
      } else {
        if (result.errors.length > 0) {
          totalErrors += result.errors.length;
          for (const err of result.errors) {
            fail(`${ui.cyan(err.path || '(root)')}: ${err.message}`);
          }
        }
        for (const w of result.warnings) {
          warn(`${ui.cyan(w.path || '(root)')}: ${w.message}`);
        }
        if (result.valid) ok('Valid (with warnings)');
      }
    } catch (e) {
      totalErrors += 1;
      fail((e as Error).message);
    }
  }

  if (totalErrors > 0) {
    info(`\n${totalErrors} error(s). Fix them and run \`sinas validate\` again.`);
    process.exit(1);
  }
}
