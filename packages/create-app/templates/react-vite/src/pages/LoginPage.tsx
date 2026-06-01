import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthMode, InfoResponse } from '@sinas/sdk';
import { useAuth } from '../lib/authContext';
import { useClient } from '../lib/clientContext';
import { getWorkspaceUrl, setWorkspaceUrl } from '../lib/workspace';
import { WorkspaceModal } from '../components/WorkspaceModal';
import { LoginForm } from '../components/LoginForm';

function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

export function LoginPage() {
  const client = useClient();
  const { status } = useAuth();
  const navigate = useNavigate();

  const [workspaceUrl, setWsUrl] = useState(getWorkspaceUrl());
  const [modalOpen, setModalOpen] = useState(false);
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    if (!workspaceUrl) {
      setModalOpen(true);
      return;
    }
    setInfo(null);
    setInfoError(null);
    client.auth
      .getInfo()
      .then(setInfo)
      .catch((err) => setInfoError(err instanceof Error ? err.message : String(err)));
  }, [workspaceUrl, client]);

  const host = useMemo(() => prettyHost(workspaceUrl), [workspaceUrl]);
  const authMode: AuthMode | null = info?.auth_mode ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mb-4 text-xs text-gray-500 hover:text-gray-900"
        >
          {host ? <>at <span className="underline">{host}</span></> : 'Select workspace…'}
        </button>

        {!workspaceUrl ? (
          <p className="text-sm text-gray-500">Choose a workspace to continue.</p>
        ) : infoError ? (
          <p className="text-sm text-red-600">Could not reach workspace: {infoError}</p>
        ) : !authMode ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <LoginForm authMode={authMode} />
        )}

        <WorkspaceModal
          open={modalOpen}
          initial={workspaceUrl}
          onClose={() => setModalOpen(false)}
          onSave={(url) => {
            setWorkspaceUrl(url);
            setWsUrl(url);
            setModalOpen(false);
            // Reload so the SinasClient picks up the new baseUrl.
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}
