'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { FirestoreTask, FirestoreReminder } from '@bantai/shared';
import { resolveModel } from '../../lib/models';
import { NumberTicker } from '../ui/NumberTicker';
import { BorderBeam } from '../ui/BorderBeam';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function DashboardView() {
  const { user, setActiveView, selectedModel } = useApp();
  const [tasks, setTasks] = useState<FirestoreTask[]>([]);
  const [reminders, setReminders] = useState<FirestoreReminder[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const currentModel = resolveModel(selectedModel);

  useEffect(() => {
    api.getTasks().then(setTasks).catch(console.error);
    api.getReminders().then(setReminders).catch(console.error);
    api.getCalendarEvents().then(setEvents).catch(console.error);
  }, []);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const created = await api.createTask({
        title: newTaskTitle.trim(),
        priority: 'medium'
      });
      setTasks(prev => [created, ...prev]);
      setNewTaskTitle('');
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 1. System Telemetry Header with BorderBeam */}
        <div className="border border-[#2b303c] bg-[#12141a] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <BorderBeam size={200} duration={12} color="#cc8e25" />
          <div>
            <div className="flex items-center gap-2 text-[10px] text-[#cc8e25] font-bold uppercase tracking-widest mb-1">
              <span>[OPERATIONAL DASHBOARD]</span>
              <span>·</span>
              <Badge variant="success" pulse>STATUS: ONLINE</Badge>
            </div>
            <h1 className="text-xl font-bold text-[#f0f2f5] tracking-tight uppercase">
              OPERATOR: {user?.name || 'BANTAI EXPLORER'}
            </h1>
            <p className="text-[11px] text-[#8c919e] mt-0.5">
              ACTIVE WEIGHTS: <strong className="text-[#cc8e25]">[{currentModel.name.toUpperCase()}]</strong> ({currentModel.baseModel}) · PARAMS: {currentModel.parameters}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('agent')}
            >
              [AGENT PLANNER]
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveView('chat')}
            >
              [OPEN CONSOLE]
            </Button>
          </div>
        </div>

        {/* 2. Key Operational Metrics Matrix with Spring Number Tickers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveView('tasks')}
            className="p-3.5 bg-[#12141a] border border-[#20232b] hover:border-[#cc8e25] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-[#8c919e] mb-1">
              <span className="text-[10px] uppercase font-bold">[PENDING TASKS]</span>
              <span className="text-[#cc8e25]">&gt;</span>
            </div>
            <div className="text-2xl font-bold text-[#f0f2f5]">
              <NumberTicker value={pendingTasks.length} />
            </div>
          </div>

          <div
            onClick={() => setActiveView('reminders')}
            className="p-3.5 bg-[#12141a] border border-[#20232b] hover:border-[#cc8e25] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-[#8c919e] mb-1">
              <span className="text-[10px] uppercase font-bold">[REMINDERS]</span>
              <span className="text-[#10b981]">&gt;</span>
            </div>
            <div className="text-2xl font-bold text-[#f0f2f5]">
              <NumberTicker value={reminders.length} />
            </div>
          </div>

          <div
            onClick={() => setActiveView('calendar')}
            className="p-3.5 bg-[#12141a] border border-[#20232b] hover:border-[#cc8e25] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-[#8c919e] mb-1">
              <span className="text-[10px] uppercase font-bold">[CALENDAR]</span>
              <span className="text-[#8c919e]">&gt;</span>
            </div>
            <div className="text-2xl font-bold text-[#f0f2f5]">
              <NumberTicker value={events.length} />
            </div>
          </div>

          <div
            onClick={() => setActiveView('agent')}
            className="p-3.5 bg-[#12141a] border border-[#20232b] hover:border-[#cc8e25] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-[#8c919e] mb-1">
              <span className="text-[10px] uppercase font-bold">[AGENT TOOLS]</span>
              <span className="text-[#cc8e25]">&gt;</span>
            </div>
            <div className="text-sm font-bold text-[#cc8e25] mt-1.5">[10 SANDBOXED]</div>
          </div>
        </div>

        {/* 3. Task Management & Schedule Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority Task Column */}
          <div className="border border-[#20232b] bg-[#12141a] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#20232b] pb-2">
              <span className="text-[10px] uppercase tracking-widest text-[#cc8e25] font-bold">
                [PRIORITY TASK REGISTRY]
              </span>
              <button
                onClick={() => setActiveView('tasks')}
                className="text-[10px] text-[#8c919e] hover:text-[#f0f2f5] uppercase"
              >
                [VIEW ALL]
              </button>
            </div>

            <form onSubmit={handleQuickAddTask} className="flex gap-1.5">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="[REGISTER NEW TASK...]"
                className="flex-1 px-3 py-1.5 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                [ADD]
              </Button>
            </form>

            <div className="space-y-1.5 pt-1">
              {pendingTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-[#0e1014] border border-[#20232b] text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[#cc8e25]">&gt;</span>
                    <span className="text-[#d4d6db] truncate">{task.title}</span>
                  </div>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 border border-[#20232b] bg-[#161922] text-[#8c919e]">
                    {task.priority}
                  </span>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="text-center py-4 text-[10px] text-[#5a6070]">
                  [ZERO PENDING TASKS IN QUEUE]
                </div>
              )}
            </div>
          </div>

          {/* Reminders Column */}
          <div className="border border-[#20232b] bg-[#12141a] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#20232b] pb-2">
              <span className="text-[10px] uppercase tracking-widest text-[#10b981] font-bold">
                [SCHEDULED REMINDERS]
              </span>
              <button
                onClick={() => setActiveView('reminders')}
                className="text-[10px] text-[#8c919e] hover:text-[#f0f2f5] uppercase"
              >
                [VIEW ALL]
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {reminders.slice(0, 5).map(rem => (
                <div
                  key={rem.id}
                  className="flex items-center justify-between p-2 bg-[#0e1014] border border-[#20232b] text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[#10b981]">&gt;</span>
                    <span className="text-[#d4d6db] truncate">{rem.title}</span>
                  </div>
                  <span suppressHydrationWarning className="text-[10px] text-[#8c919e]">
                    {rem.scheduledTime ? new Date(rem.scheduledTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </span>
                </div>
              ))}
              {reminders.length === 0 && (
                <div className="text-center py-4 text-[10px] text-[#5a6070]">
                  [ZERO SCHEDULED NOTIFICATIONS]
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
