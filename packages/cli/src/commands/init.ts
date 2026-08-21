import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ok, info, warn } from '../ui.js';
// Bundled at build time (tsup loader '.md': 'text') from the repo's skills/.
// @ts-expect-error - text import handled by tsup loader
import packageAuthorSkill from '../../../../skills/sinas-package-author/SKILL.md';
// @ts-expect-error - text import handled by tsup loader
import uiSkill from '../../../../skills/sinas-ui/SKILL.md';

const STARTER_PACKAGE = `apiVersion: sinas.co/v1
kind: SinasPackage
package:
  name: my-app
  version: "0.1.0"
  description: TODO — what this package does.
spec:
  manifests:
    - namespace: my-app
      name: my-app
      description: Manifest for my-app
      requiredResources: []
      requiredPermissions: []
`;

/**
 * Set up the current repo for Sinas development with an AI coding agent:
 * drop the skills into .claude/skills/ and write a starter package file.
 * No app scaffolding — this works inside any existing project.
 */
export async function initCommand(dir?: string): Promise<void> {
  const root = dir ?? '.';
  mkdirSync(root, { recursive: true });

  const skills: Array<[string, string]> = [
    ['sinas-package-author', packageAuthorSkill],
    ['sinas-ui', uiSkill],
  ];
  for (const [name, content] of skills) {
    const skillDir = join(root, '.claude', 'skills', name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), content);
    ok(`Skill installed: .claude/skills/${name}/SKILL.md`);
  }

  const pkgPath = join(root, 'sinas-package.yaml');
  if (existsSync(pkgPath)) {
    warn(`sinas-package.yaml already exists — left untouched.`);
  } else {
    writeFileSync(pkgPath, STARTER_PACKAGE);
    ok(`Starter package written: sinas-package.yaml`);
  }

  info('');
  info('Next steps:');
  info('  1. sinas login          # save instance URL + admin token');
  info('  2. sinas add <type> <name>  # stub a resource, then edit it');
  info('  3. sinas validate && sinas preview && sinas install');
  info('');
  info('Your coding agent will pick up the skills automatically.');
}
