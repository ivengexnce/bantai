'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  AtSign,
  AlertCircle,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export function AuthScreen() {
  const { setUser, localWorkstationAvailable } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // MFA challenge state
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  // Forgot/Reset password state
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [forgotRequested, setForgotRequested] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (mfaChallengeToken) {
      if (mfaCode.trim().length < 6) {
        setError('Enter your 6-digit authenticator code or recovery code.');
        return;
      }
      try {
        setSubmitting(true);
        const res = await api.verifyMfaChallenge(mfaChallengeToken, mfaCode.trim());
        setUser(res.user);
      } catch (err) {
        setError((err as Error).message || 'MFA verification failed.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'forgot') {
      try {
        setSubmitting(true);
        if (!forgotRequested) {
          await api.forgotPassword(email.trim());
          setForgotRequested(true);
          setInfoMessage('If an account exists for that email, a single-use reset token has been sent via configured SMTP (or queued to local mail outbox in dev). Enter your token below.');
        } else {
          if (resetNewPassword.length < 8 || resetNewPassword.length > 72) {
            setError('New password must be between 8 and 72 characters.');
            setSubmitting(false);
            return;
          }
          await api.resetPassword(resetToken.trim(), resetNewPassword);
          setMode('login');
          setForgotRequested(false);
          setResetToken('');
          setResetNewPassword('');
          setInfoMessage('Password reset successful. Sign in with your new password.');
        }
      } catch (err) {
        setError((err as Error).message || 'Password recovery failed.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 8 || password.length > 72) {
        setError('Password must be between 8 and 72 characters.');
        return;
      }
      if (name.trim().length < 2) {
        setError('Full name must be at least 2 characters.');
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,40}$/.test(username.trim())) {
        setError('Username must be 3-40 alphanumeric or underscore characters.');
        return;
      }
    }

    try {
      setSubmitting(true);
      if (mode === 'login') {
        const res = await api.login({ email: trimmedEmail, password });
        if (res.mfaRequired && res.mfaChallengeToken) {
          setMfaChallengeToken(res.mfaChallengeToken);
          return;
        }
        if (res.user) setUser(res.user);
      } else {
        const res = await api.signup({
          email: trimmedEmail,
          password,
          name: name.trim(),
          username: username.trim()
        });
        setUser(res.user);
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07070f] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="ambient-radial-bloom" />

      <div className="w-full max-w-md rounded-card surface-floating p-6 sm:p-8 space-y-6 relative z-10 border border-white/10">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0f0f1a] border border-[#6366f1]/40 flex items-center justify-center text-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            {mfaChallengeToken ? <ShieldCheck size={22} className="text-[#22d3ee]" /> : <Terminal size={22} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">BANTAI</h1>
          <p className="text-xs font-mono text-[#22d3ee]">Apna Model. Apna Dimaag. Apna AI.</p>
          <p className="text-xs text-[#94a3b8]">
            {mfaChallengeToken
              ? 'Two-Factor Authentication required. Enter your TOTP or recovery code.'
              : mode === 'forgot'
              ? 'Reset your BANTAI account password securely.'
              : mode === 'login'
              ? 'Sign in with HttpOnly cookie & CSRF-protected session.'
              : 'Create your private local-first AI account.'}
          </p>
        </div>

        {!mfaChallengeToken && mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#07070f] border border-white/5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-xs text-[#22d3ee]">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mfaChallengeToken ? (
            <>
              <div>
                <label htmlFor="auth-mfa-code" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Authenticator 6-Digit Code or Recovery Code
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    id="auth-mfa-code"
                    type="text"
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value)}
                    placeholder="123456 or ABCD-1234"
                    className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMfaChallengeToken(null);
                  setMfaCode('');
                  setError(null);
                }}
                className="text-xs text-[#94a3b8] hover:text-white"
              >
                Back to Sign In
              </button>
            </>
          ) : mode === 'forgot' ? (
            <>
              <div>
                <label htmlFor="auth-forgot-email" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>

              {forgotRequested && (
                <>
                  <div>
                    <label htmlFor="auth-reset-token" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                      Reset Token
                    </label>
                    <input
                      id="auth-reset-token"
                      type="text"
                      required
                      value={resetToken}
                      onChange={e => setResetToken(e.target.value)}
                      placeholder="Paste single-use reset token"
                      className="w-full bg-[#07070f] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#6366f1]"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-reset-pw" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                      New Password (8-72 chars)
                    </label>
                    <input
                      id="auth-reset-pw"
                      type="password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-[#07070f] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366f1]"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setForgotRequested(false);
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-xs text-[#94a3b8] hover:text-white"
              >
                Back to Sign In
              </button>
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                      <input
                        id="auth-name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-username" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                      <input
                        id="auth-username"
                        type="text"
                        required
                        minLength={3}
                        maxLength={40}
                        autoComplete="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="alphanumeric_handle"
                        className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-[#94a3b8]">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-[11px] text-[#22d3ee] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    maxLength={72}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter password'}
                    className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-button bg-[#6366f1] text-white text-xs font-semibold hover:bg-[#6366f1]/90 shadow-[0_0_16px_rgba(99,102,241,0.45)] disabled:opacity-50 transition-all"
          >
            {submitting
              ? 'Processing...'
              : mfaChallengeToken
              ? 'Verify & Sign In'
              : mode === 'forgot'
              ? forgotRequested
                ? 'Complete Password Reset'
                : 'Request Reset Token'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>

          {localWorkstationAvailable && !mfaChallengeToken && mode !== 'forgot' && (
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setError(null);
                setSubmitting(true);
                try {
                  const res = await api.startWorkstationSession();
                  setUser(res.user);
                } catch (err) {
                  setError((err as Error).message || 'Local workstation session unavailable.');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#cbd5e1] text-xs font-medium transition-colors"
            >
              Continue in Local Workstation Mode (Loopback Only)
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
