import { requireConfig } from '../config.js';
import { SinasApi } from '../api.js';
import { findPackageFile } from '../files.js';
import { ok, fail, header, info, warn, ui } from '../ui.js';

interface ManifestSpec {
  namespace: string;
  name: string;
}

export async function statusCommand(): Promise<void> {
  const config = requireConfig();
  const api = new SinasApi(config.instance_url, config.admin_token);

  const pkg = findPackageFile();
  if (!pkg || !pkg.parsed) {
    fail('No valid sinas-package.yaml found.');
    process.exit(1);
  }

  const manifests = ((pkg.parsed.spec as Record<string, unknown> | undefined)?.manifests ?? []) as ManifestSpec[];
  if (manifests.length === 0) {
    warn('Package has no manifests. Add one under spec.manifests to enable status reporting.');
    return;
  }

  for (const m of manifests) {
    header(`${m.namespace}/${m.name}`);
    try {
      const status = await api.getManifestStatus(m.namespace, m.name);
      const missingRes = status.resources.filter((r) => !r.exists);
      const missingStores = status.stores.filter((s) => !s.exists);
      if (missingRes.length === 0) {
        ok(`All ${status.resources.length} required resources present`);
      } else {
        fail(`Missing ${missingRes.length} of ${status.resources.length} resources:`);
        for (const r of missingRes) console.log(`    - ${ui.cyan(r.type)} ${r.namespace}/${r.name}`);
      }
      if (status.permissions.missing.length === 0) {
        ok('All required permissions held');
      } else {
        fail(`Missing ${status.permissions.missing.length} permission(s):`);
        for (const p of status.permissions.missing) console.log(`    - ${ui.cyan(p)}`);
        info('Hint: extend sinas-config.yaml with a role that grants these and re-run `sinas install`.');
      }
      if (missingStores.length > 0) {
        fail(`Missing ${missingStores.length} store(s):`);
        for (const s of missingStores) console.log(`    - ${ui.cyan(s.store)}`);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  }
}
