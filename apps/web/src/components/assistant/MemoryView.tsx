'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreMemory, MemoryCategory } from '@bantai/shared';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

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
    if (!confirm('Permanently purge all personal memory? BANTAI will forget all saved preferences.')) return;
    try {
      await api.clearAllMemories();
      setMemories([]);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Specification */}
        <div className="flex items-center justify-between border-b border-[#20232b] pb-4 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">[08] PRIVATE MEMORY</Badge>
              <Badge variant="success">ISOLATED USER PARTITION</Badge>
            </div>
            <h1 className="text-xl font-bold text-[#f0f2f5] uppercase tracking-wider">
              Personal Memory Manager
            </h1>
            <p className="text-xs text-[#8c919e] mt-1">
              Isolated user preferences, facts, and projects remembered across sessions. Zero telemetry leakage.
            </p>
          </div>

          {memories.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearAll}
            >
              [!] PURGE ALL MEMORY
            </Button>
          )}
        </div>

        {/* Security Banner */}
        <div className="p-3 bg-[#12151d] border border-[#20232b] flex items-center justify-between text-xs text-[#8c919e]">
          <span>
            [ENCRYPTION BOUNDARY]: Personal memory is strictly isolated to your user account and never shared with other users or incorporated into base model weights without consent.
          </span>
          <Badge variant="neutral">AIR-GAPPED</Badge>
        </div>

        {/* Add Memory Item */}
        <form onSubmit={handleAdd} className="p-5 bg-[#12141a] border border-[#20232b] space-y-3">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase">
            [+] REGISTER NEW MEMORY FACT
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="e.g., I am building a self-hosted agent platform; my preferred language is TypeScript..."
              className="flex-1 px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
            />

            <select
              value={category}
              onChange={e => setCategory(e.target.value as MemoryCategory)}
              className="px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25] font-mono uppercase"
            >
              <option value="preference">Preference</option>
              <option value="fact">Fact</option>
              <option value="project">Project</option>
              <option value="goal">Goal</option>
              <option value="instruction">Instruction</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              [+] SAVE
            </Button>
          </div>
        </form>

        {/* Memories List */}
        <div className="space-y-2">
          {memories.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8c919e] bg-[#12141a] border border-[#20232b] uppercase tracking-wider">
              NO PERSONAL MEMORIES SAVED YET. BANTAI AUTOMATICALLY LEARNS PREFERENCES DURING CONVERSATION.
            </div>
          ) : (
            memories.map(m => (
              <div
                key={m.id}
                className="p-3 bg-[#12141a] border border-[#20232b] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 border border-[#20232b] bg-[#181b22] text-[10px] font-bold uppercase text-[#cc8e25]">
                    [{m.category}]
                  </span>
                  <span className="text-[#f0f2f5]">{m.content}</span>
                </div>

                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-[#8c919e] hover:text-red-400 font-bold uppercase text-[10px] transition-colors"
                  title="Forget this memory"
                >
                  [PURGE]
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
