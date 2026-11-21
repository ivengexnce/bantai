'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Sparkles, LogIn, UserPlus } from 'lucide-react';

export function AuthModal() {
  const { setUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        setUser(res.user);
      } else {
        const res = await api.signup({ email, password, name, username });
        setUser(res.user);
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setLoading(true);
    try {
      const res = await api.googleAuth('google_oauth_token_' + Date.now());
      setUser(res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoEmail = 'bantaidemo@bantai.ai';
      const demoPass = 'BantaiDemo2026!';
      try {
        const res = await api.login({ email: demoEmail, password: demoPass });
        setUser(res.user);
      } catch {
        const res = await api.signup({
          email: demoEmail,
          password: demoPass,
          name: 'Bantai Explorer',
          username: `bantaidemo_${Date.now().toString().slice(-4)}`
        });
        setUser(res.user);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 mb-3 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">BANTAI</h1>
          <p className="text-xs font-semibold text-bantai-400 uppercase tracking-widest mt-0.5">
            Apna Model. Apna Dimaag. Apna AI.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            100% Self-Hosted. Zero Third-Party AI APIs. Mumbai Swag.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <div className="flex border-b border-bantai-darkBorder mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              isLogin ? 'border-bantai-500 text-bantai-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              !isLogin ? 'border-bantai-500 text-bantai-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Munna Bhai"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-sm text-white focus:outline-none focus:border-bantai-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="munnabhai"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-sm text-white focus:outline-none focus:border-bantai-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="bantai@example.com"
              className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-sm text-white focus:outline-none focus:border-bantai-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-sm text-white focus:outline-none focus:border-bantai-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-bantai-500 hover:bg-bantai-600 disabled:opacity-50 text-black font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-bantai-500/20"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" /> Sign In to BANTAI
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Create BANTAI Account
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-bantai-darkBorder" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-bantai-darkCard px-2 text-gray-500">Or continue with</span></div>
        </div>

        <div className="space-y-2 mt-4">
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-bantai-500/40 text-bantai-300 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-bantai-400" />
            Instant Guest Demo Access (One Click)
          </button>

          <button
            type="button"
            onClick={handleGoogleMock}
            disabled={loading}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-bantai-darkBorder text-gray-200 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Continue with Google OAuth
          </button>
        </div>
      </div>
    </div>
  );
}
