import { useState } from 'react';
import { Logo, Wordmark } from '../components/Logo';
import type { UserRole } from '../types';
import { loginUser, registerUser } from '../services/auth';

export function LoginPage({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter both email and password.');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const result = await registerUser(email.trim(), password);
        if (!result.ok) {
          setError(result.error ?? 'Registration failed.');
          setIsLoading(false);
          return;
        }
      }
      const result = await loginUser(email.trim(), password);
      if (!result.ok) {
        setError(result.error ?? 'Login failed.');
        setIsLoading(false);
        return;
      }
      onLogin(result.role!);
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: 'var(--m20-bg)' }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center">
          <div className="flex items-center gap-2.5">
            <Logo size={72} />
            <Wordmark />
          </div>
        </div>

        <div className="m20-ticks m20-card mt-7 p-5 sm:p-7">
          <p className="m20-label text-center">Restricted Access</p>
          <h1
            className="mt-1.5 text-center text-[24px] leading-tight font-bold"
            style={{ color: 'var(--m20-ink)' }}
          >
            {isRegister ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="m20-muted mt-2 text-center text-[13px] leading-relaxed">
            {isRegister
              ? 'Register to access the project index and track your submissions.'
              : 'Authenticate to open the project index and track your submissions.'}
          </p>

          <div className="my-5 m20-rule" />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <div
                className="border p-3"
                style={{
                  borderColor: 'var(--m20-danger)',
                  backgroundColor: 'var(--m20-danger-soft)',
                }}
                role="alert"
              >
                <p className="text-[12.5px] font-semibold" style={{ color: 'var(--m20-danger)' }}>
                  {error}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="m20-label mb-1.5 block">
                Email Address
              </label>
              <input
                id="email"
                className="m20-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                aria-invalid={!!error}
              />
            </div>

            <div>
              <label htmlFor="password" className="m20-label mb-1.5 block">
                Password
              </label>
              <input
                id="password"
                className="m20-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                disabled={isLoading}
                aria-invalid={!!error}
              />
            </div>

            {isRegister && (
              <div>
                <label htmlFor="confirm" className="m20-label mb-1.5 block">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  className="m20-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="m20-btn m20-btn-primary w-full py-2.5"
            >
              {isLoading
                ? isRegister
                  ? 'Creating account…'
                  : 'Signing in…'
                : isRegister
                ? 'Create Account'
                : 'Sign In'}
            </button>
          </form>

          <p className="m20-muted mt-5 text-center text-[11.5px] leading-relaxed">
            {isRegister
              ? 'Already have an account? '
              : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsRegister((v) => !v);
                setError('');
              }}
              className="m20-accent-ink hover:underline"
              style={{ fontWeight: 500 }}
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>

        </div>

        <p className="m20-label mt-6 text-center">
          Personal study reference. Source: nevonprojects.com
        </p>
      </div>
    </div>
  );
}
