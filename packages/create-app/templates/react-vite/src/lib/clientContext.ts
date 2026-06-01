import { createContext, useContext } from 'react';
import type { SinasClient } from '@sinas/sdk';

const Ctx = createContext<SinasClient | null>(null);

export const ClientProvider = Ctx.Provider;

export function useClient(): SinasClient {
  const c = useContext(Ctx);
  if (!c) throw new Error('useClient must be used inside <ClientProvider>');
  return c;
}
