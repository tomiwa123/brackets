import { PROGRAM, type ChecklistItem } from './program';
import {
  dayStr,
  daysBetween,
  isoWeekKey,
  parseDay,
  type DayRecord,
  type EraData,
  type RecordMap,
} from './storage';

const DAILY_P0 = PROGRAM.items.filter((item) => item.cadence === 'daily' && item.priority === 'P0');
const STREAK_THRESHOLD = 0.7;

export function shiftDay(day: string, delta: number): string {
  const date = parseDay(day);
  date.setDate(date.getDate() + delta);
  return dayStr(date);
}

export function recordKeyFor(item: ChecklistItem, day: string): string {
  if (item.cadence === 'weekly') return isoWeekKey(day);
  if (item.cadence === 'once') return 'milestones';
  return day;
}

export function eraDayNumber(era: EraData, day: string): number {
  return daysBetween(era.startDate, day) + 1;
}

export function eraProgramEnd(era: EraData): string {
  return shiftDay(era.startDate, era.durationDays - 1);
}

export function eraViewEnd(era: EraData, today: string): string {
  const programEnd = eraProgramEnd(era);
  if (era.status === 'archived' && era.retiredOn) return era.retiredOn < programEnd ? era.retiredOn : programEnd;
  return today < programEnd ? today : programEnd;
}

export function dayForEraOrdinal(era: EraData, ordinal: number, today: string): string {
  const candidate = shiftDay(era.startDate, Math.max(1, ordinal) - 1);
  const end = eraViewEnd(era, today);
  if (candidate < era.startDate) return era.startDate;
  return candidate > end ? end : candidate;
}

export function clampDayToEra(era: EraData, day: string, today: string): string {
  if (day < era.startDate) return era.startDate;
  const end = eraViewEnd(era, today);
  return day > end ? end : day;
}

export function isItemChecked(records: RecordMap, item: ChecklistItem, day: string): boolean {
  return Boolean(records[recordKeyFor(item, day)]?.completed[item.id]);
}

export function dailyProgress(records: RecordMap, day: string): number {
  if (DAILY_P0.length === 0) return 0;
  return DAILY_P0.filter((item) => isItemChecked(records, item, day)).length / DAILY_P0.length;
}

export function isP0Complete(records: RecordMap, day: string): boolean {
  return dailyProgress(records, day) >= STREAK_THRESHOLD;
}

export function streakAtDay(records: RecordMap, day: string, currentDayIsInProgress: boolean): number {
  let cursor = currentDayIsInProgress && !isP0Complete(records, day) ? shiftDay(day, -1) : day;
  let count = 0;
  while (isP0Complete(records, cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function hasMeaningfulRecord(record: DayRecord | undefined): boolean {
  if (!record) return false;
  return Object.values(record.completed).some(Boolean) || Boolean(record.note?.trim());
}

export function lastRecordedDayNumber(era: EraData): number | null {
  let last: number | null = null;
  for (const [key, record] of Object.entries(era.records)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !hasMeaningfulRecord(record)) continue;
    const ordinal = eraDayNumber(era, key);
    if (ordinal >= 1 && (last === null || ordinal > last)) last = ordinal;
  }
  return last;
}
