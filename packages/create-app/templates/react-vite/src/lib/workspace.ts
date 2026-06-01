import { env } from './env';

const STORAGE_KEY = 'sinas_workspace_url';
const DEFAULT_URL = (env('VITE_DEFAULT_WORKSPACE_URL') ?? '').trim().replace(/\/+$/, '');

function normalize(url: string | null | undefined): string {
  return (url ?? '').trim().replace(/\/+$/, '');
}

function fromQuery(): string {
  const params = new URLSearchParams(window.location.search);
  const ws = params.get('ws') ?? '';
  if (!ws) return '';
  const withProto = /^https?:\/\//i.test(ws) ? ws : `https://${ws}`;
  try {
    return normalize(new URL(withProto).toString());
  } catch {
    return '';
  }
}

export function getWorkspaceUrl(): string {
  return (
    fromQuery() ||
    normalize(localStorage.getItem(STORAGE_KEY)) ||
    DEFAULT_URL
  );
}

export function setWorkspaceUrl(url: string): void {
  const next = normalize(url);
  if (!next) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, next);
}

export function clearWorkspaceUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasWorkspaceUrl(): boolean {
  return getWorkspaceUrl().length > 0;
}
