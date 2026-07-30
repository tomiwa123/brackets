import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, LogOut } from 'lucide-react';
import { PROGRAM } from './program';
import { useTransformStore, recordKeyFor } from './store';
import { dayStr, parseDay, daysBetween, type RecordMap } from './storage';
import { PassphraseGate } from './PassphraseGate';
import { DayChecklist } from './DayChecklist';

const DAILY = PROGRAM.items.filter((i) => i.cadence === 'daily');
const DAILY_P0 = DAILY.filter((i) => i.priority === 'P0');

/** Fraction (0..1) of daily items checked on a given day. */
function dailyProgress(records: RecordMap, day: string): number {
  if (DAILY.length === 0) return 0;
  const done = DAILY.filter((i) => records[recordKeyFor(i, day)]?.completed[i.id]).length;
  return done / DAILY.length;
}

/** Streak threshold: a day counts if at least this fraction of P0 items are done. */
const STREAK_THRESHOLD = 0.7;

/** Enough P0 daily items done for a given day to count toward the streak? */
function p0Complete(records: RecordMap, day: string): boolean {
  if (DAILY_P0.length === 0) return false;
  const done = DAILY_P0.filter((i) => records[recordKeyFor(i, day)]?.completed[i.id]).length;
  return done / DAILY_P0.length >= STREAK_THRESHOLD;
}

function shiftDay(day: string, delta: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + delta);
  return dayStr(d);
}

export function TransformApp() {
  const { unlocked, records, activeDay, setActiveDay, lock, setNote } = useTransformStore();

  const today = dayStr();
  const programDay = daysBetween(PROGRAM.startDate, activeDay) + 1;
  const progress = useMemo(() => dailyProgress(records, activeDay), [records, activeDay]);
  const note = records[activeDay]?.note ?? '';

  // Streak: consecutive days with enough P0 items complete, ending at the most
  // recent completed day. Today is still in progress, so an unfinished today
  // must not zero out the streak — start from yesterday until today qualifies.
  const streak = useMemo(() => {
    let count = 0;
    let cursor = p0Complete(records, today) ? today : shiftDay(today, -1);
    while (p0Complete(records, cursor)) {
      count += 1;
      cursor = shiftDay(cursor, -1);
    }
    return count;
  }, [records, today]);

  if (!unlocked) return <PassphraseGate />;

  const atToday = activeDay >= today;
  const atStart = activeDay <= PROGRAM.startDate;
  const isToday = activeDay === today;
  const pct = Math.round(progress * 100);

  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-5 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl leading-none" style={{ fontFamily: 'Bangers, system-ui' }}>
            {PROGRAM.title}
          </h1>
          {PROGRAM.subtitle && <p className="mt-1 text-sm text-white/45">{PROGRAM.subtitle}</p>}
        </div>
        <button
          onClick={lock}
          title="Lock"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/50 hover:text-white/80"
        >
          <LogOut size={13} /> Lock
        </button>
      </div>

      {/* Progress + streak */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="relative flex h-16 w-16 flex-none items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="16" fill="none" stroke="rgb(52,211,153)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={100} initial={false}
              animate={{ strokeDashoffset: 100 - pct }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              pathLength={100}
            />
          </svg>
          <span className="absolute text-sm font-bold">{pct}%</span>
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-white/40">
            Day {programDay} of {PROGRAM.durationDays}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-amber-300">
            <Flame size={15} /> {streak} day{streak === 1 ? '' : 's'} streak
          </div>
        </div>
      </div>

      {/* Day navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setActiveDay(shiftDay(activeDay, -1))}
          disabled={atStart}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/60 disabled:opacity-25 hover:text-white"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {isToday ? 'Today' : new Date(parseDay(activeDay)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          {!isToday && (
            <button onClick={() => setActiveDay(today)} className="text-[11px] text-emerald-300 hover:underline">
              jump to today
            </button>
          )}
        </div>
        <button
          onClick={() => setActiveDay(shiftDay(activeDay, 1))}
          disabled={atToday}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/60 disabled:opacity-25 hover:text-white"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Checklist */}
      <div className="mt-4">
        <DayChecklist />
      </div>

      {/* Daily note */}
      <div className="mt-6">
        <label className="text-xs uppercase tracking-widest text-white/40">Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did today go?"
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-emerald-400/50"
        />
      </div>

      <p className="mt-8 text-center text-[11px] text-white/25">
        Saved on this device. Edit the program in <code>src/transform/program.ts</code>.
      </p>
    </div>
  );
}
