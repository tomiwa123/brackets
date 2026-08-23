import { describe, expect, it } from 'vitest';
import {
  ERA_1_ID,
  ERA_2_ID,
  V1_BACKUP_KEY,
  V1_STORAGE_KEY,
  V2_STORAGE_KEY,
  createEmptyTransformData,
  loadLocalTransformData,
  migrateV1Records,
  type DayRecord,
  type RecordMap,
} from './storage';
import {
  dailyProgress,
  dayForEraOrdinal,
  eraDayNumber,
  eraProgramEnd,
  isP0Complete,
  lastRecordedDayNumber,
  recordKeyFor,
  streakAtDay,
} from './eras';
import { PROGRAM } from './program';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function record(key: string, overrides: Partial<DayRecord> = {}): DayRecord {
  return {
    key,
    completed: {},
    updatedAt: 100,
    ...overrides,
  };
}

describe('v1 to era migration', () => {
  it('preserves every payload and splits records at the Era 2 boundary', () => {
    const source: RecordMap = {
      '2026-07-27': record('2026-07-27', {
        completed: { 'p0-hydration': true, 'p0-meditation': false },
        note: 'Day one',
        updatedAt: 101,
        futureField: { untouched: true },
      }),
      '2026-W31': record('2026-W31', { completed: { 'future-weekly': true }, updatedAt: 102 }),
      milestones: record('milestones', { completed: { 'future-once': true }, updatedAt: 103 }),
      '2026-08-23': record('2026-08-23', {
        completed: { 'p0-hydration': true },
        note: 'Restarted',
        updatedAt: 104,
      }),
    };

    const migrated = migrateV1Records(source);

    expect(migrated.eras[ERA_1_ID].records).toEqual({
      '2026-07-27': source['2026-07-27'],
      '2026-W31': source['2026-W31'],
      milestones: source.milestones,
    });
    expect(migrated.eras[ERA_2_ID].records).toEqual({
      '2026-08-23': source['2026-08-23'],
    });
    expect({
      ...migrated.eras[ERA_1_ID].records,
      ...migrated.eras[ERA_2_ID].records,
    }).toEqual(source);
  });

  it('writes v2 and an exact backup without changing the original v1 value', () => {
    const backend = new MemoryStorage();
    const rawV1 = JSON.stringify({
      '2026-08-01': record('2026-08-01', {
        completed: { 'p0-bible': true },
        note: 'Still here',
      }),
    });
    backend.setItem(V1_STORAGE_KEY, rawV1);

    const first = loadLocalTransformData(backend);

    expect(first.migrated).toBe(true);
    expect(first.warning).toBeNull();
    expect(backend.getItem(V1_STORAGE_KEY)).toBe(rawV1);
    expect(backend.getItem(V1_BACKUP_KEY)).toBe(rawV1);
    expect(backend.getItem(V2_STORAGE_KEY)).not.toBeNull();
    expect(first.data.eras[ERA_1_ID].records['2026-08-01'].note).toBe('Still here');

    const second = loadLocalTransformData(backend);
    expect(second.migrated).toBe(false);
    expect(second.data).toEqual(first.data);
    expect(backend.getItem(V1_STORAGE_KEY)).toBe(rawV1);
    expect(backend.getItem(V1_BACKUP_KEY)).toBe(rawV1);
  });

  it('refuses malformed v1 data without overwriting it or manufacturing history', () => {
    const backend = new MemoryStorage();
    const malformed = '{"2026-08-01":{"completed":"not-a-map"}}';
    backend.setItem(V1_STORAGE_KEY, malformed);

    const result = loadLocalTransformData(backend);

    expect(result.warning).toContain('unexpected shape');
    expect(result.migrated).toBe(false);
    expect(result.recoveryBlocked).toBe(true);
    expect(backend.getItem(V1_STORAGE_KEY)).toBe(malformed);
    expect(backend.getItem(V2_STORAGE_KEY)).toBeNull();
    expect(result.data).toEqual(createEmptyTransformData());
  });

  it('leaves an invalid v2 value untouched when no v1 recovery source exists', () => {
    const backend = new MemoryStorage();
    const invalidV2 = '{"schemaVersion":2,"eras":"damaged"}';
    backend.setItem(V2_STORAGE_KEY, invalidV2);

    const result = loadLocalTransformData(backend);

    expect(result.warning).toContain('invalid and was left untouched');
    expect(result.recoveryBlocked).toBe(true);
    expect(backend.getItem(V2_STORAGE_KEY)).toBe(invalidV2);
    expect(result.data).toEqual(createEmptyTransformData());
  });
});

describe('era navigation and summaries', () => {
  it('maps the same ordinal between eras and clamps beyond the retired boundary', () => {
    const data = createEmptyTransformData();
    const era1 = data.eras[ERA_1_ID];
    const era2 = data.eras[ERA_2_ID];

    expect(eraDayNumber(era2, '2026-09-01')).toBe(10);
    expect(eraProgramEnd(era2)).toBe('2026-11-20');
    expect(dayForEraOrdinal(era1, 10, '2026-09-01')).toBe('2026-08-05');
    expect(dayForEraOrdinal(era1, 40, '2026-10-01')).toBe('2026-08-22');
    expect(dayForEraOrdinal(era2, 40, '2026-08-23')).toBe('2026-08-23');
  });

  it('reports the last meaningful archived day and ignores empty-shaped records', () => {
    const data = createEmptyTransformData();
    const era1 = data.eras[ERA_1_ID];
    era1.records['2026-07-29'] = record('2026-07-29');
    era1.records['2026-08-01'] = record('2026-08-01', { note: 'A note' });
    era1.records['2026-08-02'] = record('2026-08-02', { completed: { 'p0-hydration': false } });

    expect(lastRecordedDayNumber(era1)).toBe(6);
  });

  it('keeps period keys scoped by era', () => {
    const weekly = { ...PROGRAM.items[0], cadence: 'weekly' as const };
    expect(recordKeyFor(weekly, '2026-08-23')).toBe('2026-W34');
  });

  it('keeps the 70% P0 threshold and does not break a streak during an unfinished current day', () => {
    const p0Ids = PROGRAM.items.filter((item) => item.priority === 'P0').map((item) => item.id);
    const records: RecordMap = {
      '2026-08-23': record('2026-08-23', {
        completed: Object.fromEntries(p0Ids.slice(0, 7).map((id) => [id, true])),
      }),
      '2026-08-24': record('2026-08-24'),
    };

    expect(dailyProgress(records, '2026-08-23')).toBeCloseTo(7 / 9);
    expect(isP0Complete(records, '2026-08-23')).toBe(true);
    expect(streakAtDay(records, '2026-08-24', true)).toBe(1);
  });
});
