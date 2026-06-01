import { useState, type FormEvent } from 'react';
import type { AuthMode } from '@sinas/sdk';
import { useAuth } from '../lib/authContext';
import { useClient } from '../lib/clientContext';

type Step = 'credentials' | 'otp';

export function LoginForm({ authMode }: { authMode: AuthMode }) {
  const client = useClient();
  const { setSession } = useAuth();

  const requiresPassword = authMode === 'password' || authMode === 'password+otp';
  const requiresOTP = authMode === 'otp' || authMode === 'password+otp';

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await client.auth.login({ email, password: requiresPassword ? password : undefined });
      if (resp.access_token && resp.refresh_token) {
        // password-only mode completed in one shot
        await setSession(resp.access_token, resp.refresh_token);
      } else if (resp.session_id) {
        setSessionId(resp.session_id);
        setStep('otp');
      } else {
        setError('Unexpected response from /auth/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submitOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setError(null);
    setLoading(true);
    try {
      const resp = await client.auth.verifyOTP({ session_id: sessionId, otp_code: otp });
      await setSession(resp.access_token, resp.refresh_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp' && requiresOTP) {
    return (
      <form onSubmit={submitOTP} className="space-y-3">
        <p className="text-sm text-gray-600">
          We sent a 6-digit code to {email}.
        </p>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg tracking-widest"
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          {loading ? 'Verifying…' : 'Sign in'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} className="space-y-3">
      <input
        autoFocus
        type="email"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {requiresPassword && (
        <input
          type="password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40"
      >
        {loading ? 'Sending…' : requiresOTP ? 'Send code' : 'Sign in'}
      </button>
    </form>
  );
}
