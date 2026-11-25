'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Terminal,
  Plus
} from 'lucide-react';

interface AgentTask {
  id: string;
  name: string;
  goal: string;
  status: 'running' | 'done' | 'failed' | 'awaiting_auth';
  startedAt: string;
  steps: Array<{
    id: string;
    stepNumber: number;
    tool: string;
    input: string;
    status: 'running' | 'done' | 'failed' | 'awaiting_auth';
    output?: string;
    requiresAuth?: boolean;
  }>;
}

const INITIAL_AGENTS: AgentTask[] = [
  {
    id: 'agent-101',
    name: 'Sovereign Dual-DB Auditor',
    goal: 'Audit Chroma vector embeddings against SQLite chat transactions for zero-cloud air-gap integrity.',
    status: 'running',
    startedAt: '11:42:10 AM',
    steps: [
      {
        id: 's1',
        stepNumber: 1,
        tool: 'db_vector_scanner',
        input: 'target="./data/chroma", minConfidence=0.92',
        status: 'done',
        output: 'Discovered 1,420 vector records across 4 memory categories.'
      },
      {
        id: 's2',
        stepNumber: 2,
        tool: 'sandbox_code_executor',
        input: 'node -e "require(\'./scripts/verify_integrity.js\')"',
        status: 'awaiting_auth',
        requiresAuth: true
      },
      {
        id: 's3',
        stepNumber: 3,
        tool: 'file_writer',
        input: 'path="./reports/airgap_audit.json", format="pretty"',
        status: 'running'
      }
    ]
  },
  {
    id: 'agent-102',
    name: 'QLoRA Dataset Curate & Tokenize',
    goal: 'Filter Tapori dialect instructions and generate token length distribution chart.',
    status: 'done',
    startedAt: '10:30:15 AM',
    steps: [
      {
        id: 's1',
        stepNumber: 1,
        tool: 'jsonl_validator',
        input: 'path="./training/datasets/tapori_dataset.jsonl"',
        status: 'done',
        output: 'Verified 45 clean instruction pairs with strict zero-profanity constraints.'
      },
      {
        id: 's2',
        stepNumber: 2,
        tool: 'tokenizer_profiler',
        input: 'model="Qwen/Qwen2.5-3B-Instruct", max_seq_length=512',
        status: 'done',
        output: 'Tokenized successfully. Median length: 84 tokens, peak: 320 tokens.'
      }
    ]
  },
  {
    id: 'agent-103',
    name: 'Node.js Heap Memory Profiler',
    goal: 'Scan for EventEmitter leaks and unclosed stream readers.',
    status: 'done',
    startedAt: '09:15:00 AM',
    steps: [
      {
        id: 's1',
        stepNumber: 1,
        tool: 'v8_heap_snapshot_inspector',
        input: 'target="backend", duration="30s"',
        status: 'done',
        output: 'No uncollected listeners detected. LineBuffer cleanup confirmed.'
      }
    ]
  }
];

export function AgenticView() {
  const [agents, setAgents] = useState<AgentTask[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-101');
  const [newGoalInput, setNewGoalInput] = useState('');

  // Authorization Gate State
  const [activeAuthStep, setActiveAuthStep] = useState<{
    agentId: string;
    stepId: string;
    tool: string;
    input: string;
  } | null>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleAuthorize = (agentId: string, stepId: string) => {
    setAgents(prev =>
      prev.map(a => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          status: 'running',
          steps: a.steps.map(s => {
            if (s.id !== stepId) return s;
            return {
              ...s,
              status: 'done',
              output: 'Authorization granted by local developer. Process executed in isolated sandbox.'
            };
          })
        };
      })
    );
    setActiveAuthStep(null);
  };

  const handleReject = (agentId: string, stepId: string) => {
    setAgents(prev =>
      prev.map(a => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          status: 'failed',
          steps: a.steps.map(s => {
            if (s.id !== stepId) return s;
            return {
              ...s,
              status: 'failed',
              output: 'Authorization rejected by developer. Sandbox execution aborted.'
            };
          })
        };
      })
    );
    setActiveAuthStep(null);
  };

  const handleLaunchAgent = () => {
    if (!newGoalInput.trim()) return;
    const newAgent: AgentTask = {
      id: `agent-${Date.now().toString().slice(-4)}`,
      name: `Agent: ${newGoalInput.slice(0, 24)}...`,
      goal: newGoalInput.trim(),
      status: 'running',
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      steps: [
        {
          id: 's1',
          stepNumber: 1,
          tool: 'intent_decomposer',
          input: `goal="${newGoalInput.trim()}"`,
          status: 'done',
          output: 'Decomposed goal into 3 deterministic sub-steps.'
        },
        {
          id: 's2',
          stepNumber: 2,
          tool: 'local_silicon_executor',
          input: 'model="bantai-bhai", temp=0.6',
          status: 'running',
          output: 'Synthesizing intermediate representations...'
        }
      ]
    };
    setAgents(prev => [newAgent, ...prev]);
    setSelectedAgentId(newAgent.id);
    setNewGoalInput('');
  };

  return (
    <div className="flex-1 flex h-full bg-[#07070f] text-white font-sans overflow-hidden">
      {/* ============================================================== */}
      /* LEFT PANEL (280PX FIXED WIDTH): ACTIVE, QUEUED, COMPLETED AGENTS */
      /* ============================================================== */
      <div className="w-[280px] bg-[#07070f] border-r border-white/5 flex flex-col shrink-0 select-none">
        {/* Panel Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-[#6366f1]" />
            <span className="font-semibold text-xs tracking-tight text-white">Agent Runners</span>
          </div>
          <span className="telemetry-chip font-mono text-[10px]">{agents.length} Tasks</span>
        </div>

        {/* Create Agent Goal Input */}
        <div className="p-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newGoalInput}
              onChange={e => setNewGoalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLaunchAgent()}
              placeholder="Assign new agent goal..."
              className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
            />
            <button
              onClick={handleLaunchAgent}
              disabled={!newGoalInput.trim()}
              className="p-1.5 rounded-lg bg-[#6366f1] text-white hover:bg-[#6366f1]/90 disabled:opacity-40 transition-all shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {agents.map(agent => {
            const isSelected = agent.id === selectedAgentId;
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full text-left p-3 rounded-card transition-all flex flex-col gap-1.5 border ${
                  isSelected
                    ? 'bg-[#0f0f1a] border-[#6366f1]/40 shadow-[0_0_16px_-4px_rgba(99,102,241,0.35)]'
                    : 'bg-transparent border-transparent hover:bg-white/[0.03] text-[#94a3b8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white truncate max-w-[180px]">
                    {agent.name}
                  </span>
                  {/* Status Indicator */}
                  {agent.status === 'running' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />
                    </span>
                  )}
                  {agent.status === 'done' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  )}
                  {agent.status === 'awaiting_auth' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                  )}
                  {agent.status === 'failed' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]" />
                  )}
                </div>

                <p className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed">
                  {agent.goal}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b] pt-1">
                  <span>{agent.steps.length} steps</span>
                  <span>{agent.startedAt}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      /* RIGHT PANEL: SELECTED AGENT'S EXECUTION LOG (BUILD LOG STYLE)   */
      /* ============================================================== */
      <div className="flex-1 flex flex-col h-full bg-[#07070f] overflow-hidden">
        {/* Header Strip */}
        <div className="h-14 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#07070f]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{selectedAgent.name}</span>
              <span className="telemetry-chip font-mono text-[10px] uppercase">
                Status: {selectedAgent.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#64748b] truncate max-w-xl">{selectedAgent.goal}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#64748b]">Started: {selectedAgent.startedAt}</span>
          </div>
        </div>

        {/* Execution Steps Log (Terminal / Build Log Style) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-3">
            {selectedAgent.steps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.2 }}
                className={`p-4 rounded-card border ${
                  step.status === 'awaiting_auth'
                    ? 'bg-[#16162a] border-amber-500/40 shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)]'
                    : 'surface-raised border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center font-mono text-[10px] font-semibold text-[#6366f1]">
                      {step.stepNumber}
                    </span>
                    <span className="font-mono font-semibold text-xs text-white flex items-center gap-1.5">
                      <Terminal size={14} className="text-[#22d3ee]" />
                      {step.tool}
                    </span>
                  </div>

                  {step.status === 'done' && (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Completed
                    </span>
                  )}
                  {step.status === 'running' && (
                    <span className="text-[10px] font-mono text-[#22d3ee] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
                      Executing...
                    </span>
                  )}
                  {step.status === 'awaiting_auth' && (
                    <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Authorization Required
                    </span>
                  )}
                  {step.status === 'failed' && (
                    <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                      <XCircle size={12} />
                      Aborted
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="text-[#64748b] text-[11px]">
                    <span className="text-[#94a3b8]">Input:</span> {step.input}
                  </div>

                  {step.output && (
                    <div className="p-2.5 rounded-lg bg-[#07070f] border border-white/5 text-[#cbd5e1] text-[11px] leading-relaxed">
                      <span className="text-emerald-400 font-semibold">[Output]:</span> {step.output}
                    </div>
                  )}

                  {/* Auth Gate Inline Trigger */}
                  {step.status === 'awaiting_auth' && (
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() =>
                          setActiveAuthStep({
                            agentId: selectedAgent.id,
                            stepId: step.id,
                            tool: step.tool,
                            input: step.input
                          })
                        }
                        className="px-3 py-1.5 rounded-button bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      >
                        <ShieldAlert size={14} />
                        <span>Review & Authorize Tool</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      /* AUTHORIZATION GATE MODAL                                       */
      /* ============================================================== */
      <AnimatePresence>
        {activeAuthStep && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg surface-floating border border-amber-500/40 p-6 space-y-5 shadow-[0_0_35px_-5px_rgba(245,158,11,0.35)]"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Security Authorization Gate</h3>
                  <p className="text-xs text-[#94a3b8]">Step requires human-in-the-loop developer approval</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-mono text-[#64748b] uppercase tracking-wider text-[10px]">Tool:</span>
                  <div className="text-white font-mono font-semibold text-sm mt-0.5">{activeAuthStep.tool}</div>
                </div>

                <div>
                  <span className="font-mono text-[#64748b] uppercase tracking-wider text-[10px]">Scope:</span>
                  <div className="text-[#e2e8f0] mt-0.5">Executes sandboxed instructions on the local filesystem.</div>
                </div>

                <div>
                  <span className="font-mono text-[#64748b] uppercase tracking-wider text-[10px]">Exact Parameters:</span>
                  <pre className="p-3 mt-1 rounded-lg bg-[#07070f] border border-white/5 text-[#22d3ee] font-mono text-[11px] overflow-x-auto">
                    {activeAuthStep.input}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => handleReject(activeAuthStep.agentId, activeAuthStep.stepId)}
                  className="px-4 py-2 rounded-button bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-medium text-xs border border-rose-500/30 transition-colors"
                >
                  Reject & Abort
                </button>
                <button
                  onClick={() => handleAuthorize(activeAuthStep.agentId, activeAuthStep.stepId)}
                  className="px-4 py-2 rounded-button bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-medium text-xs shadow-[0_0_16px_rgba(99,102,241,0.5)] transition-all"
                >
                  Authorize Execution
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
