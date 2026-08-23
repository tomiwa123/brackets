import { create } from 'zustand';
import type { ChecklistItem } from './program';
import {
  clampDayToEra,
  dayForEraOrdinal,
  eraDayNumber,
  isItemChecked,
  recordKeyFor,
} from './eras';
import { TransformationFirestoreSync, type SyncStatus } from './firestoreSync';
import {
  dayStr,
  downloadTransformBackup,
  loadLocalTransformData,
  saveLocalTransformData,
  type DayRecord,
  type RecordMap,
  type TransformDataV2,
} from './storage';

const PASSPHRASE = (import.meta.env.VITE_TRANSFORM_PASSPHRASE as string | undefined) || 'letmein';
const SESSION_KEY = 'transform:unlocked';

const localLoad = loadLocalTransformData();
const todayAtLoad = dayStr();
const initialEra = localLoad.data.eras[localLoad.data.activeEraId];

function sessionIsUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // The passphrase still protects the current in-memory session.
  }
}

function emptyRecord(key: string): DayRecord {
  return { key, completed: {}, updatedAt: Date.now() };
}

function nextTimestamp(record: DayRecord): number {
  return Math.max(Date.now(), record.updatedAt + 1);
}

function withRecord(data: TransformDataV2, eraId: string, key: string, record: DayRecord): TransformDataV2 {
  const era = data.eras[eraId];
  return {
    ...data,
    eras: {
      ...data.eras,
      [eraId]: {
        ...era,
        records: { ...era.records, [key]: record },
      },
    },
  };
}

interface TransformState {
  unlocked: boolean;
  wrongAttempt: boolean;
  data: TransformDataV2;
  selectedEraId: string;
  activeDay: string;
  comparisonOrdinal: number;
  syncStatus: SyncStatus;
  syncDetail: string | null;
  storageWarning: string | null;
  migrationNotice: string | null;
  recoveryBlocked: boolean;

  unlock: (attempt: string) => boolean;
  lock: () => void;
  startSync: () => Promise<void>;
  selectEra: (eraId: string) => void;
  setActiveDay: (day: string) => void;
  isChecked: (item: ChecklistItem) => boolean;
  toggle: (item: ChecklistItem) => void;
  setNote: (note: string) => void;
  getNote: () => string;
  downloadBackup: () => void;
}

let syncController: TransformationFirestoreSync | null = null;
let syncStart: Promise<void> | null = null;

function mergeRemoteRecords(eraId: string, incoming: RecordMap): void {
  const state = useTransformStore.getState();
  const era = state.data.eras[eraId];
  if (!era) return;

  let changed = false;
  const records = { ...era.records };
  for (const [key, remoteRecord] of Object.entries(incoming)) {
    const localRecord = records[key];
    if (!localRecord || remoteRecord.updatedAt >= localRecord.updatedAt) {
      if (!localRecord || JSON.stringify(localRecord) !== JSON.stringify(remoteRecord)) changed = true;
      records[key] = remoteRecord;
    }
  }
  if (!changed) return;

  const data: TransformDataV2 = {
    ...state.data,
    eras: { ...state.data.eras, [eraId]: { ...era, records } },
  };
  const warning = saveLocalTransformData(data);
  syncController?.updateLocalSnapshot(data);
  useTransformStore.setState({ data, ...(warning ? { storageWarning: warning } : {}) });
}

export const useTransformStore = create<TransformState>((set, get) => ({
  unlocked: sessionIsUnlocked(),
  wrongAttempt: false,
  data: localLoad.data,
  selectedEraId: localLoad.data.activeEraId,
  activeDay: clampDayToEra(initialEra, todayAtLoad, todayAtLoad),
  comparisonOrdinal: eraDayNumber(
    initialEra,
    clampDayToEra(initialEra, todayAtLoad, todayAtLoad),
  ),
  syncStatus: 'local',
  syncDetail: null,
  storageWarning: localLoad.warning,
  migrationNotice: localLoad.migrated
    ? `Era migration verified: ${localLoad.migrationSource?.recordCount ?? 0} original records preserved.`
    : null,
  recoveryBlocked: localLoad.recoveryBlocked,

  unlock: (attempt) => {
    const ok = attempt === PASSPHRASE;
    if (ok) {
      setSessionUnlocked(true);
      set({ unlocked: true, wrongAttempt: false });
    } else {
      set({ wrongAttempt: true });
    }
    return ok;
  },

  lock: () => {
    setSessionUnlocked(false);
    syncController?.stop();
    syncController = null;
    syncStart = null;
    set({ unlocked: false, syncStatus: 'local', syncDetail: null });
  },

  startSync: async () => {
    if (!get().unlocked) return;
    if (get().recoveryBlocked) {
      set({
        syncStatus: 'error',
        syncDetail: 'Cloud sync and editing are paused until the local history warning is resolved.',
      });
      return;
    }
    if (syncStart) return syncStart;

    const controller = new TransformationFirestoreSync(get().data, localLoad.migrationSource, {
      onRecords: mergeRemoteRecords,
      onStatus: (syncStatus, detail) =>
        useTransformStore.setState({ syncStatus, syncDetail: detail ?? null }),
    });
    syncController = controller;
    syncStart = controller.start();
    await syncStart;
  },

  selectEra: (eraId) => {
    const state = get();
    const currentEra = state.data.eras[state.selectedEraId];
    const targetEra = state.data.eras[eraId];
    if (!currentEra || !targetEra || currentEra.id === targetEra.id) return;
    const ordinal = state.comparisonOrdinal;
    set({
      selectedEraId: eraId,
      activeDay: dayForEraOrdinal(targetEra, ordinal, dayStr()),
      comparisonOrdinal: ordinal,
    });
  },

  setActiveDay: (day) => {
    const era = get().data.eras[get().selectedEraId];
    if (era) {
      const activeDay = clampDayToEra(era, day, dayStr());
      set({ activeDay, comparisonOrdinal: eraDayNumber(era, activeDay) });
    }
  },

  isChecked: (item) => {
    const state = get();
    const era = state.data.eras[state.selectedEraId];
    return era ? isItemChecked(era.records, item, state.activeDay) : false;
  },

  toggle: (item) => {
    const state = get();
    const era = state.data.eras[state.selectedEraId];
    if (!era || era.status === 'archived' || state.recoveryBlocked) return;

    const key = recordKeyFor(item, state.activeDay);
    const previous = era.records[key] ?? emptyRecord(key);
    const record: DayRecord = {
      ...previous,
      completed: {
        ...previous.completed,
        [item.id]: !previous.completed[item.id],
      },
      updatedAt: nextTimestamp(previous),
    };
    const data = withRecord(state.data, era.id, key, record);
    const warning = saveLocalTransformData(data);
    syncController?.updateLocalSnapshot(data);
    syncController?.saveRecord(era.id, record);
    set({ data, ...(warning ? { storageWarning: warning } : {}) });
  },

  setNote: (note) => {
    const state = get();
    const era = state.data.eras[state.selectedEraId];
    if (!era || era.status === 'archived' || state.recoveryBlocked) return;

    const key = state.activeDay;
    const previous = era.records[key] ?? emptyRecord(key);
    const record: DayRecord = {
      ...previous,
      note,
      updatedAt: nextTimestamp(previous),
    };
    const data = withRecord(state.data, era.id, key, record);
    const warning = saveLocalTransformData(data);
    syncController?.updateLocalSnapshot(data);
    syncController?.saveRecord(era.id, record);
    set({ data, ...(warning ? { storageWarning: warning } : {}) });
  },

  getNote: () => {
    const state = get();
    return state.data.eras[state.selectedEraId]?.records[state.activeDay]?.note ?? '';
  },

  downloadBackup: () => downloadTransformBackup(get().data),
}));

export { recordKeyFor } from './eras';
