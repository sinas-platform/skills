import { SinasClient, type SinasClientOptions } from '@sinas/sdk';
import { tokens } from './authStorage';
import { getWorkspaceUrl } from './workspace';

let unauthenticatedHandler: (() => void) | null = null;

export function setUnauthenticatedHandler(fn: () => void): void {
  unauthenticatedHandler = fn;
}

export function buildClientOptions(): SinasClientOptions {
  return {
    baseUrl: getWorkspaceUrl() || undefined,
    getAccessToken: () => tokens.access,
    getRefreshToken: () => tokens.refresh,
    onTokenRefresh: (access) => tokens.setAccess(access),
    onUnauthenticated: () => {
      tokens.clear();
      unauthenticatedHandler?.();
    },
  };
}

export function createClient(): SinasClient {
  return new SinasClient(buildClientOptions());
}
