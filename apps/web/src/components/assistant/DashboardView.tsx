'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { FirestoreTask, FirestoreReminder } from '@bantai/shared';
import {
  Sparkles,
  CheckSquare,
  Bell,
  Brain,
  BookOpen,
  Plus,
  ArrowRight
} from 'lucide-react';

export function DashboardView() {
  const { user, setActiveView } = useApp();
  const [tasks, setTasks] = useState<FirestoreTask[]>([]);
  const [reminders, setReminders] = useState<FirestoreReminder[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    api.getTasks().then(setTasks).catch(console.error);
    api.getReminders().then(setReminders).catch(console.error);
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
        <div className="p-6 bg-gradient-to-r from-bantai-darkCard via-bantai-950/40 to-bantai-darkCard border border-bantai-500/30 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-bantai-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> BANTAI Personal Assistant
            </div>
            <h1 className="text-2xl font-bold text-white">
              Kya bolta hai, {user?.name.split(' ')[0]} bhai!
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Apna Model. Apna Dimaag. Tera poora din sorted hai yaha pe.
            </p>
          </div>

          <button
            onClick={() => setActiveView('chat')}
            className="px-4 py-2.5 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-bantai-500/20"
          >
            Start Chat <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveView('tasks')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Pending Tasks</span>
              <CheckSquare className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{pendingTasks.length}</div>
          </div>

          <div
            onClick={() => setActiveView('reminders')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Active Reminders</span>
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{reminders.length}</div>
          </div>

          <div
            onClick={() => setActiveView('memory')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Personal Memory</span>
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-semibold text-emerald-400">Isolated & Safe</div>
          </div>

          <div
            onClick={() => setActiveView('knowledge')}
            className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl hover:border-bantai-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Knowledge (RAG)</span>
              <BookOpen className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-sm font-semibold text-sky-400">Local Vector Store</div>
          </div>
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
                  <span className="text-gray-300 truncate">{task.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    task.priority === 'urgent' || task.priority === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">
                  Bantai, sab kaam khatam! Free time hai chill maar!
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Reminders */}
          <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Upcoming Reminders</span>
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
                  className="p-3 bg-black/20 border border-bantai-darkBorder rounded-xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{rem.title}</span>
                    <span className="text-[10px] text-gray-400">{rem.timezone}</span>
                  </div>
                  <div className="text-[11px] text-bantai-400">
                    {new Date(rem.scheduledTime).toLocaleString()}
                  </div>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-8">
                  No reminders scheduled yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
