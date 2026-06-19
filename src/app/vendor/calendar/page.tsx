'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Lock, Unlock,
  X, AlertTriangle, CheckCircle2, Clock, CalendarDays, Info,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type SlotKey = 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night' | 'whole_day';

interface SlotConfig {
  key: SlotKey;
  label: string;
  time: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

interface DateEntry {
  blocked: Set<SlotKey>;   // vendor ne block kiye slots
  booked: Set<SlotKey>;    // customer ki bookings
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const SLOTS: SlotConfig[] = [
  { key: 'morning',    label: 'Morning',    time: '6:00 AM – 12:00 PM', icon: '🌅', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  { key: 'afternoon',  label: 'Afternoon',  time: '12:00 PM – 5:00 PM', icon: '☀️', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  { key: 'evening',    label: 'Evening',    time: '5:00 PM – 9:00 PM',  icon: '🌆', color: 'text-rose-700',   bg: 'bg-rose-50',    border: 'border-rose-200' },
  { key: 'night',      label: 'Night',      time: '9:00 PM – 12:00 AM', icon: '🌙', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  { key: 'late_night', label: 'Late Night', time: '12:00 AM – 6:00 AM', icon: '🌃', color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  { key: 'whole_day',  label: 'Whole Day',  time: 'All Day (24 hrs)',    icon: '📅', color: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-300' },
];

// Sample booked dates with slots
const INITIAL_BOOKED: Record<string, Set<SlotKey>> = {
  '2026-05-10': new Set(['morning', 'afternoon']),
  '2026-05-15': new Set(['whole_day']),
  '2026-05-22': new Set(['evening', 'night']),
  '2026-05-30': new Set(['afternoon']),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const slotsByKey = Object.fromEntries(SLOTS.map(s => [s.key, s])) as Record<SlotKey, SlotConfig>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  // dateEntries: dateKey → { blocked: Set<SlotKey>, booked: Set<SlotKey> }
  const [dateEntries, setDateEntries] = useState<Record<string, DateEntry>>(() => {
    const entries: Record<string, DateEntry> = {};
    Object.entries(INITIAL_BOOKED).forEach(([k, slots]) => {
      entries[k] = { blocked: new Set(), booked: slots };
    });
    return entries;
  });

  // Modal state
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'block' | 'unblock' | 'info'>('block');
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set());
  const [successMsg, setSuccessMsg] = useState('');

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const getEntry = (key: string): DateEntry =>
    dateEntries[key] ?? { blocked: new Set(), booked: new Set() };

  const isPast = (d: number) => {
    const k = fmt(year, month, d);
    return k < todayStr;
  };

  // What colour should a calendar cell be?
  const getCellStatus = (d: number) => {
    const key = fmt(year, month, d);
    const entry = getEntry(key);
    const hasBooked  = entry.booked.size  > 0;
    const hasBlocked = entry.blocked.size > 0;
    if (hasBooked && hasBlocked) return 'mixed';
    if (hasBooked)  return 'booked';
    if (hasBlocked) return 'blocked';
    return 'available';
  };

  // Open modal
  const openModal = (d: number) => {
    if (isPast(d)) return;
    const key   = fmt(year, month, d);
    const entry = getEntry(key);
    setModalDate(key);
    setSelectedSlots(new Set());
    // Default mode: if has blocked → show unblock option; else block
    setModalMode(entry.blocked.size > 0 ? 'block' : 'block');
  };

  const closeModal = () => {
    setModalDate(null);
    setSelectedSlots(new Set());
  };

  const toggleSlot = (slot: SlotKey) => {
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  // Select whole_day → deselect others; select others → deselect whole_day
  const smartToggleSlot = (slot: SlotKey) => {
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (slot === 'whole_day') {
        if (next.has('whole_day')) next.delete('whole_day');
        else { next.clear(); next.add('whole_day'); }
      } else {
        next.delete('whole_day');
        if (next.has(slot)) next.delete(slot);
        else next.add(slot);
      }
      return next;
    });
  };

  const handleConfirmBlock = () => {
    if (!modalDate || selectedSlots.size === 0) return;
    setDateEntries(prev => {
      const entry = prev[modalDate] ?? { blocked: new Set(), booked: new Set() };
      const newBlocked = new Set([...entry.blocked, ...selectedSlots]);
      // If whole_day selected, remove other blocked slots
      if (selectedSlots.has('whole_day')) {
        return { ...prev, [modalDate]: { ...entry, blocked: new Set(['whole_day' as SlotKey]) } };
      }
      return { ...prev, [modalDate]: { ...entry, blocked: newBlocked } };
    });
    showSuccess(`${selectedSlots.size} slot(s) blocked for ${formatDateLabel(modalDate)}`);
    closeModal();
  };

  const handleConfirmUnblock = () => {
    if (!modalDate || selectedSlots.size === 0) return;
    setDateEntries(prev => {
      const entry = prev[modalDate] ?? { blocked: new Set(), booked: new Set() };
      const newBlocked = new Set([...entry.blocked].filter(s => !selectedSlots.has(s)));
      return { ...prev, [modalDate]: { ...entry, blocked: newBlocked } };
    });
    showSuccess(`${selectedSlots.size} slot(s) unblocked for ${formatDateLabel(modalDate)}`);
    closeModal();
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const formatDateLabel = (key: string) => {
    const [y, m, d] = key.split('-');
    return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
  };

  // Stats for this month
  const monthStats = useMemo(() => {
    let bookedDays = 0, blockedDays = 0, mixedDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = fmt(year, month, d);
      const entry = getEntry(key);
      const hasBooked  = entry.booked.size > 0;
      const hasBlocked = entry.blocked.size > 0;
      if (hasBooked && hasBlocked) mixedDays++;
      else if (hasBooked)  bookedDays++;
      else if (hasBlocked) blockedDays++;
    }
    return { bookedDays, blockedDays, mixedDays, available: daysInMonth - bookedDays - blockedDays - mixedDays };
  }, [dateEntries, year, month, daysInMonth]);

  // Upcoming booked dates (for sidebar)
  const upcomingBooked = useMemo(() => {
    const list: { key: string; slots: SlotKey[] }[] = [];
    Object.entries(dateEntries).forEach(([key, entry]) => {
      if (entry.booked.size > 0 && key >= todayStr) {
        list.push({ key, slots: [...entry.booked] as SlotKey[] });
      }
    });
    return list.sort((a, b) => a.key.localeCompare(b.key)).slice(0, 5);
  }, [dateEntries, todayStr]);

  // Calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Modal entry
  const modalEntry = modalDate ? getEntry(modalDate) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Availability Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Block time slots to manage your availability. Click any date to manage it.</p>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Click any future date to block or unblock specific time slots. Booked slots (from customers) cannot be modified.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Calendar ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-gray-900 text-lg">{MONTHS[month]} {year}</h2>
              <p className="text-xs text-gray-400">{daysInMonth} days</p>
            </div>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />;

              const key     = fmt(year, month, d);
              const status  = getCellStatus(d);
              const past    = isPast(d);
              const isToday = key === todayStr;
              const entry   = getEntry(key);

              // Dot indicators for slots
              const hasBlockedSlots = entry.blocked.size > 0;
              const hasBookedSlots  = entry.booked.size  > 0;

              let cellBg = 'bg-gray-50 hover:bg-orange-50 text-gray-700';
              if (isToday)             cellBg = 'bg-orange-500 text-white font-bold';
              else if (status === 'booked')   cellBg = 'bg-blue-100 text-blue-800';
              else if (status === 'blocked')  cellBg = 'bg-red-100 text-red-700';
              else if (status === 'mixed')    cellBg = 'bg-gradient-to-br from-blue-100 to-red-100 text-gray-800';

              return (
                <button key={d}
                  onClick={() => openModal(d)}
                  disabled={past}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all
                    ${past ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:shadow-sm'}
                    ${cellBg}`}
                >
                  <span>{d}</span>
                  {/* Slot dots */}
                  {!isToday && (hasBlockedSlots || hasBookedSlots) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasBookedSlots  && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                      {hasBlockedSlots && <span className="w-1 h-1 rounded-full bg-red-500" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-50">
            {[
              { color: 'bg-gray-100',                        label: 'Available' },
              { color: 'bg-orange-500',                      label: 'Today' },
              { color: 'bg-blue-100',                        label: 'Booked' },
              { color: 'bg-red-100',                         label: 'Blocked' },
              { color: 'bg-gradient-to-r from-blue-100 to-red-100', label: 'Mixed' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-lg ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarDays size={16} className="text-orange-500" /> {MONTHS[month]} Summary
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Available Days', value: monthStats.available, color: 'text-green-600',  dot: 'bg-green-400' },
                { label: 'Booked Days',    value: monthStats.bookedDays,  color: 'text-blue-600',   dot: 'bg-blue-400' },
                { label: 'Blocked Days',   value: monthStats.blockedDays, color: 'text-red-500',    dot: 'bg-red-400' },
                { label: 'Mixed Days',     value: monthStats.mixedDays,   color: 'text-gray-600',   dot: 'bg-gray-400' },
              ].map(({ label, value, color, dot }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slot legend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" /> Time Slots
            </h3>
            <div className="space-y-2">
              {SLOTS.map(slot => (
                <div key={slot.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${slot.bg} border ${slot.border}`}>
                  <span className="text-base">{slot.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold ${slot.color}`}>{slot.label}</p>
                    <p className="text-xs text-gray-400">{slot.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming bookings */}
          {upcomingBooked.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Upcoming Bookings</h3>
              <div className="space-y-2">
                {upcomingBooked.map(({ key, slots }) => (
                  <div key={key} className="border border-blue-100 rounded-xl p-3 bg-blue-50/50">
                    <p className="text-xs font-semibold text-blue-800 mb-1.5">
                      {formatDateLabel(key)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {slots.map(s => (
                        <span key={s} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {slotsByKey[s]?.icon} {slotsByKey[s]?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DATE MANAGEMENT MODAL
      ══════════════════════════════════════════════════ */}
      {modalDate && modalEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Manage Date</h2>
                <p className="text-sm text-orange-600 font-medium mt-0.5">{formatDateLabel(modalDate)}</p>
              </div>
              <button onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors mt-0.5">
                <X size={18} />
              </button>
            </div>

            {/* Current status summary */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex gap-2 flex-wrap">
                {modalEntry.booked.size > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {modalEntry.booked.size} slot(s) booked
                  </div>
                )}
                {modalEntry.blocked.size > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {modalEntry.blocked.size} slot(s) blocked
                  </div>
                )}
                {modalEntry.booked.size === 0 && modalEntry.blocked.size === 0 && (
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    All slots available
                  </div>
                )}
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="px-6 pt-3 pb-1">
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => { setModalMode('block'); setSelectedSlots(new Set()); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                    ${modalMode === 'block' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Lock size={13} /> Block Slots
                </button>
                <button
                  onClick={() => { setModalMode('unblock'); setSelectedSlots(new Set()); }}
                  disabled={modalEntry.blocked.size === 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                    ${modalMode === 'unblock' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Unlock size={13} /> Unblock Slots
                </button>
                <button
                  onClick={() => { setModalMode('info'); setSelectedSlots(new Set()); }}
                  disabled={modalEntry.booked.size === 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                    ${modalMode === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Info size={13} /> Booked
                </button>
              </div>
            </div>

            {/* ── BLOCK MODE ── */}
            {modalMode === 'block' && (
              <div className="px-6 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
                <p className="text-xs text-gray-500">Select slots to block on this date:</p>
                {SLOTS.map(slot => {
                  const isBooked    = modalEntry.booked.has(slot.key);
                  const isAlrBlocked = modalEntry.blocked.has(slot.key);
                  const isSelected  = selectedSlots.has(slot.key);
                  const disabled    = isBooked || isAlrBlocked;

                  return (
                    <button key={slot.key}
                      onClick={() => !disabled && smartToggleSlot(slot.key)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                        ${disabled
                          ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                          : isSelected
                            ? 'border-red-400 bg-red-50'
                            : `border-gray-200 hover:border-gray-300 hover:bg-gray-50`
                        }`}
                    >
                      <span className="text-xl">{slot.icon}</span>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-red-700' : 'text-gray-800'}`}>
                          {slot.label}
                        </p>
                        <p className="text-xs text-gray-400">{slot.time}</p>
                      </div>
                      {isBooked && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Booked</span>
                      )}
                      {isAlrBlocked && !isBooked && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">Blocked</span>
                      )}
                      {!disabled && (
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                          ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── UNBLOCK MODE ── */}
            {modalMode === 'unblock' && (
              <div className="px-6 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
                <p className="text-xs text-gray-500">Select slots to unblock on this date:</p>
                {SLOTS.filter(s => modalEntry.blocked.has(s.key)).map(slot => {
                  const isSelected = selectedSlots.has(slot.key);
                  return (
                    <button key={slot.key}
                      onClick={() => toggleSlot(slot.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                        ${isSelected ? 'border-green-400 bg-green-50' : 'border-red-200 bg-red-50 hover:border-red-300'}`}
                    >
                      <span className="text-xl">{slot.icon}</span>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-green-700' : 'text-red-700'}`}>
                          {slot.label}
                        </p>
                        <p className="text-xs text-gray-400">{slot.time}</p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">Blocked</span>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                        ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </button>
                  );
                })}
                {modalEntry.blocked.size === 0 && (
                  <p className="text-sm text-center text-gray-400 py-6">No blocked slots on this date.</p>
                )}
              </div>
            )}

            {/* ── INFO / BOOKED MODE ── */}
            {modalMode === 'info' && (
              <div className="px-6 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
                <p className="text-xs text-gray-500">Slots booked by customers on this date:</p>
                {SLOTS.filter(s => modalEntry.booked.has(s.key)).map(slot => (
                  <div key={slot.key}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${slot.border} ${slot.bg}`}>
                    <span className="text-xl">{slot.icon}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${slot.color}`}>{slot.label}</p>
                      <p className="text-xs text-gray-400">{slot.time}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Booked</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warning for block */}
            {modalMode === 'block' && selectedSlots.size > 0 && (
              <div className="mx-6 mb-2 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  You are about to block <strong>{selectedSlots.size} slot(s)</strong> on <strong>{formatDateLabel(modalDate)}</strong>.
                  Customers won't be able to book these slots.
                </span>
              </div>
            )}

            {/* Footer buttons */}
            {modalMode !== 'info' && (
              <div className="flex gap-3 px-6 pb-6 pt-2">
                <button onClick={closeModal}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                {modalMode === 'block' && (
                  <button
                    onClick={handleConfirmBlock}
                    disabled={selectedSlots.size === 0}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock size={15} /> Block {selectedSlots.size > 0 ? `(${selectedSlots.size})` : ''}
                  </button>
                )}
                {modalMode === 'unblock' && (
                  <button
                    onClick={handleConfirmUnblock}
                    disabled={selectedSlots.size === 0}
                    className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Unlock size={15} /> Unblock {selectedSlots.size > 0 ? `(${selectedSlots.size})` : ''}
                  </button>
                )}
              </div>
            )}
            {modalMode === 'info' && (
              <div className="px-6 pb-6 pt-2">
                <button onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
