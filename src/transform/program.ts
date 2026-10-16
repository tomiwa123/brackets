// Transformation Program — immutable checklist definitions per era.

export type Priority = 'P00' | 'P0' | 'P1' | 'P2';
export type Cadence = 'daily' | 'weekly' | 'once';

export interface ChecklistItem {
  /** Stable id — history is keyed on this, so never reuse it for a new item. */
  id: string;
  label: string;
  priority: Priority;
  cadence: Cadence;
  category?: string;
  hint?: string;
}

export type ChecklistId = 'legacy' | 'era-3';

export interface EraConfig {
  id: string;
  name: string;
  description: string;
  startDate: string;
  status: 'active' | 'archived';
  checklistId: ChecklistId;
  retiredOn?: string;
}

export interface ProgramConfig {
  title: string;
  subtitle?: string;
  durationDays: number;
  activeEraId: string;
  eras: EraConfig[];
  checklists: Record<ChecklistId, readonly ChecklistItem[]>;
}

export const PRIORITY_META: Record<Priority, { label: string; blurb: string }> = {
  P00: { label: 'P00', blurb: 'Foundation — protect these first every day.' },
  P0: { label: 'P0', blurb: 'Non-negotiable — do these every day.' },
  P1: { label: 'P1', blurb: 'High-leverage — aim for these daily.' },
  P2: { label: 'P2', blurb: 'Bonus — nice-to-have.' },
};

const LEGACY_CHECKLIST = [
  { id: 'p0-hydration', label: 'Hydration', priority: 'P0', cadence: 'daily' },
  { id: 'p0-meditation', label: 'Meditation', priority: 'P0', cadence: 'daily' },
  { id: 'p0-bible', label: 'Bible reading', priority: 'P0', cadence: 'daily' },
  { id: 'p0-skincare', label: 'Skincare routine', priority: 'P0', cadence: 'daily' },
  { id: 'p0-french', label: 'French practice', priority: 'P0', cadence: 'daily' },
  { id: 'p0-journal', label: 'journalling/call tribe', priority: 'P0', cadence: 'daily' },
  { id: 'p0-reading', label: '15 pages reading', priority: 'P0', cadence: 'daily' },
  { id: 'p0-pushups', label: '100 pushups', priority: 'P0', cadence: 'daily' },
  { id: 'p0-adventure', label: '1 Adventure', priority: 'P0', cadence: 'daily' },
  { id: 'p1-workout', label: 'Workout', priority: 'P1', cadence: 'daily' },
  { id: 'p1-saxophone', label: 'Saxophone', priority: 'P1', cadence: 'daily' },
  { id: 'p1-nighttime', label: 'Nighttime routine', priority: 'P1', cadence: 'daily' },
  { id: 'p1-planks', label: '5 min of planks', priority: 'P1', cadence: 'daily' },
] as const satisfies readonly ChecklistItem[];

const ERA_3_CHECKLIST = [
  { id: 'p0-hydration', label: 'hydration', priority: 'P00', cadence: 'daily' },
  { id: 'p0-meditation', label: 'meditation', priority: 'P00', cadence: 'daily' },
  { id: 'p0-french', label: 'french', priority: 'P00', cadence: 'daily' },
  { id: 'p0-adventure', label: 'models', priority: 'P00', cadence: 'daily' },
  { id: 'p0-bible', label: 'spiritual', priority: 'P0', cadence: 'daily' },
  { id: 'p0-skincare', label: 'skincare', priority: 'P0', cadence: 'daily' },
  { id: 'p0-journal', label: 'journaling/tribe', priority: 'P0', cadence: 'daily' },
  { id: 'p0-reading', label: 'reading', priority: 'P0', cadence: 'daily' },
  { id: 'p0-pushups', label: 'exercise', priority: 'P0', cadence: 'daily' },
] as const satisfies readonly ChecklistItem[];

export const PROGRAM: ProgramConfig = {
  title: '3-Month Transformation',
  subtitle: 'Small boxes, every day. That is the whole game.',
  durationDays: 90,
  activeEraId: 'era-3',
  eras: [
    {
      id: 'era-1', name: 'Era 1', description: 'First attempt', startDate: '2026-07-27',
      status: 'archived', retiredOn: '2026-08-22', checklistId: 'legacy',
    },
    {
      id: 'era-2', name: 'Era 2', description: 'Second attempt', startDate: '2026-08-23',
      status: 'archived', retiredOn: '2026-09-13', checklistId: 'legacy',
    },
    {
      id: 'era-3', name: 'Era 3', description: 'Third attempt', startDate: '2026-10-15',
      status: 'active', checklistId: 'era-3',
    },
  ],
  checklists: { legacy: LEGACY_CHECKLIST, 'era-3': ERA_3_CHECKLIST },
};

export function checklistForEra(eraId: string): readonly ChecklistItem[] {
  const era = PROGRAM.eras.find((candidate) => candidate.id === eraId);
  if (!era) throw new Error(`Unknown transformation era: ${eraId}`);
  return PROGRAM.checklists[era.checklistId];
}
