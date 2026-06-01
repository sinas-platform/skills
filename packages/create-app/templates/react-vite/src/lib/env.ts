export function env(name: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[name];
}
