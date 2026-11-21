'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreTask, TaskPriority } from '@bantai/shared';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';

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

  const filterTabs = [
    { id: 'all', label: 'All Tasks' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Specification */}
        <div className="flex items-center justify-between border-b border-[#20232b] pb-4 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">[04] TASK REGISTRY</Badge>
              <Badge variant="success">LOCAL DISPATCHER</Badge>
            </div>
            <h1 className="text-xl font-bold text-[#f0f2f5] uppercase tracking-wider">
              Personal Task Registry
            </h1>
            <p className="text-xs text-[#8c919e] mt-1">
              Natural language task orchestration and deterministic status tracking.
            </p>
          </div>

          <div className="flex items-center">
            <Tabs
              tabs={filterTabs}
              activeTab={filter}
              onChange={id => setFilter(id as 'all' | 'pending' | 'completed')}
              layoutId="tasks-filter-tab"
            />
          </div>
        </div>

        {/* Task Creation Bar */}
        <form onSubmit={handleCreate} className="p-4 bg-[#12141a] border border-[#20232b] flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="[ENTER ACTIONABLE TASK DIRECTIVE]..."
            className="flex-1 px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
          />

          <select
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            className="px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25] font-mono uppercase"
          >
            <option value="low">PRIORITY: LOW</option>
            <option value="medium">PRIORITY: MEDIUM</option>
            <option value="high">PRIORITY: HIGH</option>
            <option value="urgent">PRIORITY: URGENT</option>
          </select>

          <Button
            type="submit"
            variant="primary"
            size="sm"
          >
            [+] REGISTER TASK
          </Button>
        </form>

        {/* Tasks List */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8c919e] bg-[#12141a] border border-[#20232b] uppercase tracking-wider">
              NO TASKS MATCH THE CURRENT FILTER.
            </div>
          ) : (
            filteredTasks.map(t => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className={`p-3 bg-[#12141a] border flex items-center justify-between transition-colors ${
                    isDone ? 'border-[#20232b] opacity-60' : 'border-[#20232b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className="px-2 py-0.5 border border-[#2b303c] bg-[#181b22] text-[10px] font-bold uppercase transition-colors hover:border-[#cc8e25]"
                    >
                      {isDone ? (
                        <span className="text-[#10b981]">[DONE]</span>
                      ) : (
                        <span className="text-[#8c919e]">[OPEN]</span>
                      )}
                    </button>
                    <span className={`text-xs ${isDone ? 'line-through text-[#5a6070]' : 'text-[#f0f2f5]'}`}>
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${
                      t.priority === 'urgent' || t.priority === 'high'
                        ? 'border-red-500/50 bg-red-950/20 text-red-400'
                        : 'border-[#20232b] bg-[#181b22] text-[#cc8e25]'
                    }`}>
                      [{t.priority}]
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-[#8c919e] hover:text-red-400 font-bold uppercase text-[10px] transition-colors"
                      title="Purge task"
                    >
                      [PURGE]
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
