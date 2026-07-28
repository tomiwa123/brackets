import { create } from 'zustand';
import type { ChecklistItem } from './program';
import {
  storage,
  dayStr,
  isoWeekKey,
  type DayRecord,
  type RecordMap,
} from './storage';

// Light client-side gate. This keeps casual visitors out of the page; it is NOT
// real authentication. Move to Firebase Auth (see docs/transformation-plan.md)
// when the data becomes sensitive or shared.
const PASSPHRASE = (import.meta.env.VITE_TRANSFORM_PASSPHRASE as string | undefined) || 'letmein';
const SESSION_KEY = 'transform:unlocked';

/** Which stored record key an item's state lives under, for a given day. */
export function recordKeyFor(item: ChecklistItem, dayString: string): string {
  if (item.cadence === 'weekly') return isoWeekKey(dayString);
  if (item.cadence === 'once') return 'milestones';
  return dayString;
}

interface TransformState {
  unlocked: boolean;
  wrongAttempt: boolean;
  records: RecordMap;
  activeDay: string; // YYYY-MM-DD currently being viewed/edited

  unlock: (attempt: string) => boolean;
  lock: () => void;
  setActiveDay: (day: string) => void;
  isChecked: (item: ChecklistItem) => boolean;
  toggle: (item: ChecklistItem) => void;
  setNote: (note: string) => void;
  getNote: () => string;
}

function emptyRecord(key: string): DayRecord {
  return { key, completed: {}, updatedAt: Date.now() };
}

export const useTransformStore = create<TransformState>((set, get) => ({
  unlocked: sessionStorage.getItem(SESSION_KEY) === '1',
  wrongAttempt: false,
  records: storage.loadAll(),
  activeDay: dayStr(),

  unlock: (attempt) => {
    const ok = attempt === PASSPHRASE;
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, '1');
      set({ unlocked: true, wrongAttempt: false });
    } else {
      set({ wrongAttempt: true });
    }
    return ok;
  },

  lock: () => {
    sessionStorage.removeItem(SESSION_KEY);
    set({ unlocked: false });
  },

  setActiveDay: (day) => set({ activeDay: day }),

  isChecked: (item) => {
    const key = recordKeyFor(item, get().activeDay);
    return Boolean(get().records[key]?.completed[item.id]);
  },

  toggle: (item) => {
    const key = recordKeyFor(item, get().activeDay);
    const records = { ...get().records };
    const rec = records[key] ? { ...records[key], completed: { ...records[key].completed } } : emptyRecord(key);
    rec.completed[item.id] = !rec.completed[item.id];
    rec.updatedAt = Date.now();
    records[key] = rec;
    storage.saveAll(records);
    set({ records });
  },

  setNote: (note) => {
    const key = get().activeDay;
    const records = { ...get().records };
    const rec = records[key] ? { ...records[key] } : emptyRecord(key);
    rec.note = note;
    rec.updatedAt = Date.now();
    records[key] = rec;
    storage.saveAll(records);
    set({ records });
  },

  getNote: () => get().records[get().activeDay]?.note ?? '',
}));
