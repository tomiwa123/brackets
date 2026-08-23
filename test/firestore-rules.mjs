import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const environment = await initializeTestEnvironment({
  projectId: 'demo-brackets',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

function validRecord() {
  return {
    schemaVersion: 2,
    eraId: 'era-2',
    key: '2026-08-23',
    payload: {
      key: '2026-08-23',
      completed: { 'p0-hydration': true },
      note: 'Restarted',
      updatedAt: 100,
    },
    clientUpdatedAt: 100,
    sourceClientId: 'test-client',
    serverUpdatedAt: serverTimestamp(),
  };
}

try {
  const firestore = environment.unauthenticatedContext().firestore();
  const programReference = doc(firestore, 'transformation/personal');
  await assertSucceeds(
    setDoc(programReference, {
      schemaVersion: 2,
      activeEraId: 'era-2',
      sourceFingerprints: ['fnv1a-test'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  const era1Reference = doc(firestore, 'transformation/personal/eras/era-1');
  await assertSucceeds(
    setDoc(era1Reference, {
      schemaVersion: 2,
      id: 'era-1',
      name: 'Era 1',
      description: 'First attempt',
      startDate: '2026-07-27',
      durationDays: 90,
      status: 'archived',
      retiredOn: '2026-08-22',
      updatedAt: serverTimestamp(),
    }),
  );

  const era2Reference = doc(firestore, 'transformation/personal/eras/era-2');
  await assertSucceeds(
    setDoc(era2Reference, {
      schemaVersion: 2,
      id: 'era-2',
      name: 'Era 2',
      description: 'Current attempt',
      startDate: '2026-08-23',
      durationDays: 90,
      status: 'active',
      updatedAt: serverTimestamp(),
    }),
  );

  const backupReference = doc(
    firestore,
    'transformation/personal/backups/v1_fnv1a-test',
  );
  await assertSucceeds(
    setDoc(backupReference, {
      schemaVersion: 1,
      sourceKey: 'transform:v1:records',
      fingerprint: 'fnv1a-test',
      recordCount: 1,
      byteLength: 2,
      stored: true,
      rawJson: '{}',
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(setDoc(backupReference, { rawJson: '{"changed":true}' }, { merge: true }));

  const recordReference = doc(
    firestore,
    'transformation/personal/eras/era-2/records/record_2026-08-23',
  );

  await assertSucceeds(setDoc(recordReference, validRecord()));
  await assertSucceeds(getDoc(recordReference));
  await assertFails(setDoc(recordReference, { ...validRecord(), unexpected: true }));
  await assertFails(deleteDoc(recordReference));

  const roomReference = doc(firestore, 'rooms/ABCD');
  await assertSucceeds(setDoc(roomReference, { roomCode: 'ABCD' }));
  await assertSucceeds(getDoc(roomReference));

  await assertFails(setDoc(doc(firestore, 'unrelated/document'), { open: true }));
  console.log('Firestore rules: 12 assertions passed.');
} finally {
  await environment.cleanup();
}
