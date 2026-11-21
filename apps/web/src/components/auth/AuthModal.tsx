'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export function AuthModal() {
  const { setUser, setActiveView } = useApp();
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
        setActiveView('chat');
      } else {
        const res = await api.signup({ email, password, name, username });
        setUser(res.user);
        setActiveView('chat');
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
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
        setActiveView('chat');
      } catch {
        const res = await api.signup({
          email: demoEmail,
          password: demoPass,
          name: 'Bantai Explorer',
          username: `bantaidemo_${Date.now().toString().slice(-4)}`
        });
        setUser(res.user);
        setActiveView('chat');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0e1014] border border-[#2b303c] p-6 text-[#d4d6db] font-mono text-xs select-none">
      {/* 1. Header Specification */}
      <div className="border-b border-[#20232b] pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#cc8e25] font-bold uppercase tracking-widest">
            [SECURITY AUTHENTICATION GATEWAY]
          </span>
          <span className="text-[10px] text-[#10b981]">
            [ZERO CLOUD EGRESS]
          </span>
        </div>
        <h2 className="text-lg font-bold text-[#f0f2f5] tracking-tight uppercase">
          BANTAI CORE OPERATOR ACCESS
        </h2>
        <p className="text-[11px] text-[#8c919e] mt-1">
          Credentials hashed locally with bcrypt. Identity isolated in local MongoDB.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-2.5 bg-[#181012] border border-red-500/50 text-red-400 text-[11px]">
          [ERROR]: {error}
        </div>
      )}

      {/* 2. Mode Toggle: Sign In vs Create Account */}
      <div className="flex border border-[#20232b] mb-4 bg-[#12141a]">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(null); }}
          className={`flex-1 py-2 text-[11px] font-bold uppercase transition-colors ${
            isLogin ? 'bg-[#cc8e25] text-black' : 'text-[#8c919e] hover:text-[#f0f2f5]'
          }`}
        >
          [01] Sign In
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(null); }}
          className={`flex-1 py-2 text-[11px] font-bold uppercase transition-colors ${
            !isLogin ? 'bg-[#cc8e25] text-black' : 'text-[#8c919e] hover:text-[#f0f2f5]'
          }`}
        >
          [02] Create Identity
        </button>
      </div>

      {/* 3. Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isLogin && (
          <>
            <div>
              <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[OPERATOR NAME]</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Munna Bhai"
                className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[OPERATOR USERNAME]</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="munnabhai"
                className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[EMAIL ADDRESS]</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="operator@bantai.local"
            className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[ACCESS KEY / PASSWORD]</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 bg-[#cc8e25] hover:bg-[#b06f1d] disabled:opacity-50 text-black font-bold uppercase tracking-wider text-xs transition-colors"
        >
          {loading ? '[VERIFYING ENCRYPTED IDENTITY...]' : isLogin ? '[AUTHENTICATE OPERATOR]' : '[PROVISION OPERATOR RECORD]'}
        </button>
      </form>

      {/* 4. Instant Demo Initializer */}
      <div className="pt-4 mt-4 border-t border-[#20232b] space-y-2">
        <button
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          className="w-full py-2 bg-[#181b22] hover:bg-[#20242f] border border-[#2b303c] text-[#f0f2f5] text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          &gt; INITIALIZE INSTANT DEMO INSTANCE
        </button>

        <div className="text-[10px] text-[#5a6070] text-center pt-1">
          MONGODB PORT 27017 · ZERO TELEMETRY EGRESS
        </div>
      </div>
    </div>
  );
}
