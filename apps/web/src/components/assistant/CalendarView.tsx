'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  Trash2,
  CalendarDays
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const data = await api.getCalendarEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;
    setLoading(true);
    try {
      const created = await api.createCalendarEvent({
        title,
        startTime,
        endTime,
        location,
        description
      });
      setEvents(prev => [...prev, created]);
      setShowAddModal(false);
      setTitle('');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setDescription('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Conflict detection
  const hasConflict = (ev: CalendarEvent) => {
    const startA = new Date(ev.startTime).getTime();
    const endA = new Date(ev.endTime).getTime();
    return events.some(other => {
      if (other.id === ev.id) return false;
      const startB = new Date(other.startTime).getTime();
      const endB = new Date(other.endTime).getTime();
      return (startA < endB && endA > startB);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bantai-500/10 border border-bantai-500/30 text-xs font-semibold text-bantai-400 mb-2">
              <CalendarIcon className="w-3.5 h-3.5" /> BANTAI Schedule & Assistant
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Calendar & Event Planner</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Automated conflict detection and schedule management running locally under BANTAI control.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-bantai-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Schedule Event
          </button>
        </div>

        {/* Conflict Notice if any */}
        {events.some(hasConflict) && (
          <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Schedule Conflict Detected:</strong> Two or more events overlap in your calendar. Check conflicting times below.
            </span>
          </div>
        )}

        {/* Events Grid */}
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="p-12 text-center bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-3">
              <CalendarDays className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No upcoming events scheduled</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Schedule your meetings, review calls, and focus sessions. BANTAI automatically checks for overlaps and conflicts.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition"
              >
                Create First Event
              </button>
            </div>
          ) : (
            events.map(ev => {
              const conflict = hasConflict(ev);
              const startFmt = new Date(ev.startTime).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short'
              });
              const endFmt = new Date(ev.endTime).toLocaleTimeString(undefined, {
                timeStyle: 'short'
              });

              return (
                <div
                  key={ev.id}
                  className={`p-4 bg-bantai-darkCard border rounded-2xl flex items-center justify-between gap-4 transition ${
                    conflict ? 'border-amber-500/50 shadow-sm shadow-amber-500/10' : 'border-bantai-darkBorder hover:border-bantai-500/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-bantai-500/10 border border-bantai-500/30 text-bantai-400 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {new Date(ev.startTime).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                      <span className="text-base font-bold text-white leading-none">
                        {new Date(ev.startTime).getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                        {conflict && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Overlap Conflict
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" /> {startFmt} – {endFmt}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-500" /> {ev.location}
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-gray-400 mt-1">{ev.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-bantai-darkBorder pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-bantai-400" /> Schedule Calendar Event
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="E.g., Architecture Review / Model Evaluation"
                    className="w-full px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-white focus:outline-none focus:border-bantai-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-white focus:outline-none focus:border-bantai-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-white focus:outline-none focus:border-bantai-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">Location / Meeting Link</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="E.g., Mumbai HQ or Google Meet"
                    className="w-full px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-white focus:outline-none focus:border-bantai-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">Notes / Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Event agenda and details..."
                    className="w-full px-3 py-2 bg-black/40 border border-bantai-darkBorder rounded-xl text-white focus:outline-none focus:border-bantai-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-bantai-darkBorder">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-bantai-500 hover:bg-bantai-600 disabled:opacity-50 text-black font-bold rounded-xl transition shadow-md shadow-bantai-500/20"
                  >
                    {loading ? 'Saving...' : 'Save Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
