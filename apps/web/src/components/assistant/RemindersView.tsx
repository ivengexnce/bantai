'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FirestoreReminder } from '@bantai/shared';
import { Bell, Plus, Trash2, Calendar, Clock, Globe } from 'lucide-react';

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
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-bantai-400" /> Proactive Reminder Scheduler
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Verified date, time, and timezone-aware notifications.
          </p>
        </div>

        {successNotice && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs">
            {successNotice}
          </div>
        )}

        {/* Schedule Reminder Form */}
        <form onSubmit={handleCreate} className="p-5 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-3">
          <div className="text-xs font-semibold text-white">Schedule New Reminder</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Reminder description..."
              className="px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500 md:col-span-1"
            />
            <input
              type="datetime-local"
              required
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white focus:outline-none focus:border-bantai-500"
            />
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="px-3.5 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-xs text-white focus:outline-none focus:border-bantai-500"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Schedule Reminder
            </button>
          </div>
        </form>

        {/* Reminders List */}
        <div className="space-y-2">
          {reminders.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-bantai-darkCard/40 border border-bantai-darkBorder rounded-2xl">
              No scheduled reminders currently.
            </div>
          ) : (
            reminders.map(rem => (
              <div
                key={rem.id}
                className="p-4 bg-bantai-darkCard border border-bantai-darkBorder rounded-xl flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-bantai-400" />
                    {rem.title}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(rem.scheduledTime).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {rem.timezone}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(rem.id)}
                  className="text-gray-500 hover:text-red-400 transition"
                  title="Dismiss Reminder"
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
