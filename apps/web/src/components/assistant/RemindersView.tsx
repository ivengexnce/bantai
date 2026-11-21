'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreReminder } from '@bantai/shared';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function RemindersView() {
  const [reminders, setReminders] = useState<FirestoreReminder[]>([]);
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    api.getReminders().then(setReminders).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !datetime) return;

    try {
      const isoTime = new Date(datetime).toISOString();
      const created = await api.createReminder({
        title: title.trim(),
        scheduledTime: isoTime,
        timezone
      });

      setReminders(prev => [created, ...prev]);
      setTitle('');
      setDatetime('');
      setSuccessNotice(`Reminder "${created.title}" successfully scheduled!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to create reminder:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Specification */}
        <div className="border-b border-[#20232b] pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="warning">[05] SCHEDULED REMINDERS</Badge>
            <Badge variant="success">TEMPORAL ENGINE ACTIVE</Badge>
          </div>
          <h1 className="text-xl font-bold text-[#f0f2f5] uppercase tracking-wider">
            Proactive Reminder Scheduler
          </h1>
          <p className="text-xs text-[#8c919e] mt-1">
            Verified date, time, and timezone-aware notifications running locally under BANTAI control.
          </p>
        </div>

        {successNotice && (
          <div className="p-3 bg-[#0a1c12] border border-[#10b981] text-[#10b981] text-xs">
            &gt; [SCHEDULED]: {successNotice}
          </div>
        )}

        {/* Schedule Reminder Form */}
        <form onSubmit={handleCreate} className="p-5 bg-[#12141a] border border-[#20232b] space-y-3">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase">
            [+] SCHEDULE NEW PROACTIVE REMINDER
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Reminder description..."
              className="px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25] md:col-span-1"
            />
            <input
              type="datetime-local"
              required
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25]"
            />
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="px-3 py-2 bg-[#090b0e] border border-[#20232b] text-xs text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25] font-mono uppercase"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              [+] CONFIRM REMINDER
            </Button>
          </div>
        </form>

        {/* Reminders List */}
        <div className="space-y-2">
          {reminders.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8c919e] bg-[#12141a] border border-[#20232b] uppercase tracking-wider">
              NO SCHEDULED REMINDERS PENDING.
            </div>
          ) : (
            reminders.map(r => (
              <div
                key={r.id}
                className="p-3 bg-[#12141a] border border-[#20232b] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#cc8e25] font-bold">[REMINDER]</span>
                  <div>
                    <h4 className="font-bold text-[#f0f2f5]">{r.title}</h4>
                    <span className="text-[10px] text-[#8c919e]">
                      EXECUTE AT: {new Date(r.scheduledTime).toLocaleString()} ({r.timezone})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-[#8c919e] hover:text-red-400 font-bold uppercase text-[10px] transition-colors"
                  title="Purge reminder"
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
