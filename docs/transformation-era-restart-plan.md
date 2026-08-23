# Transformation Eras — Implementation and Review Guide

## Status

Implemented locally for review. Nothing in this change has been staged,
committed, pushed, deployed, or written to the production Firestore database.

The selected persistence design is **Option A: browser → Firestore**. It reuses
the existing Firebase web configuration and database. There is no backend API,
service-account credential, Firebase Auth account, new prompt, or change to the
existing passphrase experience.

The accepted tradeoff is explicit: the passphrase remains a casual frontend
gate and the transformation collection permits unauthenticated browser access.
This matches the stated low-sensitivity, single-user use case; it is not strong
access control.

## Product result

- **Era 1** preserves the first attempt from July 27 through its August 22
  retirement boundary. It uses the same checklist and day layout, is visibly
  archived, and is read-only in normal use.
- **Era 2** starts Sunday, August 23, 2026 as a clean Day 1. Day 90 is Friday,
  November 20, 2026. Its progress and streak never include Era 1.
- Switching eras preserves the program-day number. Era 2 Day 10 opens Era 1
  Day 10. If a requested day is beyond Era 1's retirement boundary, the archive
  is clamped without losing the requested ordinal when switching back.
- A historical day with no meaningful record says “No entry recorded for this
  day,” rather than looking like a loading failure.
- Era 1 checkboxes and notes are disabled. Era 2 keeps the existing layout,
  styling, progress ring, 70% P0 streak threshold, checklist animation, and note
  field.
- The footer reports Connecting, Saving, Saved, Offline, or Save failed. Local
  history remains available if Firestore is unavailable.
- The era menu can download the untouched v1 JSON (or the current v2 data when
  no v1 source exists).

## Storage model

Local keys:

- `transform:v1:records` — original source; never rewritten or deleted.
- `transform:v1:backup` — exact automatic copy made before migration.
- `transform:v2:data` — versioned local Era 1/Era 2 cache and fallback.

Firestore paths:

```text
transformation/personal
  eras/era-1
    records/record_<encoded-period-key>
  eras/era-2
    records/record_<encoded-period-key>
  backups/v1_<source-fingerprint>
```

Each day/period is its own document, preventing a save on one day from
rewriting the entire 90-day history. The document retains the complete original
record as `payload`, a client update timestamp for deterministic merging, a
client identifier, and a Firestore server timestamp.

Firestore's persistent multi-tab web cache is enabled for the shared Firebase
instance. Local writes update the UI and v2 backup first; Firestore then queues
and synchronizes them. Snapshot listeners bring cloud changes into the local
v2 cache.

## Migration guarantees

On first load:

1. Parse v1 without changing it.
2. Deep-copy date records before August 23 into Era 1.
3. Deep-copy date records on/after August 23 into Era 2, protecting anything
   entered between the intended restart and deployment.
4. Preserve non-date period keys in Era 1 rather than dropping them.
5. Reconstruct the source map and verify exact field equality before writing
   v2.
6. Write an exact local v1 backup, then v2.
7. Use a source fingerprint and a Firestore transaction to make cloud bootstrap
   idempotent. Existing newer remote records win; missing/newer local records
   are merged rather than replacing cloud history.
8. Never initialize an empty cloud program merely because a new browser has no
   local history. The first actual edit may create metadata, and the data-holding
   browser can still merge Era 1 later without loss.

Malformed v1/v2 values are left untouched and surfaced as a visible recovery
warning. Firestore permission/network failures do not erase local data.

## Firestore rules

`firestore.rules` contains narrowly scoped public rules for
`transformation/personal/**`, payload validation, immutable backup documents,
and denied deletion. It also carries forward the existing unauthenticated
`rooms/{roomCode}` behavior and denies unmatched collections.

Important review caveat: this repository did not previously contain the live
rules file, and the local Firebase CLI login is expired. Before deploying, open
the Firebase console (or refresh CLI login), compare the current production
rules with this file, and merge any live-only rules. Deploying a rules file
replaces the active ruleset; do not skip this comparison.

## Validation completed

- Production TypeScript/Vite build passes.
- Eight local migration/navigation tests pass, including exact payload
  preservation, the restart boundary, idempotency, malformed-data recovery,
  and archived-day calculations.
- Twelve emulator assertions pass: program/era metadata, immutable v1 backup,
  valid unauthenticated transformation access, invalid-payload rejection,
  deletion rejection, existing room access, and denial of unrelated
  collections.
- The repository-wide lint command still reports pre-existing errors elsewhere
  in the tournament code. Targeted lint for the transformation implementation
  passes.

## Review and rollout sequence

1. Review the complete unstaged diff. Do not commit or push yet.
2. In the original data-holding browser, use **Download untouched history
   backup** and retain the JSON outside browser storage.
3. Compare `firestore.rules` with the current production rules and merge any
   live-only clauses.
4. Re-run `npm test`, `npm run test:rules`, and `npm run build`.
5. Only after explicit approval, deploy the reviewed Firestore rules, commit the
   intended files, and push `main` (the push triggers the Vercel production
   deployment).
6. Open `/transform` first in the browser holding v1. Confirm the migration
   notice, Firestore Saved status, record count, and several known Era 1 days.
7. Confirm August 23 is Era 2 Day 1, toggle one checkbox, refresh, and verify it
   remains. Then spot-check from a second tab/browser.

## Review focus

- Confirm public transformation reads/writes are still the desired Option A
  tradeoff.
- Confirm Era 1 should stop navigation on August 22 while still displaying “Day
  N of 90.”
- Confirm the exact Firestore rules diff against production before deployment.
- Confirm the original browser backup before the first production migration.
