'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';

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
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Specification */}
        <div className="flex items-center justify-between border-b border-[#20232b] pb-4 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">[06] CALENDAR RUNNER</Badge>
              <Badge variant="success">LOCAL CONFLICT ENGINE</Badge>
            </div>
            <h1 className="text-xl font-bold text-[#f0f2f5] uppercase tracking-wider">
              Calendar & Event Scheduler
            </h1>
            <p className="text-xs text-[#8c919e] mt-1">
              Automated conflict detection and schedule management running locally under BANTAI control.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            [+] SCHEDULE EVENT
          </Button>
        </div>

        {/* Conflict Alert Banner */}
        {events.some(hasConflict) && (
          <div className="p-3 bg-[#1c140a] border border-[#cc8e25] text-[#cc8e25] text-xs flex items-center justify-between">
            <span className="font-bold">&gt; [SCHEDULE CONFLICT DETECTED]: Overlapping calendar events detected. Review timestamps below.</span>
            <span className="text-[10px] uppercase">[ALERT]</span>
          </div>
        )}

        {/* Events Grid */}
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="p-12 text-center bg-[#12141a] border border-[#20232b] space-y-3">
              <p className="text-[#8c919e] uppercase tracking-wider">NO CALENDAR EVENTS REGISTERED</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                [+] CREATE FIRST EVENT
              </Button>
            </div>
          ) : (
            events.map(ev => {
              const conflict = hasConflict(ev);
              return (
                <div
                  key={ev.id}
                  className={`p-4 bg-[#12141a] border flex items-center justify-between gap-4 transition-colors ${
                    conflict ? 'border-[#cc8e25]' : 'border-[#20232b]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#181b22] border border-[#20232b] text-[#cc8e25] flex flex-col items-center justify-center flex-shrink-0 font-bold">
                      <span className="text-[9px] uppercase text-[#8c919e]">
                        {new Date(ev.startTime).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-sm">
                        {new Date(ev.startTime).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#f0f2f5] text-xs uppercase">{ev.title}</h3>
                        {conflict && (
                          <Badge variant="warning">[CONFLICT]</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-[#8c919e] mt-1">
                        <span>
                          {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {ev.location && (
                          <span>· LOC: {ev.location}</span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-[#5a6070] mt-1">{ev.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Event Modal Dialog */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="SCHEDULE NEW CALENDAR EVENT"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[EVENT TITLE]</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Architecture Review / Model Evaluation"
              className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[START TIME]</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[END TIME]</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[LOCATION]</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Mumbai HQ or Localhost Sandbox"
              className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#8c919e] mb-1">[DETAILS & AGENDA]</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Event agenda and details..."
              className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#20232b]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
            >
              {loading ? '[SAVING...]' : '[CONFIRM SCHEDULE]'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
