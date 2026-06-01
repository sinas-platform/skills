import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

export const PACKAGE_FILE = 'sinas-package.yaml';
export const CONFIG_FILE = 'sinas-config.yaml';

export interface SinasYamlInfo {
  path: string;
  content: string;
  parsed: Record<string, unknown> | null;
  kind: 'SinasPackage' | 'SinasConfig' | 'unknown';
}

function readYamlMaybe(path: string): SinasYamlInfo | null {
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf8');
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = parseYaml(content) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  const kindStr = (parsed?.kind as string | undefined) ?? '';
  const kind: SinasYamlInfo['kind'] =
    kindStr === 'SinasPackage' || kindStr === 'SinasConfig' ? kindStr : 'unknown';
  return { path, content, parsed, kind };
}

export function findPackageFile(cwd = process.cwd()): SinasYamlInfo | null {
  return readYamlMaybe(join(cwd, PACKAGE_FILE));
}

export function findConfigFile(cwd = process.cwd()): SinasYamlInfo | null {
  return readYamlMaybe(join(cwd, CONFIG_FILE));
}

export function findAllSinasFiles(cwd = process.cwd()): SinasYamlInfo[] {
  const out: SinasYamlInfo[] = [];
  const pkg = findPackageFile(cwd);
  if (pkg) out.push(pkg);
  const cfg = findConfigFile(cwd);
  if (cfg) out.push(cfg);
  return out;
}
