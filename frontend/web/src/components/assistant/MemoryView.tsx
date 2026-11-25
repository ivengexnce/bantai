'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { FirestoreMemory, MemoryCategory } from '@bantai/shared';
import {
  Brain,
  Search,
  Trash2,
  Plus,
  Clock,
  AlertCircle
} from 'lucide-react';

const CATEGORY_COLORS: Record<MemoryCategory, { bg: string; text: string; border: string }> = {
  preference: { bg: 'bg-[#6366f1]/10', text: 'text-[#6366f1]', border: 'border-[#6366f1]/30' },
  fact: { bg: 'bg-[#22d3ee]/10', text: 'text-[#22d3ee]', border: 'border-[#22d3ee]/30' },
  project: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  goal: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  instruction: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' }
};

export function MemoryView() {
  const [memories, setMemories] = useState<FirestoreMemory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getMemories()
      .then(setMemories)
      .catch(err => setErrorMsg((err as Error).message || 'Failed to fetch memories.'));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setErrorMsg(null);

    try {
      const created = await api.createMemory({
        key: `user_mem_${Date.now()}`,
        category: newCategory,
        content: newContent.trim()
      });
      setMemories(prev => [created, ...prev]);
      setNewContent('');
      setIsAdding(false);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to save memory.');
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    try {
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to delete memory.');
    }
  };

  const filtered = memories.filter(
    m =>
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07070f] text-white p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={18} className="text-[#6366f1]" />
              <h2 className="text-base font-bold text-white tracking-tight">Sovereign Memory Store</h2>
            </div>
            <p className="text-xs text-[#64748b]">
              User-isolated persistent facts, preferences, and instructions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter memories, facts..."
                aria-label="Filter memories"
                className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAdding(v => !v)}
              className="px-3 py-1.5 rounded-button bg-[#6366f1] text-white text-xs font-medium hover:bg-[#6366f1]/90 shadow-[0_0_14px_rgba(99,102,241,0.4)] transition-all flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Memory</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300"
          >
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Add Memory Drawer */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAdd}
              className="p-4 rounded-card surface-raised border border-[#6366f1]/30 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">New Persistent Memory Record</span>
                <select
                  aria-label="Memory category"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as MemoryCategory)}
                  className="bg-[#16162a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="preference">Preference</option>
                  <option value="fact">Fact</option>
                  <option value="project">Project</option>
                  <option value="goal">Goal</option>
                  <option value="instruction">Instruction</option>
                </select>
              </div>

              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                maxLength={5000}
                placeholder="E.g., User prefers TypeScript strict mode and local RTX A2000 hardware execution..."
                rows={2}
                className="w-full bg-[#07070f] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-button bg-white/5 text-xs text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="px-4 py-1.5 rounded-button bg-[#6366f1] text-xs font-semibold text-white disabled:opacity-40"
                >
                  Save Record
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Memory Cards Grid */}
        {filtered.length === 0 ? (
          <div className="p-8 rounded-card surface-raised border-dashed border-white/10 text-center space-y-2">
            <p className="text-sm font-semibold text-white">Koi memory record nahi mila bantai.</p>
            <p className="text-xs text-[#64748b]">
              Upar &quot;Add Memory&quot; button se apna naya fact ya preference store kar sakte ho.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map((item, idx) => {
              const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.preference;
              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                  className="p-4 rounded-card surface-raised flex flex-col justify-between group hover:border-[#6366f1]/30 transition-all space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                      >
                        {item.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded hover:bg-rose-500/15 text-rose-400 transition-all"
                        aria-label="Delete memory record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-xs text-[#e2e8f0] leading-relaxed line-clamp-4">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748b] pt-2 border-t border-white/5">
                    <Clock size={11} />
                    <span>{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
