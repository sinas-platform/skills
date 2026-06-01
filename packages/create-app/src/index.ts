import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import prompts from 'prompts';
import { promptUser } from './prompt.js';
import { verifyInstance } from './verify.js';
import { scaffold } from './scaffold.js';

function ansi(code: number, s: string): string {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}
const dim = (s: string) => ansi(2, s);
const cyan = (s: string) => ansi(36, s);
const green = (s: string) => ansi(32, s);
const red = (s: string) => ansi(31, s);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

interface ParsedArgs {
  positional?: string;
  appName?: string;
  appNamespace?: string;
  instanceUrl?: string;
  adminToken?: string;
  yes: boolean;
  skipVerify: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { yes: false, skipVerify: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('-') && out.positional === undefined) {
      out.positional = a;
    } else if (a === '--app-name') out.appName = argv[++i];
    else if (a === '--namespace') out.appNamespace = argv[++i];
    else if (a === '--instance-url') out.instanceUrl = argv[++i];
    else if (a === '--admin-token') out.adminToken = argv[++i];
    else if (a === '-y' || a === '--yes') out.yes = true;
    else if (a === '--skip-verify') out.skipVerify = true;
  }
  return out;
}

async function main(): Promise<void> {
  console.log(`\n${cyan('@sinas/create-app')} ${dim('— scaffold a React app for Sinas')}\n`);

  const args = parseArgs(process.argv.slice(2));
  let targetDir = args.positional;

  if (!targetDir) {
    const answer = await prompts(
      {
        type: 'text',
        name: 'dir',
        message: 'Project directory',
        initial: 'my-sinas-app',
        validate: (v: string) => (v.trim().length > 0 ? true : 'Required'),
      },
      { onCancel: () => process.exit(130) },
    );
    targetDir = answer.dir.trim();
  }

  const targetPath = resolve(process.cwd(), targetDir!);

  if (existsSync(targetPath) && readdirSync(targetPath).length > 0) {
    console.error(red(`Target directory ${targetPath} is not empty.`));
    process.exit(1);
  }

  // Non-interactive path when all required flags are present.
  const fullyFlagged =
    args.appName !== undefined &&
    args.appNamespace !== undefined &&
    args.instanceUrl !== undefined &&
    args.adminToken !== undefined;

  const userInput = fullyFlagged
    ? {
        appName: args.appName!,
        appNamespace: args.appNamespace!,
        instance_url: args.instanceUrl!.replace(/\/+$/, ''),
        admin_token: args.adminToken!,
      }
    : await promptUser({ defaultAppName: slugify(targetDir!) });

  if (!args.skipVerify) {
    const authMode = await verifyInstance(userInput.instance_url).catch((err) => {
      console.error(red(`Could not reach ${userInput.instance_url}/info — ${err.message}`));
      console.error(dim('Continuing without verification. You can run `sinas login` later.'));
      return null;
    });
    if (authMode) console.log(green(`✓`), `Instance reachable. Auth mode: ${cyan(authMode)}\n`);
  }

  await scaffold({
    targetPath,
    appName: userInput.appName,
    appNamespace: userInput.appNamespace,
    instanceUrl: userInput.instance_url,
    adminToken: userInput.admin_token,
  });

  console.log(`\n${green('✓')} Scaffolded ${cyan(targetPath)}\n`);
  console.log('Next steps:');
  console.log(`  ${dim('$')} cd ${targetDir}`);
  console.log(`  ${dim('$')} npm install`);
  console.log(`  ${dim('$')} npm run dev`);
  console.log(`\n  ${dim('$')} sinas validate     ${dim('# check the package side')}`);
  console.log(`  ${dim('$')} sinas preview\n`);
}

main().catch((err) => {
  console.error(red('Error:'), err);
  process.exit(1);
});
