'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { FirestoreTask, FirestoreReminder, SUPPORTED_MODELS } from '@bantai/shared';
import {
  Sparkles,
  CheckSquare,
  Bell,
  Brain,
  BookOpen,
  Plus,
  ArrowRight,
  Cpu,
  Calendar as CalendarIcon,
  ShieldCheck,
  Zap,
  Terminal
} from 'lucide-react';

export function DashboardView() {
  const { user, setActiveView, selectedModel } = useApp();
  const [tasks, setTasks] = useState<FirestoreTask[]>([]);
  const [reminders, setReminders] = useState<FirestoreReminder[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const currentModel = SUPPORTED_MODELS.find(m => m.id === selectedModel) || SUPPORTED_MODELS[1];

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
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="p-6 bg-gradient-to-r from-bantai-darkCard via-bantai-950/40 to-bantai-darkCard border border-bantai-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-bantai-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> BANTAI Sovereign Assistant
            </div>
            <h1 className="text-2xl font-bold text-white">
              Kya bolta hai, {user?.name?.split(' ')[0] || 'Bantai'}!
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Active Model: <strong className="text-white">{currentModel.name}</strong> ({currentModel.baseModel}) · <em>&quot;{currentModel.tagline}&quot;</em>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('agent')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition border border-white/10"
            >
              <Cpu className="w-3.5 h-3.5 text-bantai-400" /> Agent Planner
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className="px-4 py-2.5 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-bantai-500/20"
            >
              Start Chat <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveView('tasks')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Pending Tasks</span>
              <CheckSquare className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-bold text-white">{pendingTasks.length}</div>
          </div>

          <div
            onClick={() => setActiveView('reminders')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Active Reminders</span>
              <Bell className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-bold text-white">{reminders.length}</div>
          </div>

          <div
            onClick={() => setActiveView('calendar')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Schedule Events</span>
              <CalendarIcon className="w-4 h-4 text-orange-400 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-bold text-white">{events.length}</div>
          </div>

          <div
            onClick={() => setActiveView('agent')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Agent Tools</span>
              <Cpu className="w-4 h-4 text-bantai-400 group-hover:scale-110 transition" />
            </div>
            <div className="text-sm font-bold text-bantai-400 mt-2">10 Sandboxed</div>
          </div>
        </div>

        {/* Feature Spotlight: Agentic Engine & 10 Tools */}
        <div
          onClick={() => setActiveView('agent')}
          className="p-5 bg-gradient-to-r from-bantai-950/60 via-black to-bantai-950/60 border border-bantai-500/40 rounded-2xl cursor-pointer hover:border-bantai-400 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 flex items-center justify-center flex-shrink-0">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Agentic Goal Execution</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                  Human-in-the-Loop Safe
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Decompose high-level requests into ordered tasks, evaluate with 10 tools, and approve sensitive code steps.
              </p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-bantai-400 group-hover:translate-x-1 transition" />
        </div>

        {/* Quick Add Task & Today's Pending Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Today&apos;s High Priority Tasks</span>
              <button
                onClick={() => setActiveView('tasks')}
                className="text-xs text-bantai-400 hover:underline"
              >
                View all
              </button>
            </h2>

            <form onSubmit={handleQuickAddTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
              />
              <button
                type="submit"
                className="p-2 bg-bantai-500 hover:bg-bantai-600 text-black rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2">
              {pendingTasks.slice(0, 4).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2.5 bg-black/20 border border-bantai-darkBorder rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-gray-300 truncate">{task.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                    {task.priority}
                  </span>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No pending tasks. You&apos;re all clear!</p>
              )}
            </div>
          </div>

          {/* Upcoming Schedule / Reminders */}
          <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Upcoming Reminders & Events</span>
              <button
                onClick={() => setActiveView('reminders')}
                className="text-xs text-bantai-400 hover:underline"
              >
                View all
              </button>
            </h2>

            <div className="space-y-2">
              {reminders.slice(0, 4).map(rem => (
                <div
                  key={rem.id}
                  className="flex items-center justify-between p-2.5 bg-black/20 border border-bantai-darkBorder rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Bell className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300 truncate">{rem.title}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(rem.scheduledTime).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No active reminders scheduled.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
