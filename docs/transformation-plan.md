# 3-Month Transformation — Plan & Architecture

> Vision is bigger than the MVP. This doc keeps the two separate: what's shipped
> now (a satisfying, passphrase-guarded daily checklist with history) and the
> seams that let it grow into the full program without rewrites.

## Current implementation

A private page at **`/transform`** in the existing `brackets` app (reuses the
Vercel deploy, no new project). It gives you exactly what you asked for:

- **Check a box, feel it.** Springy check animation, strike-through, green fill.
- **P0 / P1 grouping.** Items are labelled by priority with a one-line intent.
- **Past days stored.** Every day is its own era-scoped record, cached locally
  and synchronized directly to Firestore after the reviewed rules are deployed.
- **Two honest attempts.** Era 1 is preserved as a read-only archive; Era 2 is
  a fresh 90-day restart beginning August 23, 2026.
- **Passphrase gate.** Light client-side lock keeps the page private.
- **Momentum.** Daily completion ring + a P0-based streak counter, plus
  "Day N of 90" so the 3-month arc is always visible.

### How to make it yours (2 things)

1. **Your list.** Open `src/transform/program.ts` and replace the seeded
   `items` with your real P0/P1 list. Structure is real; only the text is
   placeholder. Give each item a **stable `id`** (history is keyed on it).
2. **Your passphrase.** Set `VITE_TRANSFORM_PASSPHRASE` in `.env.local`
   (and in Vercel env). Defaults to `letmein` until you do.

## Architecture

```
src/transform/
  program.ts        ← single source of truth: items, priorities, cadences, eras
  storage.ts        ← versioned local cache + lossless v1 migration/backup
  eras.ts           ← era dates, ordinal mapping, progress, and streak helpers
  firestoreSync.ts  ← direct Firestore bootstrap, writes, and live/offline sync
  store.ts          ← zustand: unlock, era/day selection, toggles, notes, sync
  PassphraseGate.tsx
  DayChecklist.tsx  ← priority-grouped rows + check animation
  TransformApp.tsx  ← header, progress ring, streak, day nav, note
main.tsx            ← routes /transform → TransformApp (game stores never mount)
```

Everything renders **from `program.ts`**. Adding an item, a category, or a new
cadence needs no component changes.

### Data model

- **Item** — `{ id, label, priority: P0|P1|P2, cadence: daily|weekly|once, category?, hint? }`
- **Record** — one per era + period key: `daily` → `YYYY-MM-DD`, `weekly` →
  `YYYY-Www`, `once` → a single `milestones` bucket. Shape:
  `{ key, completed: {itemId:bool}, note?, updatedAt }`.
- **Local store** — v1 remains untouched; `transform:v1:backup` and
  `transform:v2:data` provide migration rollback and a synchronous fallback.
- **Cloud store** — separate record documents under
  `transformation/personal/eras/{eraId}/records`, with snapshot listeners and
  persistent multi-tab offline caching.

## Extensibility seams (already in place)

| You'll want to… | Do this | Why it's ready |
|---|---|---|
| Add/change habits | Edit `program.ts` | UI derives everything from it |
| Weekly/one-off items | Set `cadence` | Period-keying already handles it |
| Add a P2 "bonus" tier | Add items with `priority:'P2'` | Renders automatically |
| Add another restart | Add era metadata and reuse the era-scoped record/switching model | Records already include era ownership |
| Real auth | Replace passphrase gate with Firebase Auth | Gate is isolated in one component |
| Phases (month 1/2/3) | Add a `phase`/`startDay` field to items, filter by program day | `programDay` already computed |

## Roadmap (post-MVP, priority-ordered)

- **P2 — Weekly review view.** Roll daily records into a week grid + trend.
- **P3 — Phases.** Structure the 90 days into month-long phases with different
  emphases; auto-swap the visible checklist as you progress.
- **P3 — Reminders.** A daily nudge (email/push) if today's P0 boxes are unchecked.
- **P3 — Insights.** Completion-rate charts, best/worst habits, longest streaks.

## Suggestions (you asked)

1. **Keep P0 to ≤5 items.** The streak hangs on P0 = "all done." If P0 is huge,
   the streak resets constantly and demotivates. P1 is where breadth lives.
2. **Make items binary and unambiguous.** "Move 30 min" beats "exercise" — a box
   you can honestly check in one second is the whole dopamine loop.
3. **The note field is your journal.** One line a day compounds into a real
   record of the 3 months — worth protecting with the durable-sync upgrade early.
4. **Don't gamify away honesty.** The streak is for you; if you miss a day, a
   broken streak that's *true* is more useful than a protected one that isn't.
5. **Ship your real list first, polish later.** The infra is done — the only
   thing between you and daily use is pasting your P0/P1 items into one file.
