import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../services/firebase';
import {
  ERA_1_ID,
  ERA_2_ID,
  isRecordMap,
  type DayRecord,
  type EraData,
  type MigrationSource,
  type RecordMap,
  type TransformDataV2,
} from './storage';

export type SyncStatus = 'local' | 'connecting' | 'saving' | 'saved' | 'offline' | 'error';

interface SyncHandlers {
  onRecords: (eraId: string, records: RecordMap) => void;
  onStatus: (status: SyncStatus, detail?: string) => void;
}

interface StoredRecordDocument {
  schemaVersion: 2;
  eraId: string;
  key: string;
  payload: DayRecord;
  clientUpdatedAt: number;
  sourceClientId: string;
  serverUpdatedAt: ReturnType<typeof serverTimestamp>;
}

const programRef = doc(db, 'transformation', 'personal');
const eraIds = [ERA_1_ID, ERA_2_ID] as const;
const MAX_CLOUD_BACKUP_BYTES = 700_000;

function recordRef(eraId: string, key: string) {
  return doc(programRef, 'eras', eraId, 'records', `record_${encodeURIComponent(key)}`);
}

function eraRef(eraId: string) {
  return doc(programRef, 'eras', eraId);
}

function backupRef(fingerprint: string) {
  return doc(programRef, 'backups', `v1_${fingerprint}`);
}

function clientId(): string {
  const key = 'transform:client-id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `ephemeral-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function cloudRecord(
  eraId: string,
  storageKey: string,
  record: DayRecord,
  sourceClientId: string,
): StoredRecordDocument {
  return {
    schemaVersion: 2,
    eraId,
    key: storageKey,
    payload: record,
    clientUpdatedAt: record.updatedAt,
    sourceClientId,
    serverUpdatedAt: serverTimestamp(),
  };
}

function eraMetadata(era: EraData) {
  return {
    schemaVersion: 2,
    id: era.id,
    name: era.name,
    description: era.description,
    startDate: era.startDate,
    durationDays: era.durationDays,
    status: era.status,
    ...(era.retiredOn ? { retiredOn: era.retiredOn } : {}),
    updatedAt: serverTimestamp(),
  };
}

function errorDetail(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  if (code.includes('permission-denied')) {
    return 'Cloud sync is blocked until the reviewed Firestore rules are deployed. Your local history is safe.';
  }
  if (code.includes('unavailable') || !navigator.onLine) {
    return 'Offline — changes stay cached and will sync when the connection returns.';
  }
  return error instanceof Error ? error.message : 'Cloud sync failed. Your local history is still safe.';
}

function parseSnapshot(snapshot: QuerySnapshot<DocumentData, DocumentData>): RecordMap {
  const records: RecordMap = {};
  for (const document of snapshot.docs) {
    const data = document.data();
    const payload = data.payload as unknown;
    if (!payload || typeof payload !== 'object') continue;
    const storageKey = data.key as unknown;
    if (typeof storageKey !== 'string') continue;
    const candidate = { [storageKey]: payload };
    if (isRecordMap(candidate)) records[storageKey] = payload as DayRecord;
  }
  return records;
}

export class TransformationFirestoreSync {
  private readonly sourceClientId = clientId();
  private readonly unsubscribers: Unsubscribe[] = [];
  private readonly snapshotStates = new Map<string, { pending: boolean; fromCache: boolean }>();
  private localData: TransformDataV2;
  private readonly migrationSource: MigrationSource | null;
  private readonly handlers: SyncHandlers;
  private stopped = false;
  private bootstrapRunning = false;
  private metadataReady: Promise<void> | null = null;

  constructor(
    localData: TransformDataV2,
    migrationSource: MigrationSource | null,
    handlers: SyncHandlers,
  ) {
    this.localData = localData;
    this.migrationSource = migrationSource;
    this.handlers = handlers;
  }

  async start(): Promise<void> {
    if (!hasFirebaseConfig) {
      this.handlers.onStatus('error', 'Firebase configuration is missing. Changes are still saved locally.');
      return;
    }

    this.stopped = false;
    this.handlers.onStatus('connecting');
    this.attachListeners();
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    await this.bootstrap();
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  updateLocalSnapshot(data: TransformDataV2): void {
    this.localData = data;
  }

  saveRecord(eraId: string, record: DayRecord): void {
    if (!hasFirebaseConfig || this.stopped) return;
    this.handlers.onStatus(navigator.onLine ? 'saving' : 'offline');
    void this.ensureMetadata()
      .then(() =>
        setDoc(
          recordRef(eraId, record.key),
          cloudRecord(eraId, record.key, record, this.sourceClientId),
        ),
      )
      .catch((error: unknown) => {
        this.handlers.onStatus(navigator.onLine ? 'error' : 'offline', errorDetail(error));
      });
  }

  private readonly handleOnline = () => {
    this.handlers.onStatus('connecting');
    void this.bootstrap();
  };

  private readonly handleOffline = () => {
    this.handlers.onStatus('offline', 'Offline — changes stay cached and will sync when the connection returns.');
  };

  private attachListeners(): void {
    this.unsubscribers.push(
      onSnapshot(
        programRef,
        { includeMetadataChanges: true },
        (snapshot) => this.noteSnapshot('program', snapshot.metadata.hasPendingWrites, snapshot.metadata.fromCache),
        (error) => this.handlers.onStatus(navigator.onLine ? 'error' : 'offline', errorDetail(error)),
      ),
    );

    for (const eraId of eraIds) {
      this.unsubscribers.push(
        onSnapshot(
          collection(programRef, 'eras', eraId, 'records'),
          { includeMetadataChanges: true },
          (snapshot) => {
            this.handlers.onRecords(eraId, parseSnapshot(snapshot));
            this.noteSnapshot(eraId, snapshot.metadata.hasPendingWrites, snapshot.metadata.fromCache);
          },
          (error) => this.handlers.onStatus(navigator.onLine ? 'error' : 'offline', errorDetail(error)),
        ),
      );
    }
  }

  private noteSnapshot(key: string, pending: boolean, fromCache: boolean): void {
    this.snapshotStates.set(key, { pending, fromCache });
    if ([...this.snapshotStates.values()].some((state) => state.pending)) {
      this.handlers.onStatus('saving');
    } else if (!navigator.onLine || [...this.snapshotStates.values()].every((state) => state.fromCache)) {
      this.handlers.onStatus('offline', 'Offline — changes stay cached and will sync when the connection returns.');
    } else {
      this.handlers.onStatus('saved');
    }
  }

  private async ensureMetadata(): Promise<void> {
    if (!this.metadataReady) {
      this.metadataReady = (async () => {
        await setDoc(
          programRef,
          {
            schemaVersion: 2,
            activeEraId: this.localData.activeEraId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        await Promise.all(
          eraIds.map((eraId) =>
            setDoc(eraRef(eraId), eraMetadata(this.localData.eras[eraId]), { merge: true }),
          ),
        );
      })().catch((error: unknown) => {
        this.metadataReady = null;
        throw error;
      });
    }
    await this.metadataReady;
  }

  private async bootstrap(): Promise<void> {
    if (this.bootstrapRunning || this.stopped || !navigator.onLine) return;
    this.bootstrapRunning = true;

    try {
      const localRecords = eraIds.flatMap((eraId) =>
        Object.entries(this.localData.eras[eraId].records).map(([key, record]) => ({
          eraId,
          key,
          record,
        })),
      );

      if (localRecords.length === 0 && !this.migrationSource) {
        this.handlers.onStatus(
          'local',
          'No cloud history exists yet. Open this version once in the browser that holds Era 1 before starting elsewhere.',
        );
        return;
      }

      await runTransaction(db, async (transaction) => {
        const rootSnapshot = await transaction.get(programRef);
        const remoteSnapshots = await Promise.all(
          localRecords.map(({ eraId, key }) => transaction.get(recordRef(eraId, key))),
        );
        const backupSnapshot = this.migrationSource
          ? await transaction.get(backupRef(this.migrationSource.fingerprint))
          : null;

        transaction.set(
          programRef,
          {
            schemaVersion: 2,
            activeEraId: this.localData.activeEraId,
            ...(this.migrationSource
              ? { sourceFingerprints: arrayUnion(this.migrationSource.fingerprint) }
              : {}),
            ...(rootSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        for (const eraId of eraIds) {
          transaction.set(eraRef(eraId), eraMetadata(this.localData.eras[eraId]), { merge: true });
        }

        localRecords.forEach(({ eraId, key, record }, index) => {
          const remote = remoteSnapshots[index];
          const remoteUpdatedAt = remote.exists() ? Number(remote.data().clientUpdatedAt ?? 0) : 0;
          if (!remote.exists() || record.updatedAt > remoteUpdatedAt) {
            transaction.set(remote.ref, cloudRecord(eraId, key, record, this.sourceClientId));
          }
        });

        if (this.migrationSource && backupSnapshot && !backupSnapshot.exists()) {
          const byteLength = new TextEncoder().encode(this.migrationSource.rawV1).byteLength;
          transaction.set(backupRef(this.migrationSource.fingerprint), {
            schemaVersion: 1,
            sourceKey: 'transform:v1:records',
            fingerprint: this.migrationSource.fingerprint,
            recordCount: this.migrationSource.recordCount,
            byteLength,
            stored: byteLength <= MAX_CLOUD_BACKUP_BYTES,
            ...(byteLength <= MAX_CLOUD_BACKUP_BYTES ? { rawJson: this.migrationSource.rawV1 } : {}),
            createdAt: serverTimestamp(),
          });
        }
      });

      this.metadataReady = Promise.resolve();
      this.handlers.onStatus('saved');
    } catch (error) {
      this.handlers.onStatus(navigator.onLine ? 'error' : 'offline', errorDetail(error));
    } finally {
      this.bootstrapRunning = false;
    }
  }
}
