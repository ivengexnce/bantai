'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreTask, TaskPriority } from '@bantai/shared';
import { CheckSquare, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

export function TasksView() {
  const [tasks, setTasks] = useState<FirestoreTask[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    api.getTasks().then(setTasks).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const created = await api.createTask({
        title: title.trim(),
        priority
      });
      setTasks(prev => [created, ...prev]);
      setTitle('');
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleToggleStatus = async (task: FirestoreTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-bantai-400" /> Personal Task Manager
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Natural language and structured task execution.
            </p>
          </div>

          <div className="flex gap-1 bg-black/40 border border-bantai-darkBorder rounded-xl p-1 text-xs">
            {(['all', 'pending', 'completed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg capitalize transition ${
                  filter === tab ? 'bg-bantai-500 text-black font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Task Creation Bar */}
        <form onSubmit={handleCreate} className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl flex gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done, bantai?..."
            className="flex-1 px-4 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
          />

          <select
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            className="px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white focus:outline-none focus:border-bantai-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </form>

        {/* Tasks List */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-bantai-darkCard/40 border border-bantai-darkBorder rounded-2xl">
              No tasks found in this view.
            </div>
          ) : (
            filteredTasks.map(t => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className={`p-3.5 bg-bantai-darkCard border rounded-xl flex items-center justify-between transition ${
                    isDone ? 'border-bantai-darkBorder/40 opacity-60' : 'border-bantai-darkBorder'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className="text-gray-400 hover:text-bantai-400 transition"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <span className={`text-xs ${isDone ? 'line-through text-gray-400' : 'text-gray-200'}`}>
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      t.priority === 'urgent' || t.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {t.priority}
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-gray-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
