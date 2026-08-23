// Versioned local persistence for the transformation program.
//
import { PROGRAM } from './program';

// Firestore is the canonical cross-device store, while localStorage remains a
// synchronous safety net and the source of the original v1 history. Migration
// never rewrites or deletes the v1 value.

export interface DayRecord {
  /** The period key this record belongs to (a day, ISO week, or milestone). */
  key: string;
  /** itemId -> checked. Absent = unchecked. */
  completed: Record<string, boolean>;
  /** Optional free-text note for the day. */
  note?: string;
  /** Client timestamp retained for deterministic conflict resolution. */
  updatedAt: number;
  /** Preserve future/unknown v1 fields during migration. */
  [field: string]: unknown;
}

export type RecordMap = Record<string, DayRecord>;
export type EraStatus = 'active' | 'archived';

export interface EraData {
  id: string;
  name: string;
  description: string;
  startDate: string;
  durationDays: number;
  status: EraStatus;
  retiredOn?: string;
  records: RecordMap;
}

export interface TransformDataV2 {
  schemaVersion: 2;
  activeEraId: string;
  eras: Record<string, EraData>;
}

export interface MigrationSource {
  rawV1: string;
  fingerprint: string;
  recordCount: number;
}

export interface LocalLoadResult {
  data: TransformDataV2;
  migrationSource: MigrationSource | null;
  migrated: boolean;
  recoveryBlocked: boolean;
  warning: string | null;
}

export const V1_STORAGE_KEY = 'transform:v1:records';
export const V1_BACKUP_KEY = 'transform:v1:backup';
export const V2_STORAGE_KEY = 'transform:v2:data';

export const ERA_1_ID = 'era-1';
export const ERA_2_ID = 'era-2';
export const ERA_2_START = PROGRAM.eras.find((era) => era.id === ERA_2_ID)?.startDate ?? '2026-08-23';

export function createEmptyTransformData(): TransformDataV2 {
  const eras = Object.fromEntries(
    PROGRAM.eras.map((era) => [
      era.id,
      {
        ...era,
        durationDays: PROGRAM.durationDays,
        records: {},
      },
    ]),
  ) as Record<string, EraData>;

  return {
    schemaVersion: 2,
    activeEraId: PROGRAM.activeEraId,
    eras,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDayRecord(value: unknown): value is DayRecord {
  if (!isObject(value) || typeof value.key !== 'string' || !isObject(value.completed)) return false;
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return false;
  if ('note' in value && value.note !== undefined && typeof value.note !== 'string') return false;
  return Object.values(value.completed).every((checked) => typeof checked === 'boolean');
}

export function isRecordMap(value: unknown): value is RecordMap {
  return isObject(value) && Object.values(value).every(isDayRecord);
}

export function isTransformDataV2(value: unknown): value is TransformDataV2 {
  if (!isObject(value) || value.schemaVersion !== 2 || value.activeEraId !== ERA_2_ID) return false;
  if (!isObject(value.eras) || !(ERA_1_ID in value.eras) || !(ERA_2_ID in value.eras)) return false;

  return Object.entries(value.eras).every(([id, candidate]) => {
    if (!isObject(candidate)) return false;
    return (
      candidate.id === id &&
      typeof candidate.name === 'string' &&
      typeof candidate.description === 'string' &&
      typeof candidate.startDate === 'string' &&
      typeof candidate.durationDays === 'number' &&
      (candidate.status === 'active' || candidate.status === 'archived') &&
      (candidate.retiredOn === undefined || typeof candidate.retiredOn === 'string') &&
      isRecordMap(candidate.records)
    );
  });
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Small deterministic checksum used as an idempotency key, not for security. */
export function fingerprint(raw: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function belongsToEra2(recordKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(recordKey) && recordKey >= ERA_2_START;
}

export function migrateV1Records(records: RecordMap): TransformDataV2 {
  const data = createEmptyTransformData();

  for (const [recordKey, record] of Object.entries(records)) {
    const targetEra = belongsToEra2(recordKey) ? data.eras[ERA_2_ID] : data.eras[ERA_1_ID];
    targetEra.records[recordKey] = cloneJson(record);
  }

  const reconstructed: RecordMap = {
    ...data.eras[ERA_1_ID].records,
    ...data.eras[ERA_2_ID].records,
  };
  if (stableJson(reconstructed) !== stableJson(records)) {
    throw new Error('Era migration verification failed; the original v1 data was left untouched.');
  }

  return data;
}

function safeSet(storageBackend: Storage, key: string, value: string): string | null {
  try {
    storageBackend.setItem(key, value);
    return null;
  } catch {
    return `Browser storage could not save ${key}. The current in-memory data is still available.`;
  }
}

function migrationSourceFromRaw(rawV1: string): MigrationSource | null {
  try {
    const parsed = JSON.parse(rawV1) as unknown;
    if (!isRecordMap(parsed)) return null;
    return {
      rawV1,
      fingerprint: fingerprint(rawV1),
      recordCount: Object.keys(parsed).length,
    };
  } catch {
    return null;
  }
}

export function loadLocalTransformData(storageBackend: Storage = localStorage): LocalLoadResult {
  const rawV2 = storageBackend.getItem(V2_STORAGE_KEY);
  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2) as unknown;
      if (isTransformDataV2(parsed)) {
        const rawV1 = storageBackend.getItem(V1_STORAGE_KEY);
        return {
          data: parsed,
          migrationSource: rawV1 ? migrationSourceFromRaw(rawV1) : null,
          migrated: false,
          recoveryBlocked: false,
          warning: null,
        };
      }
    } catch {
      // Continue to v1 recovery below. The invalid v2 value is never overwritten
      // unless a verified v1 migration succeeds.
    }
  }

  const rawV1 = storageBackend.getItem(V1_STORAGE_KEY);
  if (!rawV1) {
    const data = createEmptyTransformData();
    if (rawV2) {
      return {
        data,
        migrationSource: null,
        migrated: false,
        recoveryBlocked: true,
        warning: `The existing ${V2_STORAGE_KEY} value is invalid and was left untouched. Restore it from a backup before recording new history.`,
      };
    }
    return {
      data,
      migrationSource: null,
      migrated: false,
      recoveryBlocked: false,
      warning: safeSet(storageBackend, V2_STORAGE_KEY, JSON.stringify(data)),
    };
  }

  try {
    const parsed = JSON.parse(rawV1) as unknown;
    if (!isRecordMap(parsed)) throw new Error('The existing v1 history has an unexpected shape.');

    const data = migrateV1Records(parsed);
    const backupWarning = storageBackend.getItem(V1_BACKUP_KEY)
      ? null
      : safeSet(storageBackend, V1_BACKUP_KEY, rawV1);
    const saveWarning = safeSet(storageBackend, V2_STORAGE_KEY, JSON.stringify(data));

    return {
      data,
      migrationSource: {
        rawV1,
        fingerprint: fingerprint(rawV1),
        recordCount: Object.keys(parsed).length,
      },
      migrated: true,
      recoveryBlocked: false,
      warning: backupWarning ?? saveWarning,
    };
  } catch (error) {
    return {
      data: createEmptyTransformData(),
      migrationSource: null,
      migrated: false,
      recoveryBlocked: true,
      warning:
        error instanceof Error
          ? `${error.message} The original ${V1_STORAGE_KEY} value was left untouched.`
          : `The original ${V1_STORAGE_KEY} value could not be migrated and was left untouched.`,
    };
  }
}

export function saveLocalTransformData(
  data: TransformDataV2,
  storageBackend: Storage = localStorage,
): string | null {
  return safeSet(storageBackend, V2_STORAGE_KEY, JSON.stringify(data));
}

export function downloadTransformBackup(data: TransformDataV2): void {
  const rawV1 = localStorage.getItem(V1_STORAGE_KEY);
  const content = rawV1 ?? JSON.stringify(data, null, 2);
  const version = rawV1 ? 'v1-original' : 'v2';
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `transformation-${version}-backup-${dayStr()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Date + period helpers

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
