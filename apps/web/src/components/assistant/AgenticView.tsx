'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { AgentExecutionPlan } from '@bantai/shared';

const PRESET_GOALS = [
  'Analyze project documents, compute cost variance, and schedule a review reminder',
  'Retrieve pending tasks and draft an execution plan for today',
  'Execute a sandboxed Node.js data transformation script and verify the output',
  'Search personal knowledge base for architecture notes and extract key recommendations'
];

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
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 1. Header Specification */}
        <div className="border-b border-[#20232b] pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-[#cc8e25] inline-block" />
            <span className="text-[10px] uppercase tracking-widest text-[#cc8e25] font-bold">
              [AUTONOMOUS AGENTIC EXECUTION ENGINE]
            </span>
            <span className="text-[10px] text-[#5a6070]">|</span>
            <span className="text-[10px] text-[#10b981]">10 VERIFIED LOCAL TOOLS</span>
          </div>
          <h1 className="text-xl font-bold text-[#f0f2f5] tracking-tight uppercase">
            Deterministic Multi-Step Goal Planner
          </h1>
          <p className="text-xs text-[#8c919e] mt-1 max-w-2xl leading-relaxed">
            Decomposes high-level objectives into ordered execution DAGs, executes sandboxed local tools, and halts at deterministic security checkpoints for human operator authorization.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#181012] border border-red-500/50 text-red-400 text-xs">
            [EXECUTION ERROR]: {error}
          </div>
        )}

        {/* 2. Goal Input Section */}
        <div className="border border-[#2b303c] bg-[#12141a] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-widest text-[#8c919e] font-bold">
              [SPECIFY OBJECTIVE / MULTI-STEP TASK]
            </label>
            <span className="text-[10px] text-[#5a6070]">AIR-GAPPED RUNTIME</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="E.g., Read project documentation, execute calculation in sandbox, and schedule a task reminder..."
              className="flex-1 bg-[#090b0e] border border-[#20232b] p-3 text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25] resize-none font-mono"
            />
            <button
              onClick={() => handleCreatePlan()}
              disabled={!goal.trim() || isPlanning}
              className="px-6 py-3 bg-[#cc8e25] hover:bg-[#b06f1d] disabled:opacity-50 text-black font-bold uppercase text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isPlanning ? '[GENERATING DAG...]' : '[DISPATCH PLANNER]'}
            </button>
          </div>

          {/* Preset Prompts */}
          <div className="pt-2 border-t border-[#20232b]">
            <p className="text-[10px] uppercase text-[#5a6070] mb-2 font-bold">[VERIFIED OBJECTIVE TEMPLATES]:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRESET_GOALS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setGoal(preset);
                    handleCreatePlan(preset);
                  }}
                  className="text-left p-2.5 bg-[#161922] hover:bg-[#1c202b] border border-[#20232b] hover:border-[#cc8e25] text-xs text-[#8c919e] hover:text-[#f0f2f5] transition-colors"
                >
                  <span className="text-[#cc8e25] mr-1.5">&gt;</span>
                  <span>{preset}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Active Plan Execution DAG View */}
        {activePlan && (
          <div className="space-y-3">
            <div className="border border-[#2b303c] bg-[#12141a] p-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-[#5a6070]">PLAN ID:</span>
                  <code className="text-[11px] text-[#cc8e25] font-bold">{activePlan.planId.slice(0, 12)}</code>
                  <span className="text-[10px] px-1.5 py-0.5 border border-[#2b303c] uppercase text-[#f0f2f5]">
                    [{activePlan.status.replace('_', ' ')}]
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#f0f2f5] mt-1 uppercase">&gt; {activePlan.goal}</h3>
              </div>

              {activePlan.status === 'waiting_approval' && (
                <div className="text-[11px] font-bold text-[#cc8e25] border border-[#cc8e25] px-2.5 py-1 bg-[#1a150e]">
                  [CHECKPOINT: OPERATOR AUTHORIZATION REQUIRED]
                </div>
              )}
            </div>

            {/* Plan Steps */}
            <div className="space-y-2">
              {activePlan.steps.map((step: any, idx: number) => {
                const isStepActive = idx === activePlan.currentStepIndex;
                const isCompleted = step.status === 'completed';
                const isWaitingApproval = step.status === 'pending' && Boolean(step.requiresApproval);

                return (
                  <div
                    key={idx}
                    className={`border p-3.5 transition-colors ${
                      isWaitingApproval
                        ? 'bg-[#18130e] border-[#cc8e25]'
                        : isCompleted
                        ? 'bg-[#12141a] border-[#10b981]/50'
                        : isStepActive
                        ? 'bg-[#161922] border-[#2b303c]'
                        : 'bg-[#0e1014] border-[#20232b] opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#cc8e25]">[{String(idx + 1).padStart(2, '0')}]</span>
                          <span className="text-xs font-bold text-[#f0f2f5] uppercase">{step.action}</span>
                          <span className="px-1.5 py-0.5 border border-[#20232b] bg-[#090b0e] text-[10px] text-[#8c919e]">
                            TOOL: {step.toolName.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8c919e] pl-6">&gt; {step.rationale}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {step.requiresApproval ? (
                          <span className="text-[10px] text-[#cc8e25] border border-[#cc8e25]/60 px-1.5 py-0.5 uppercase">
                            [HUMAN GATE]
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#10b981] border border-[#10b981]/60 px-1.5 py-0.5 uppercase">
                            [AUTO PERMITTED]
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Human In The Loop Gate UI */}
                    {isWaitingApproval && (
                      <div className="mt-3 p-3 bg-[#12141a] border border-[#cc8e25] flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="text-[11px] text-[#cc8e25]">
                          <strong>SECURITY CHECKPOINT:</strong> Action requires executing <code>{step.toolName}</code>. Authorize execution?
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveStep(step.stepIndex, false)}
                            disabled={isExecuting}
                            className="px-3 py-1 border border-[#2b303c] hover:border-red-500 hover:text-red-400 text-xs uppercase"
                          >
                            [REJECT]
                          </button>
                          <button
                            onClick={() => handleApproveStep(step.stepIndex, true)}
                            disabled={isExecuting}
                            className="px-4 py-1 bg-[#cc8e25] hover:bg-[#b06f1d] text-black text-xs font-bold uppercase"
                          >
                            {isExecuting ? '[EXECUTING...]' : '[APPROVE & EXECUTE]'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step Result Output */}
                    {step.result && (
                      <div className="mt-2.5 p-2.5 bg-[#090b0e] border border-[#20232b] text-[11px] text-[#10b981]">
                        <div className="text-[9px] uppercase tracking-wider text-[#5a6070] mb-1">
                          [EVIDENCE OUTPUT]:
                        </div>
                        <pre className="whitespace-pre-wrap overflow-x-auto">{JSON.stringify(step.result, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Verified Tools Registry Reference Matrix */}
        <div className="border border-[#20232b] bg-[#12141a] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#20232b] pb-2">
            <span className="text-[10px] uppercase tracking-widest text-[#cc8e25] font-bold">
              [SANDBOXED TOOL REGISTRY: 10 DETERMINISTIC MODULES]
            </span>
            <span className="text-[10px] text-[#5a6070]">ZERO LLM HALLUCINATIONS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {[
              { name: 'calculator', desc: 'Deterministic mathematical parser.', safe: true },
              { name: 'document_reader', desc: 'Read local text files and markdown extracts.', safe: true },
              { name: 'file_search', desc: 'Keyword search across personal knowledge documents.', safe: true },
              { name: 'database_retrieval', desc: 'Query tasks, reminders, calendar, and memories.', safe: true },
              { name: 'rag_retrieval', desc: '384-dimensional cosine similarity over dense local vectors.', safe: true },
              { name: 'sandbox_code_executor', desc: 'Isolated VM execution. Requires operator authorization.', safe: false },
              { name: 'task_manager', desc: 'CRUD operations on personal task registry.', safe: true },
              { name: 'reminder_scheduler', desc: 'Timezone-aware local reminder scheduling.', safe: true },
              { name: 'calendar_connector', desc: 'Conflict detection and calendar event management.', safe: true },
              { name: 'email_connector', desc: 'Search and draft emails. Dispatch requires operator signature.', safe: false }
            ].map(tool => (
              <div key={tool.name} className="p-2.5 bg-[#090b0e] border border-[#20232b] flex items-start justify-between gap-2">
                <div>
                  <code className="text-[#cc8e25] font-bold text-[11px] uppercase">[{tool.name}]</code>
                  <p className="text-[10px] text-[#8c919e] mt-0.5">{tool.desc}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 uppercase border ${
                  tool.safe ? 'text-[#10b981] border-[#10b981]/40' : 'text-[#cc8e25] border-[#cc8e25]/40'
                }`}>
                  {tool.safe ? 'SAFE' : 'GATE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
