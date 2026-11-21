'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { AgentExecutionPlan } from '@bantai/shared';
import {
  Cpu,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Calculator,
  Search,
  Database,
  FileText,
  Calendar,
  Mail,
  CheckSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Layers
} from 'lucide-react';

const PRESET_GOALS = [
  'Analyze project documents, compute cost variance, and schedule a review reminder',
  'Retrieve pending tasks and draft an execution plan for today',
  'Execute a sandboxed Node.js data transformation script and verify the output',
  'Search personal knowledge base for architecture notes and extract key recommendations'
];

const TOOL_ICONS: Record<string, React.ReactNode> = {
  calculator: <Calculator className="w-4 h-4 text-emerald-400" />,
  document_reader: <FileText className="w-4 h-4 text-blue-400" />,
  file_search: <Search className="w-4 h-4 text-sky-400" />,
  database_retrieval: <Database className="w-4 h-4 text-purple-400" />,
  rag_retrieval: <Layers className="w-4 h-4 text-indigo-400" />,
  sandbox_code_executor: <Terminal className="w-4 h-4 text-amber-400" />,
  task_manager: <CheckSquare className="w-4 h-4 text-green-400" />,
  reminder_scheduler: <Clock className="w-4 h-4 text-cyan-400" />,
  calendar_connector: <Calendar className="w-4 h-4 text-orange-400" />,
  email_connector: <Mail className="w-4 h-4 text-rose-400" />
};

export function AgenticView() {
  const [goal, setGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activePlan, setActivePlan] = useState<AgentExecutionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePlan = async (targetGoal?: string) => {
    const text = (targetGoal || goal).trim();
    if (!text || isPlanning) return;

    setIsPlanning(true);
    setError(null);
    try {
      const plan = await api.createAgentPlan(text);
      setActivePlan(plan);
      // If no steps require approval upfront, trigger execution automatically
      const needsApprovalNow = plan.steps.some(
        (s: any, idx: number) => idx === 0 && s.requiresApproval
      );
      if (!needsApprovalNow && plan.steps.length > 0) {
        handleExecutePlan(plan.planId);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to create plan');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecutePlan = async (planId: string) => {
    setIsExecuting(true);
    setError(null);
    try {
      const updatedPlan = await api.executeAgentPlan(planId);
      setActivePlan(updatedPlan);
    } catch (err) {
      setError((err as Error).message || 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApproveStep = async (stepIndex: number, approved: boolean) => {
    if (!activePlan) return;
    setIsExecuting(true);
    try {
      const updated = await api.approveAgentStep(activePlan.planId, stepIndex, approved);
      setActivePlan(updated);
      // If approved, continue executing remaining steps
      if (approved && updated.status !== 'completed' && updated.status !== 'failed') {
        const next = await api.executeAgentPlan(activePlan.planId);
        setActivePlan(next);
      }
    } catch (err) {
      setError((err as Error).message || 'Step approval failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bantai-500/10 border border-bantai-500/30 text-xs font-semibold text-bantai-400 mb-2">
            <Cpu className="w-3.5 h-3.5" /> BANTAI Autonomous Agentic Engine
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Multi-Step Goal Planner & Tool Executor
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            BANTAI breaks high-level goals into ordered execution plans, selects deterministic tools, and strictly halts for human authorization on sensitive operations.
          </p>
        </div>

        {error ? (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        ) : null}

        {/* Goal Input Card */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl shadow-xl space-y-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Define Objective / Multi-Step Task
          </label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="E.g., Read project documentation, execute calculation in sandbox, and schedule a task reminder..."
              className="flex-1 bg-black/40 border border-bantai-darkBorder rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500 resize-none"
            />
            <button
              onClick={() => handleCreatePlan()}
              disabled={!goal.trim() || isPlanning}
              className="px-6 bg-bantai-500 hover:bg-bantai-600 disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-bantai-500/20"
            >
              {isPlanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Planning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Plan
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-gray-400 mb-2">Example Agentic Prompts:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRESET_GOALS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setGoal(preset);
                    handleCreatePlan(preset);
                  }}
                  className="text-left p-2.5 bg-white/5 hover:bg-white/10 border border-bantai-darkBorder rounded-xl text-xs text-gray-300 hover:text-white transition flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{preset}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-bantai-400 flex-shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Plan Execution Visualizer */}
        {activePlan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">Plan ID:</span>
                  <code className="text-[11px] text-bantai-400 font-mono">{activePlan.planId.slice(0, 8)}...</code>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    activePlan.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : activePlan.status === 'waiting_approval'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : activePlan.status === 'executing'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {activePlan.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{activePlan.goal}</h3>
              </div>

              {activePlan.status === 'waiting_approval' ? (
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 animate-bounce" /> Action Blocked: Authorization Needed
                </div>
              ) : null}
            </div>

            {/* Plan Steps */}
            <div className="space-y-3">
              {activePlan.steps.map((step: any, idx: number) => {
                const isStepActive = idx === activePlan.currentStepIndex;
                const isCompleted = step.status === 'completed';
                const isWaitingApproval = step.status === 'pending' && Boolean(step.requiresApproval);

                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition ${
                      isWaitingApproval
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5'
                        : isCompleted
                        ? 'bg-bantai-darkCard border-emerald-500/30'
                        : isStepActive
                        ? 'bg-bantai-darkCard border-bantai-500/50 shadow-md'
                        : 'bg-bantai-darkCard/50 border-bantai-darkBorder opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5 ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isWaitingApproval
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-white/10 text-gray-300 border border-white/10'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{step.action}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/50 border border-white/10 rounded-md text-[10px] font-mono text-gray-300">
                              {TOOL_ICONS[step.toolName] || <Cpu className="w-3 h-3 text-gray-400" />}
                              {step.toolName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{step.rationale}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {step.requiresApproval ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            <ShieldAlert className="w-3 h-3" /> Requires Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Auto-Authorized
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Human In The Loop Gate UI */}
                    {isWaitingApproval ? (
                      <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-amber-200">
                          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <span>
                            <strong>Security Checkpoint:</strong> This step triggers <code>{step.toolName}</code>. Do you authorize BANTAI to execute this step?
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApproveStep(step.stepIndex, false)}
                            disabled={isExecuting}
                            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-lg transition"
                          >
                            Reject & Skip
                          </button>
                          <button
                            onClick={() => handleApproveStep(step.stepIndex, true)}
                            disabled={isExecuting}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition shadow-md shadow-amber-500/20"
                          >
                            {isExecuting ? 'Executing...' : 'Approve & Execute'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Step Result Output */}
                    {step.result ? (
                      <div className="mt-3 p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
                        <div className="text-[10px] text-gray-500 font-sans uppercase font-bold tracking-wider mb-1">
                          Verified Execution Evidence:
                        </div>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(step.result, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 10 Tools Registry Reference Table */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-bantai-400" /> Sandboxed Tool Registry (10 Tools)
            </h2>
            <span className="text-[11px] text-gray-500">Zero unverified outputs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { name: 'calculator', desc: 'Deterministic math parser. No LLM hallucinations.', safe: true },
              { name: 'document_reader', desc: 'Read uploaded text files and PDF extracts by docId.', safe: true },
              { name: 'file_search', desc: 'Keyword search across the personal knowledge base.', safe: true },
              { name: 'database_retrieval', desc: 'Query tasks, reminders, calendar, and memories.', safe: true },
              { name: 'rag_retrieval', desc: '384-dimensional cosine similarity search over local vector chunks.', safe: true },
              { name: 'sandbox_code_executor', desc: 'Isolated Node.js VM with CPU/memory limits. Requires human approval.', safe: false },
              { name: 'task_manager', desc: 'Create, update, and complete personal tasks.', safe: true },
              { name: 'reminder_scheduler', desc: 'Schedule verified notifications with timezone awareness.', safe: true },
              { name: 'calendar_connector', desc: 'Conflict detection and schedule management.', safe: true },
              { name: 'email_connector', desc: 'Search and draft emails. Sending requires explicit user authorization.', safe: false }
            ].map(tool => (
              <div key={tool.name} className="p-3 bg-black/30 border border-bantai-darkBorder rounded-xl flex items-start gap-2.5">
                <div className="mt-0.5">{TOOL_ICONS[tool.name] || <Cpu className="w-4 h-4" />}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-bantai-300 font-semibold">{tool.name}</code>
                    {tool.safe ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Safe</span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Needs Gate</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
