import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser, InfoResponse, SinasClient } from '@sinas/sdk';
import { tokens } from './authStorage';
import { setUnauthenticatedHandler } from './client';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: Status;
  user: AuthUser | null;
  info: InfoResponse | null;
  error: string | null;
  /** Run after a login call returns tokens. */
  setSession: (access: string, refresh: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ client, children }: { client: SinasClient; children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const [infoResp, meResp] = await Promise.all([
        client.auth.getInfo().catch(() => null),
        tokens.access ? client.auth.getMe().catch(() => null) : Promise.resolve(null),
      ]);
      if (infoResp) setInfo(infoResp);
      if (meResp) {
        setUser(meResp);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSession = async (access: string, refresh: string) => {
    tokens.set(access, refresh);
    await refreshSession();
  };

  const refreshSession = async () => {
    await refresh();
  };

  const signOut = async () => {
    const rt = tokens.refresh;
    if (rt) {
      try {
        await client.auth.logout(rt);
      } catch {
        // best effort
      }
    }
    tokens.clear();
    setUser(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ status, user, info, error, setSession, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
