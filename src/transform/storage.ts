// ─────────────────────────────────────────────────────────────────────────────
// Persistence layer for the transformation program.
// ─────────────────────────────────────────────────────────────────────────────
// History is stored as one record per period-key (a day, or an ISO week for
// weekly items). The `ProgramStorage` interface is the swap seam: today it's
// backed by localStorage (private, on-device, zero-config). To sync across
// devices later, implement the same interface against Firestore (Firebase is
// already wired in ../services/firebase) and swap `storage` at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

export interface DayRecord {
  /** The period key this record belongs to (see periodKey()). */
  key: string;
  /** itemId -> checked. Absent = unchecked. */
  completed: Record<string, boolean>;
  /** Optional free-text note for the day. */
  note?: string;
  updatedAt: number;
}

export type RecordMap = Record<string, DayRecord>;

export interface ProgramStorage {
  loadAll(): RecordMap;
  saveAll(records: RecordMap): void;
}

const STORAGE_KEY = 'transform:v1:records';

const localStorageBackend: ProgramStorage = {
  loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RecordMap) : {};
    } catch {
      return {};
    }
  },
  saveAll(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Storage full / disabled — fail quietly; the in-memory state still works.
    }
  },
};

// The active backend. Swap this line to migrate to Firestore later.
export const storage: ProgramStorage = localStorageBackend;

// ─── Date + period helpers ───────────────────────────────────────────────────

/** Local YYYY-MM-DD for a Date (defaults to now). */
export function dayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** ISO week key like "2026-W31" for a given day string. */
export function isoWeekKey(dayString: string): string {
  const d = parseDay(dayString);
  // ISO week: Thursday-anchored.
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.valueOf() - firstThursday.valueOf()) / (7 * 86400000));
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Days between two day-strings (b - a), can be negative. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).valueOf() - parseDay(a).valueOf()) / 86400000);
}
