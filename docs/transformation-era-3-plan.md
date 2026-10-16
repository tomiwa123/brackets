# Transformation App — Era 3 Implementation

_Applied October 15, 2026._

## Result

October 15 is the real start of **Era 3**. The empty October 10 configuration was treated as a false start, not preserved as a separate historical era. Era 1 and Era 2 remain read-only history with their original wording, capitalization, P0/P1 grouping, records, and progress behavior.

## Era 3 checklist

| Section | Stable record ID | Label |
| --- | --- | --- |
| P00 | `p0-hydration` | `hydration` |
| P00 | `p0-meditation` | `meditation` |
| P00 | `p0-french` | `french` |
| P00 | `p0-adventure` | `models` |
| P0 | `p0-bible` | `spiritual` |
| P0 | `p0-skincare` | `skincare` |
| P0 | `p0-journal` | `journaling/tribe` |
| P0 | `p0-reading` | `reading` |
| P0 | `p0-pushups` | `exercise` |

Era 3 has no P1 section. The historical P1 items remain available in Era 1 and Era 2, and their saved completion keys are not deleted.

## Data-safety model

- Checklist definitions are immutable and versioned: `legacy` belongs to Era 1–2 and `era-3` belongs only to Era 3.
- Era records keep using stable item IDs. Display labels and grouping are resolved from the selected era's checklist version.
- Local snapshots missing checklist metadata are upgraded additively from program configuration.
- The active era, start date, status, and checklist assignment are configuration-owned, so stale browser metadata cannot restore the October 10 false start.
- Firestore metadata includes `checklistId`; rules accept only `legacy` for Era 1–2 and `era-3` for Era 3.
- The 70% streak rule remains unchanged. It uses the nine P0 items for historical eras and all nine P00/P0 items for Era 3.

## Verification

- Transformation and spelling unit tests pass.
- Firestore emulator rule assertions pass.
- Targeted transformation lint passes.
- The production TypeScript/Vite build passes.

## Acceptance criteria

- October 15, 2026 displays as Era 3, Day 1 with no carried-over checks.
- P00 contains exactly `hydration`, `meditation`, `french`, and `models`.
- P0 contains exactly `spiritual`, `skincare`, `journaling/tribe`, `reading`, and `exercise`.
- Every active label is lowercase and Era 3 has no P1 section.
- Era 1–2 retain the exact prior checklist and remain read-only.
- Local persistence, Firestore sync, backups, navigation, progress, and streaks remain era-aware.
