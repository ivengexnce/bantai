'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveModel } from '../../lib/models';

export function GlassIrisTopBar() {
  const {
    user,
    activeView,
    personalityMode,
    selectedModel,
    setSelectedModel
  } = useApp();

  const [searchVal, setSearchVal] = useState('');
  const currentModel = resolveModel(selectedModel);

  return (
    <header className="h-14 border-b border-white/5 bg-[#121212]/75 backdrop-blur-md px-5 flex items-center justify-between z-30 select-none shrink-0">
      {/* Left: Back / Forward & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-1 text-[#6E6E6E]">
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#1D1D1D] hover:text-white transition-colors"
            title="Navigate Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#1D1D1D] hover:text-white transition-colors"
            title="Navigate Forward"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="text-[#6E6E6E]">Home</span>
          <span className="text-[#3E3E3E]">/</span>
          <span className="text-[#8C8C8C] font-medium">BANTAI</span>
          <span className="text-[#3E3E3E]">/</span>
          <span className="text-[#2F6BFF] font-medium capitalize">{personalityMode} Mode</span>
        </div>
      </div>

      {/* Center: Search Field */}
      <div className="flex-1 max-w-sm mx-4">
        <div className="relative flex items-center">
          <svg className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search Anything..."
            className="w-full bg-[#1A1A1A] border border-white/5 focus:border-[#2F6BFF]/40 text-xs text-white placeholder-[#6E6E6E] pl-8 pr-12 py-1.5 rounded-lg focus:outline-none transition-colors"
          />
          <div className="absolute right-2 px-1.5 py-0.5 rounded bg-[#252525] border border-white/5 text-[10px] text-[#8C8C8C] font-mono pointer-events-none">
            ⌘K
          </div>
        </div>
      </div>

      {/* Right: Notifications & Model Spec Badge */}
      <div className="flex items-center gap-3">
        {/* Model Spec Selector Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#181818] border border-white/5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#2F6BFF] animate-pulse" />
          <span className="text-white font-medium">{currentModel.name}</span>
          <span className="text-[#6E6E6E]">·</span>
          <span className="text-[#8C8C8C]">{currentModel.parameters}</span>
        </div>

        {/* Notification Icon */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C8C8C] hover:text-white hover:bg-[#1D1D1D] transition-colors relative"
          title="Notifications"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />
        </button>

        {/* User Avatar Mini */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#2F6BFF] to-[#7C48F0] p-[1px]">
          <div className="w-full h-full rounded-full bg-[#181818] flex items-center justify-center text-[11px] font-semibold text-white">
            {(user?.name || 'Meet').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
