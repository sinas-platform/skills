import { Command } from 'commander';
import { fail } from './ui.js';

const program = new Command();

program
  .name('sinas')
  .description('CLI for authoring and installing Sinas packages')
  .version('0.1.0');

program
  .command('init')
  .description('Scaffold a new Sinas app in the given directory')
  .argument('[dir]', 'Target directory')
  .action(async (dir?: string) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(dir);
  });

program
  .command('login')
  .description('Save an instance URL + admin token to .sinas/config.json')
  .option('--global', 'Save to ~/.sinas/config.json instead of the current project')
  .action(async (opts) => {
    const { loginCommand } = await import('./commands/login.js');
    await loginCommand(opts);
  });

program
  .command('validate')
  .description('Validate sinas-package.yaml and sinas-config.yaml')
  .action(async () => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand();
  });

program
  .command('preview')
  .description('Dry-run the package and/or config — show what would change')
  .action(async () => {
    const { previewCommand } = await import('./commands/preview.js');
    await previewCommand();
  });

program
  .command('install')
  .description('Apply sinas-config.yaml (if present), then install sinas-package.yaml')
  .option('-y, --yes', 'Skip the confirmation prompt')
  .action(async (opts) => {
    const { installCommand } = await import('./commands/install.js');
    await installCommand({ yes: opts.yes });
  });

program
  .command('status')
  .description('Check manifest health: resources, permissions, stores')
  .action(async () => {
    const { statusCommand } = await import('./commands/status.js');
    await statusCommand();
  });

program
  .command('add')
  .description('Append a templated resource block to sinas-package.yaml')
  .argument('<type>', 'query | function | connector | agent | skill | collection | store | webhook | schedule')
  .argument('<name>', 'Resource name')
  .option('--namespace <ns>', 'Namespace (default: package name)')
  .action(async (type: string, name: string, opts) => {
    const { addCommand } = await import('./commands/add.js');
    await addCommand(type, name, opts);
  });

program.parseAsync(process.argv).catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
