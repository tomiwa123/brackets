import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Download,
  Flame,
  LoaderCircle,
  LogOut,
  Menu,
} from 'lucide-react';
import { PROGRAM } from './program';
import { useTransformStore } from './store';
import {
  dailyProgress,
  eraDayNumber,
  eraViewEnd,
  hasMeaningfulRecord,
  lastRecordedDayNumber,
  shiftDay,
  streakAtDay,
} from './eras';
import { dayStr, parseDay, type EraData } from './storage';
import { PassphraseGate } from './PassphraseGate';
import { DayChecklist } from './DayChecklist';

function formatDate(day: string): string {
  return new Date(parseDay(day)).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatRange(era: EraData): string {
  const end = era.retiredOn ?? shiftDay(era.startDate, era.durationDays - 1);
  const format = (day: string) =>
    new Date(parseDay(day)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(era.startDate)}–${format(end)}`;
}

function SyncLabel() {
  const status = useTransformStore((state) => state.syncStatus);
  const detail = useTransformStore((state) => state.syncDetail);

  const meta = {
    local: { icon: CloudOff, label: 'Saved locally', className: 'text-white/35' },
    connecting: { icon: LoaderCircle, label: 'Connecting to Firestore…', className: 'text-white/45' },
    saving: { icon: LoaderCircle, label: 'Saving…', className: 'text-amber-300/80' },
    saved: { icon: CheckCircle2, label: 'Saved to Firestore', className: 'text-emerald-300/70' },
    offline: { icon: CloudOff, label: 'Offline · changes queued', className: 'text-amber-300/80' },
    error: { icon: AlertTriangle, label: 'Cloud save failed · local copy safe', className: 'text-rose-300/80' },
  }[status];
  const Icon = meta.icon;

  return (
    <div className="mt-8 text-center">
      <div className={`inline-flex items-center gap-1.5 text-[11px] ${meta.className}`} title={detail ?? undefined}>
        <Icon size={12} className={status === 'saving' || status === 'connecting' ? 'animate-spin' : ''} />
        {meta.label}
      </div>
      {detail && status !== 'saved' && <p className="mx-auto mt-1 max-w-md text-[10px] text-white/30">{detail}</p>}
    </div>
  );
}

export function TransformApp() {
  const {
    unlocked,
    data,
    selectedEraId,
    activeDay,
    setActiveDay,
    selectEra,
    lock,
    setNote,
    startSync,
    downloadBackup,
    storageWarning,
    migrationNotice,
    recoveryBlocked,
  } = useTransformStore();
  const [eraMenuOpen, setEraMenuOpen] = useState(false);
  const eraMenuRef = useRef<HTMLDivElement>(null);
  const eraMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (unlocked) void startSync();
  }, [startSync, unlocked]);

  useEffect(() => {
    if (!eraMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!eraMenuRef.current?.contains(event.target as Node)) setEraMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEraMenuOpen(false);
        eraMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [eraMenuOpen]);

  const era = data.eras[selectedEraId];
  const today = dayStr();
  const records = era.records;
  const programDay = eraDayNumber(era, activeDay);
  const progress = useMemo(() => dailyProgress(records, activeDay), [records, activeDay]);
  const note = records[activeDay]?.note ?? '';
  const archived = era.status === 'archived';
  const readOnly = archived || recoveryBlocked;
  const hasEntry = hasMeaningfulRecord(records[activeDay]);

  const streak = useMemo(() => {
    if (archived) return streakAtDay(records, activeDay, false);
    return streakAtDay(records, today, true);
  }, [activeDay, archived, records, today]);

  if (!unlocked) return <PassphraseGate />;

  const viewEnd = eraViewEnd(era, today);
  const atEnd = activeDay >= viewEnd;
  const atStart = activeDay <= era.startDate;
  const isToday = !archived && activeDay === today;
  const pct = Math.round(progress * 100);

  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-5 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl leading-none" style={{ fontFamily: 'Bangers, system-ui' }}>
            {PROGRAM.title}
          </h1>
          {PROGRAM.subtitle && <p className="mt-1 text-sm text-white/45">{PROGRAM.subtitle}</p>}
        </div>
        <div ref={eraMenuRef} className="relative flex-none">
          <button
            ref={eraMenuButtonRef}
            type="button"
            onClick={() => setEraMenuOpen((open) => !open)}
            aria-label={eraMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={eraMenuOpen}
            aria-controls="transform-menu"
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
              eraMenuOpen
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white'
            }`}
          >
            <Menu size={18} />
          </button>

          {eraMenuOpen && (
            <div
              id="transform-menu"
              aria-label="Transformation menu"
              className="absolute right-0 z-30 mt-2 max-h-[calc(100vh-6rem)] w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
              <div className="border-b border-white/10 px-4 py-3.5">
                <div className="text-sm font-semibold">Menu</div>
                <div className="mt-0.5 text-[11px] text-white/35">
                  {era.name} · {archived ? 'Viewing archive' : 'Current era'}
                </div>
              </div>

              <div className="p-2">
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Eras
                </div>
                {Object.values(data.eras).map((candidate) => {
                  const lastDay = lastRecordedDayNumber(candidate);
                  const selected = candidate.id === era.id;
                  return (
                    <button
                      type="button"
                      aria-pressed={selected}
                      key={candidate.id}
                      onClick={() => {
                        selectEra(candidate.id);
                        setEraMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                        selected ? 'bg-white/[0.05]' : ''
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
                          candidate.status === 'active'
                            ? 'bg-emerald-300/10 text-emerald-300/80'
                            : 'bg-amber-300/10 text-amber-300/70'
                        }`}
                      >
                        {candidate.status === 'active' ? <Flame size={15} /> : <Archive size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {candidate.name} · {candidate.status === 'active' ? 'Current' : 'Archived'}
                        </span>
                        <span className="block truncate text-[11px] text-white/35">
                          {formatRange(candidate)}
                          {candidate.status === 'archived' && lastDay !== null ? ` · last recorded Day ${lastDay}` : ''}
                        </span>
                      </span>
                      {selected && <CheckCircle2 size={15} className="flex-none text-emerald-300/75" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 p-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadBackup();
                    setEraMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                  <Download size={15} /> Download history backup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEraMenuOpen(false);
                    lock();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                  <LogOut size={15} /> Lock app
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(storageWarning || migrationNotice) && (
        <div
          className={`mt-4 rounded-xl border px-3.5 py-3 text-xs ${
            storageWarning
              ? 'border-rose-300/20 bg-rose-300/[0.05] text-rose-100/70'
              : 'border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100/65'
          }`}
        >
          {storageWarning ?? migrationNotice}
        </div>
      )}

      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="relative flex h-16 w-16 flex-none items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <motion.circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgb(52,211,153)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: progress }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </svg>
          <span className="absolute text-sm font-bold">{pct}%</span>
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-white/40">
            {archived ? 'Archive · ' : ''}Day {programDay} of {era.durationDays}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-amber-300">
            <Flame size={15} /> {streak} day{streak === 1 ? '' : 's'} streak
          </div>
          {archived && <div className="mt-1 text-[11px] text-white/35">Read-only past attempt</div>}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setActiveDay(shiftDay(activeDay, -1))}
          disabled={atStart}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/60 hover:text-white disabled:opacity-25"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{isToday ? 'Today' : formatDate(activeDay)}</div>
          {!isToday && !archived && (
            <button onClick={() => setActiveDay(today)} className="text-[11px] text-emerald-300 hover:underline">
              jump to today
            </button>
          )}
          {archived && (
            <button onClick={() => selectEra(data.activeEraId)} className="text-[11px] text-emerald-300 hover:underline">
              back to current
            </button>
          )}
        </div>
        <button
          onClick={() => setActiveDay(shiftDay(activeDay, 1))}
          disabled={atEnd}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/60 hover:text-white disabled:opacity-25"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {archived && !hasEntry && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-center text-xs text-white/40">
          No entry recorded for this day.
        </div>
      )}

      <div className="mt-4">
        <DayChecklist />
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-widest text-white/40">
          Note {readOnly ? '· Read only' : ''}
        </label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          readOnly={readOnly}
          placeholder={readOnly ? 'No note recorded.' : 'How did today go?'}
          maxLength={20000}
          rows={3}
          className={`mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none ${
            readOnly ? 'cursor-default text-white/55' : 'focus:border-emerald-400/50'
          }`}
        />
      </div>

      <SyncLabel />
      <p className="mt-2 text-center text-[10px] text-white/20">Firestore sync with a versioned local backup.</p>
    </div>
  );
}
