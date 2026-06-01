import { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SinasProvider } from '@sinas/sdk';
import { createClient, buildClientOptions } from './lib/client';
import { ClientProvider } from './lib/clientContext';
import { AuthProvider } from './lib/authContext';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';

export default function App() {
  // Create the client once. Token + workspace are read on every call via the
  // callbacks in buildClientOptions, so the client itself never goes stale.
  const client = useMemo(() => createClient(), []);
  const sinasOptions = useMemo(() => buildClientOptions(), []);

  return (
    <ClientProvider value={client}>
      <SinasProvider options={sinasOptions}>
        <AuthProvider client={client}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <HomePage />
                  </RequireAuth>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SinasProvider>
    </ClientProvider>
  );
}
