// ─────────────────────────────────────────────────────────────────────────────
// Transformation Program — data-driven config
// ─────────────────────────────────────────────────────────────────────────────
// This file is the single source of truth for the program. To adapt the program,
// you only ever edit THIS file — the UI, storage, and history are all derived
// from it. That is the "extensible" seam: add items, phases, cadences, or whole
// new sections here and everything downstream keeps working.
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = 'P0' | 'P1' | 'P2';
export type Cadence = 'daily' | 'weekly' | 'once';

export interface ChecklistItem {
  /** Stable id — history is keyed on this, so DON'T reuse an id for a new item. */
  id: string;
  label: string;
  priority: Priority;
  /** daily = resets every day; weekly = per ISO week; once = a one-time milestone. */
  cadence: Cadence;
  /** Optional grouping header shown in the UI. */
  category?: string;
  /** Optional one-line clarifier shown under the label. */
  hint?: string;
}

export interface ProgramConfig {
  title: string;
  subtitle?: string;
  /** Total length of the program in days (3 months ≈ 90). */
  durationDays: number;
  activeEraId: string;
  eras: Array<{
    id: string;
    name: string;
    description: string;
    startDate: string;
    status: 'active' | 'archived';
    retiredOn?: string;
  }>;
  items: ChecklistItem[];
}

export const PRIORITY_META: Record<Priority, { label: string; blurb: string }> = {
  P0: { label: 'P0', blurb: 'Non-negotiable — do these every day, no exceptions.' },
  P1: { label: 'P1', blurb: 'High-leverage — aim for these daily.' },
  P2: { label: 'P2', blurb: 'Bonus — nice-to-have, extend here later.' },
};

// ─── The program ────────────────────────────────────────────────────────────
export const PROGRAM: ProgramConfig = {
  title: '3-Month Transformation',
  subtitle: 'Small boxes, every day. That is the whole game.',
  durationDays: 90,
  activeEraId: 'era-2',
  eras: [
    {
      id: 'era-1',
      name: 'Era 1',
      description: 'First attempt',
      startDate: '2026-07-27',
      status: 'archived',
      retiredOn: '2026-08-22',
    },
    {
      id: 'era-2',
      name: 'Era 2',
      description: 'Current attempt',
      startDate: '2026-08-23',
      status: 'active',
    },
  ],
  items: [
    // ── P0 · Non-negotiables ────────────────────────────────────────────────
    { id: 'p0-hydration', label: 'Hydration', priority: 'P0', cadence: 'daily' },
    { id: 'p0-meditation', label: 'Meditation', priority: 'P0', cadence: 'daily' },
    { id: 'p0-bible', label: 'Bible reading', priority: 'P0', cadence: 'daily' },
    { id: 'p0-skincare', label: 'Skincare routine', priority: 'P0', cadence: 'daily' },
    { id: 'p0-french', label: 'French practice', priority: 'P0', cadence: 'daily' },
    { id: 'p0-journal', label: '1 page journalling', priority: 'P0', cadence: 'daily' },
    { id: 'p0-reading', label: '15 pages reading', priority: 'P0', cadence: 'daily' },
    { id: 'p0-pushups', label: '100 pushups', priority: 'P0', cadence: 'daily' },
    { id: 'p0-adventure', label: '1 Adventure', priority: 'P0', cadence: 'daily' },
    // ── P1 · High-leverage ──────────────────────────────────────────────────
    { id: 'p1-workout', label: 'Workout', priority: 'P1', cadence: 'daily' },
    { id: 'p1-saxophone', label: 'Saxophone', priority: 'P1', cadence: 'daily' },
    { id: 'p1-nighttime', label: 'Nighttime routine', priority: 'P1', cadence: 'daily' },
    { id: 'p1-planks', label: '5 min of planks', priority: 'P1', cadence: 'daily' },
  ],
};
