'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreMemory, MemoryCategory } from '@bantai/shared';
import { Brain, Plus, Trash2, ShieldCheck, Tag } from 'lucide-react';

export function MemoryView() {
  const [memories, setMemories] = useState<FirestoreMemory[]>([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('preference');

  useEffect(() => {
    api.getMemories().then(setMemories).catch(console.error);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const created = await api.createMemory({
        key: `user_mem_${Date.now()}`,
        category,
        content: content.trim()
      });
      setMemories(prev => [created, ...prev]);
      setContent('');
    } catch (err) {
      console.error('Failed to create memory:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to erase all personal memory? BANTAI will forget all saved preferences.')) return;
    try {
      await api.clearAllMemories();
      setMemories([]);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" /> Personal Memory Manager
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Isolated user preferences, facts, and projects remembered across sessions.
            </p>
          </div>

          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-300 text-xs rounded-xl transition"
            >
              Clear All Memory
            </button>
          )}
        </div>

        {/* Security Banner */}
        <div className="p-4 bg-purple-950/20 border border-purple-800/40 rounded-2xl flex items-center gap-3 text-xs text-purple-300">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-purple-400" />
          <span>
            Personal memory is strictly isolated to your user account and never shared with other users or incorporated into base model weights without consent.
          </span>
        </div>

        {/* Add Memory Item */}
        <form onSubmit={handleAdd} className="p-5 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-3">
          <div className="text-xs font-semibold text-white">Add New Personal Memory Fact</div>

          <div className="flex gap-3">
            <input
              type="text"
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="e.g., I am building a self-hosted agent platform; my preferred language is TypeScript..."
              className="flex-1 px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
            />

            <select
              value={category}
              onChange={e => setCategory(e.target.value as MemoryCategory)}
              className="px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white focus:outline-none focus:border-bantai-500"
            >
              <option value="preference">Preference</option>
              <option value="fact">Fact</option>
              <option value="project">Project</option>
              <option value="goal">Goal</option>
              <option value="instruction">Instruction</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Save Memory
            </button>
          </div>
        </form>

        {/* Memories List */}
        <div className="space-y-2">
          {memories.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-bantai-darkCard/40 border border-bantai-darkBorder rounded-2xl">
              No personal memories saved yet. BANTAI automatically learns preferences during conversation if enabled.
            </div>
          ) : (
            memories.map(m => (
              <div
                key={m.id}
                className="p-3.5 bg-bantai-darkCard border border-bantai-darkBorder rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-500/20 text-purple-300 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {m.category}
                  </span>
                  <span className="text-gray-200">{m.content}</span>
                </div>

                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-gray-500 hover:text-red-400 transition"
                  title="Forget this memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
