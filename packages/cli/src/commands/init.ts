import { spawn } from 'node:child_process';
import { info } from '../ui.js';

export async function initCommand(dir?: string): Promise<void> {
  info('Delegating to @sinas/create-app via npx...');
  await new Promise<void>((resolve, reject) => {
    const args = ['@sinas/create-app'];
    if (dir) args.push(dir);
    const child = spawn('npx', args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`create-app exited with code ${code}`));
    });
    child.on('error', reject);
  });
}
