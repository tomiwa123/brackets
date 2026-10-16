import { type ChecklistItem } from './program';
import {
  dayStr,
  daysBetween,
  isoWeekKey,
  parseDay,
  type DayRecord,
  type EraData,
  type RecordMap,
} from './storage';

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

export function dailyProgress(records: RecordMap, day: string, items: readonly ChecklistItem[]): number {
  const dailyItems = items.filter(
    (item) => item.cadence === 'daily' && (item.priority === 'P00' || item.priority === 'P0'),
  );
  if (dailyItems.length === 0) return 0;
  return dailyItems.filter((item) => isItemChecked(records, item, day)).length / dailyItems.length;
}

export function isChecklistComplete(records: RecordMap, day: string, items: readonly ChecklistItem[]): boolean {
  return dailyProgress(records, day, items) >= STREAK_THRESHOLD;
}

export function streakAtDay(
  records: RecordMap,
  day: string,
  currentDayIsInProgress: boolean,
  items: readonly ChecklistItem[],
): number {
  let cursor = currentDayIsInProgress && !isChecklistComplete(records, day, items) ? shiftDay(day, -1) : day;
  let count = 0;
  while (isChecklistComplete(records, cursor, items)) {
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
