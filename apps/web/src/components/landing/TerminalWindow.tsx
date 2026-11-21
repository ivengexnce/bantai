'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandOutput {
  command: string;
  lines: Array<{
    type: 'info' | 'success' | 'warning' | 'data' | 'system';
    text: string;
  }>;
  executionMs: number;
}

const PRESET_COMMANDS: Record<string, CommandOutput> = {
  'bantai run qwen2.5:7b --mode=tapori': {
    command: 'bantai run qwen2.5:7b --mode=tapori',
    executionMs: 14,
    lines: [
      { type: 'system', text: '[BANTAI ENGINE] Initializing sovereign inference pipeline on local GPU...' },
      { type: 'info', text: 'Hardware: Local CUDA/DirectML core detected | VRAM allocated: 5.8 GB' },
      { type: 'success', text: 'Model weights loaded: qwen2.5:7b-bantai (Q4_K_M) - 0 external network calls' },
      { type: 'data', text: 'BANTAI: "Sahi pakde ho bantai! Apun ka model 100% on-device execute ho raha hai."' },
      { type: 'data', text: 'BANTAI: "Zero cloud API leak, zero surveillance. Bol bhidu, kya kaam phodna hai?"' },
      { type: 'success', text: 'Token throughput: 44.8 tok/s | Latency to first token: 18ms | Egress: 0 bytes' }
    ]
  },
  'bantai agent plan "Audit database airgap"': {
    command: 'bantai agent plan "Audit database airgap"',
    executionMs: 22,
    lines: [
      { type: 'system', text: '[AGENT PLANNER] Decomposing task into 3 verifiable execution steps...' },
      { type: 'info', text: 'Step 1: Inspect MongoDB connection string and verify Collection("users") isolation' },
      { type: 'success', text: 'Step 1 complete: MongoDB credentials restricted to bcrypt salted user hashes' },
      { type: 'info', text: 'Step 2: Inspect Firebase Firestore driver and test chat history encryption' },
      { type: 'success', text: 'Step 2 complete: Firestore isolated strictly to stateful telemetry and vectors' },
      { type: 'info', text: 'Step 3: Run egress packet tracer against external AI endpoint domains' },
      { type: 'success', text: 'Step 3 complete: Zero outbound HTTP packets detected. Strict airgap verified' }
    ]
  },
  'bantai rag query "Rayleigh scattering"': {
    command: 'bantai rag query "Rayleigh scattering"',
    executionMs: 9,
    lines: [
      { type: 'system', text: '[RAG RETRIEVER] Querying local 384-dimensional vector index via BGE-small...' },
      { type: 'info', text: 'Generating query embedding vector on local CPU (latency: 4ms)...' },
      { type: 'success', text: 'Found 2 matching passages with Cosine Similarity > 0.88' },
      { type: 'data', text: 'Passage 01: "Scattering intensity is inversely proportional to lambda^4 (I ~ 1/lambda^4)."' },
      { type: 'data', text: 'BANTAI: "Chhoti wavelength wali blue light hawa ke gas molecules se charo taraf bikharti hai!"' },
      { type: 'success', text: 'Source attributed: physics_reference_docs/optics.md (100% on-premise memory)' }
    ]
  },
  'bantai db status --verify-isolation': {
    command: 'bantai db status --verify-isolation',
    executionMs: 11,
    lines: [
      { type: 'system', text: '[SECURITY AUDIT] Executing dual-database air-gap verification routine...' },
      { type: 'success', text: 'MongoDB Layer: OK (Local store: users, authentication hashes, JWT secrets)' },
      { type: 'success', text: 'Firestore Layer: OK (Project bantai-369: conversations, tasks, reminders, vectors)' },
      { type: 'success', text: 'Data Leakage Protection: ACTIVE (0 external API egress channels configured)' },
      { type: 'info', text: 'All security invariant rules passing (520 CEL rules verified in firestore.rules)' }
    ]
  }
};

export function TerminalWindow() {
  const [currentCmdKey, setCurrentCmdKey] = useState<string>(
    'bantai run qwen2.5:7b --mode=tapori'
  );
  const [inputVal, setInputVal] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const activeOutput = PRESET_COMMANDS[currentCmdKey] || {
    command: currentCmdKey,
    executionMs: 15,
    lines: [
      { type: 'system', text: `[BANTAI CLI] Processing command: ${currentCmdKey}` },
      { type: 'success', text: 'Execution completed on sovereign local node.' },
      { type: 'info', text: 'Data perimeter: On-premise | Third-party cloud calls: 0' }
    ]
  };

  const handleCopy = () => {
    const textToCopy = [
      `$ ${activeOutput.command}`,
      ...activeOutput.lines.map(l => l.text)
    ].join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setCurrentCmdKey(inputVal.trim());
    setInputVal('');
  };

  return (
    <div className="w-full rounded-2xl border border-[#2b3648] bg-[#111620] overflow-hidden text-xs font-mono transition-all duration-200">
      {/* Title Bar */}
      <div className="px-4 py-3 bg-[#151c28] border-b border-[#242e3f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#eab308] inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block" />
          <span className="ml-2 text-[#94a3b8] text-[11px] font-bold">
            bash - bantai-cli v1.0.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            LOCAL SILICON ACTIVE
          </span>
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded-md text-[10px] uppercase font-bold text-[#94a3b8] hover:text-[#f0f2f5] hover:bg-[#1f2937] border border-[#2b3648] transition-colors flex items-center gap-1"
            title="Copy terminal output"
          >
            {copied ? (
              <span className="text-emerald-400">COPIED</span>
            ) : (
              <>
                <svg className="w-3 h-3 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>COPY</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Command Pills */}
      <div className="px-4 py-2.5 bg-[#0f141d] border-b border-[#242e3f] flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-[#64748b] uppercase text-[10px] shrink-0 font-bold">PRESETS:</span>
        {Object.keys(PRESET_COMMANDS).map((cmd, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentCmdKey(cmd)}
            className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap text-[10px] uppercase font-bold border ${
              currentCmdKey === cmd
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'bg-[#151c28] text-[#94a3b8] hover:text-[#f0f2f5] border-[#242e3f] hover:border-[#334155]'
            }`}
          >
            [{idx + 1}] {cmd.split(' ')[1]} {cmd.split(' ')[2] || ''}
          </button>
        ))}
      </div>

      {/* Terminal Body */}
      <div className="p-4 space-y-3 min-h-[220px]">
        {/* Command Line */}
        <div className="flex items-center gap-2 text-[#f0f2f5]">
          <span className="text-emerald-400 font-bold">operator@bantai-node</span>
          <span className="text-[#64748b]">:</span>
          <span className="text-sky-400 font-bold">~</span>
          <span className="text-[#94a3b8]">$</span>
          <span className="text-amber-400 font-bold">{activeOutput.command}</span>
        </div>

        {/* Output lines */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCmdKey}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5 pt-1 text-[11px]"
          >
            {activeOutput.lines.map((line, idx) => {
              let textClass = 'text-[#94a3b8]';
              let badge = null;

              if (line.type === 'system') {
                textClass = 'text-[#64748b]';
              } else if (line.type === 'success') {
                textClass = 'text-emerald-300';
                badge = (
                  <svg className="w-3.5 h-3.5 text-emerald-400 inline shrink-0 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                );
              } else if (line.type === 'data') {
                textClass = 'text-[#f0f2f5] bg-[#161d2b] px-3 py-1.5 rounded-md border border-[#242e3f] block';
              } else if (line.type === 'info') {
                textClass = 'text-sky-300';
              }

              return (
                <div key={idx} className={`leading-relaxed flex items-start ${textClass}`}>
                  {badge}
                  <span>{line.text}</span>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Interactive Custom Input */}
        <form onSubmit={handleSubmit} className="pt-2 border-t border-[#1f2937] flex items-center gap-2">
          <span className="text-emerald-400 font-bold">operator@bantai-node:~$</span>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Type custom command and press enter..."
            className="flex-1 bg-transparent border-0 text-xs text-[#f0f2f5] placeholder-[#64748b] focus:outline-none font-mono"
          />
          <button
            type="submit"
            className="px-2 py-0.5 rounded text-[10px] font-bold text-black bg-amber-500 hover:bg-amber-400 uppercase tracking-wider"
          >
            RUN
          </button>
        </form>
      </div>

      {/* Terminal Footer Info */}
      <div className="px-4 py-2 bg-[#0f141d] border-t border-[#242e3f] flex items-center justify-between text-[10px] text-[#64748b]">
        <span>LOCAL COMPUTE: ON-PREMISE DAEMON (PORT 4000)</span>
        <span>LATENCY: {activeOutput.executionMs}ms · EGRESS: 0 BYTES</span>
      </div>
    </div>
  );
}
