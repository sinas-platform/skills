const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function wrap(code: number, text: string): string {
  if (!useColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const ui = {
  bold: (s: string) => wrap(1, s),
  dim: (s: string) => wrap(2, s),
  red: (s: string) => wrap(31, s),
  green: (s: string) => wrap(32, s),
  yellow: (s: string) => wrap(33, s),
  blue: (s: string) => wrap(34, s),
  cyan: (s: string) => wrap(36, s),
  gray: (s: string) => wrap(90, s),
};

export function ok(msg: string): void {
  console.log(`${ui.green('✓')} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${ui.yellow('!')} ${msg}`);
}

export function fail(msg: string): void {
  console.error(`${ui.red('✗')} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${ui.dim('·')} ${msg}`);
}

export function header(msg: string): void {
  console.log(`\n${ui.bold(msg)}`);
}

export function die(msg: string, code = 1): never {
  fail(msg);
  process.exit(code);
}
