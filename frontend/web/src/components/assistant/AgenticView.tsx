'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { AgentExecutionPlan, AgentPlanStep } from '@bantai/shared';
import {
  Bot,
  Play,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Clock,
  Wrench,
  Terminal,
  AlertCircle
} from 'lucide-react';

const PRESET_GOALS = [
  'Create a task to review BANTAI quarterly security audit and schedule a reminder for tomorrow',
  'Send an email status update to team@bantai.local summarizing local model benchmarks',
  'Calculate SLA uptime for 43200 minutes minus 12 minutes downtime'
];

function stepStatusBadge(status: AgentPlanStep['status']) {
  switch (status) {
    case 'completed':
      return 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30';
    case 'in_progress':
    case 'approved':
      return 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30';
    case 'failed':
      return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30';
    case 'skipped':
      return 'bg-white/10 text-[#94a3b8] border-white/15';
    default:
      return 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30';
  }
}

function planStatusBadge(status: AgentExecutionPlan['status']) {
  switch (status) {
    case 'completed':
      return 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30';
    case 'waiting_approval':
      return 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30';
    case 'executing':
      return 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30';
    case 'failed':
      return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30';
    default:
      return 'bg-[#6366f1]/15 text-[#818cf8] border-[#6366f1]/30';
  }
}

export function AgenticView() {
  const { activeConversationId } = useApp();
  const [goalInput, setGoalInput] = useState('');
  const [plans, setPlans] = useState<AgentExecutionPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePlan = plans.find(p => p.planId === activePlanId) || plans[0] || null;

  const upsertPlan = (updated: AgentExecutionPlan) => {
    setPlans(prev => {
      const exists = prev.some(p => p.planId === updated.planId);
      if (exists) {
        return prev.map(p => (p.planId === updated.planId ? updated : p));
      }
      return [updated, ...prev];
    });
    setActivePlanId(updated.planId);
  };

  const handleCreateAndRun = async (e?: React.FormEvent, customGoal?: string) => {
    e?.preventDefault();
    const goal = (customGoal ?? goalInput).trim();
    if (!goal || isPlanning || isExecuting) return;

    setErrorMsg(null);
    setIsPlanning(true);
    try {
      const created = await api.createAgentPlan(goal, activeConversationId || undefined);
      upsertPlan(created);
      if (!customGoal) setGoalInput('');

      // Immediately run safe non-gated steps until completion or first approval gate
      setIsPlanning(false);
      setIsExecuting(true);
      const progressed = await api.executeAgentPlan(created.planId);
      upsertPlan(progressed);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to plan or execute agent workflow.');
    } finally {
      setIsPlanning(false);
      setIsExecuting(false);
    }
  };

  const handleExecutePending = async (planId: string) => {
    setErrorMsg(null);
    setIsExecuting(true);
    try {
      const updated = await api.executeAgentPlan(planId);
      upsertPlan(updated);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to execute agent plan.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApproveStep = async (planId: string, stepIndex: number, approved: boolean) => {
    setErrorMsg(null);
    setIsExecuting(true);
    try {
      const updated = await api.approveAgentStep(planId, stepIndex, approved);
      upsertPlan(updated);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to submit step decision.');
    } finally {
      setIsExecuting(false);
    }
  };

  const pendingApprovalStep =
    activePlan?.steps.find(
      s => s.requiresApproval && s.status === 'pending'
    ) || null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07070f] text-white p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot size={18} className="text-[#6366f1]" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Autonomous Agent Planner
              </h2>
            </div>
            <p className="text-xs text-[#64748b]">
              Live backend plan generation with human-in-the-loop approval gates for sensitive actions.
            </p>
          </div>

          <div className="telemetry-chip shrink-0">
            <Wrench size={12} className="text-[#22d3ee]" />
            <span>Runtime: Backend Tool Registry</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Goal Submission Form */}
        <form onSubmit={handleCreateAndRun} className="surface-raised p-4 sm:p-5 space-y-3">
          <label htmlFor="agent-goal-input" className="block text-xs font-semibold text-[#94a3b8]">
            Define an Agent Objective
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="agent-goal-input"
              type="text"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="e.g., Create a checklist task for security review and calculate uptime SLA"
              className="flex-1 bg-[#07070f] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
            />
            <button
              type="submit"
              disabled={!goalInput.trim() || isPlanning || isExecuting}
              className="px-4 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              {isPlanning || isExecuting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isPlanning ? 'Planning...' : 'Running...'}</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Plan &amp; Execute</span>
                </>
              )}
            </button>
          </div>

          {/* Preset Prompts */}
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_GOALS.map(preset => (
              <button
                key={preset}
                type="button"
                disabled={isPlanning || isExecuting}
                onClick={() => handleCreateAndRun(undefined, preset)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[#94a3b8] hover:text-white transition-colors text-left"
              >
                <Sparkles size={10} className="inline mr-1 text-[#22d3ee]" />
                {preset}
              </button>
            ))}
          </div>
        </form>

        {/* Active Plan & Session Plan Selector */}
        {plans.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-mono text-[#64748b] shrink-0">Session Plans:</span>
            {plans.map(p => (
              <button
                key={p.planId}
                type="button"
                onClick={() => setActivePlanId(p.planId)}
                className={`px-3 py-1 rounded-lg text-xs border transition-colors shrink-0 ${
                  p.planId === activePlan?.planId
                    ? 'bg-[#6366f1]/20 border-[#6366f1]/50 text-white'
                    : 'bg-[#0f0f1a] border-white/10 text-[#94a3b8] hover:text-white'
                }`}
              >
                {p.goal.slice(0, 32)}{p.goal.length > 32 ? '...' : ''}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activePlan ? (
            <motion.div
              key={activePlan.planId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Plan Summary Bar */}
              <div className="surface-raised p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${planStatusBadge(activePlan.status)}`}>
                      {activePlan.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-[#64748b]">
                      ID: {activePlan.planId.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white break-words">{activePlan.goal}</p>
                </div>

                {(activePlan.status === 'planning' || activePlan.status === 'waiting_approval') && !pendingApprovalStep && (
                  <button
                    type="button"
                    disabled={isExecuting}
                    onClick={() => handleExecutePending(activePlan.planId)}
                    className="px-3.5 py-2 rounded-lg bg-[#22d3ee]/15 hover:bg-[#22d3ee]/25 border border-[#22d3ee]/40 text-[#22d3ee] text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <Play size={13} />
                    <span>Resume Execution</span>
                  </button>
                )}
              </div>

              {/* Human-in-the-Loop Authorization Gate Banner */}
              {pendingApprovalStep && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/40 space-y-3 shadow-[0_0_24px_-6px_rgba(245,158,11,0.35)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#f59e0b]">
                      <ShieldAlert size={18} />
                      <h3 className="text-sm font-bold">Authorization Gate Required</h3>
                    </div>
                    <span className="text-[11px] font-mono text-[#fbbf24]">
                      Step #{pendingApprovalStep.stepIndex + 1} · {pendingApprovalStep.toolName}
                    </span>
                  </div>

                  <p className="text-xs text-[#fde68a]">
                    {pendingApprovalStep.rationale}
                  </p>

                  <pre className="p-3 rounded-xl bg-[#07070f] border border-white/10 text-[11px] font-mono text-[#22d3ee] overflow-x-auto">
                    {JSON.stringify(pendingApprovalStep.arguments, null, 2)}
                  </pre>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => handleApproveStep(activePlan.planId, pendingApprovalStep.stepIndex, true)}
                      className="px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve &amp; Execute Step</span>
                    </button>
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => handleApproveStep(activePlan.planId, pendingApprovalStep.stepIndex, false)}
                      className="px-4 py-2 rounded-lg bg-[#ef4444]/20 hover:bg-[#ef4444]/30 border border-[#ef4444]/40 disabled:opacity-50 text-[#fca5a5] text-xs font-semibold flex items-center gap-1.5"
                    >
                      <XCircle size={14} />
                      <span>Reject / Skip</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Execution Step List */}
              <div className="space-y-3">
                {activePlan.steps.map(step => (
                  <div
                    key={step.stepIndex}
                    className="surface-raised p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#16162a] border border-white/10 text-[11px] font-mono flex items-center justify-center text-[#94a3b8]">
                          {step.stepIndex + 1}
                        </span>
                        <span className="text-sm font-semibold text-white">{step.action}</span>
                        <span className="telemetry-chip">
                          <Terminal size={11} className="text-[#22d3ee]" />
                          {step.toolName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {step.requiresApproval && (
                          <span className="text-[10px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2 py-0.5 rounded-full">
                            Approval Required
                          </span>
                        )}
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${stepStatusBadge(step.status)}`}>
                          {step.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#94a3b8]">{step.rationale}</p>

                    {step.result !== undefined && (
                      <div className="p-2.5 rounded-lg bg-[#07070f] border border-white/5 text-[11px] font-mono text-[#10b981] overflow-x-auto">
                        {typeof step.result === 'string'
                          ? step.result
                          : JSON.stringify(step.result, null, 2)}
                      </div>
                    )}

                    {step.error && (
                      <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[11px] font-mono text-[#fca5a5]">
                        Error: {step.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="surface-raised p-10 text-center space-y-2">
              <Clock size={28} className="mx-auto text-[#64748b]" />
              <p className="text-sm font-medium text-white">No agent execution plan active</p>
              <p className="text-xs text-[#64748b] max-w-md mx-auto">
                Enter an objective above or pick a preset workflow to inspect generated backend tool steps and approval gates.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
