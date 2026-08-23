import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PROGRAM, PRIORITY_META, type ChecklistItem, type Priority } from './program';
import { useTransformStore } from './store';

const PRIORITY_ORDER: Priority[] = ['P0', 'P1', 'P2'];

function Row({ item }: { item: ChecklistItem }) {
  const isChecked = useTransformStore((s) => s.isChecked(item));
  const toggle = useTransformStore((s) => s.toggle);
  const readOnly = useTransformStore(
    (s) => s.recoveryBlocked || s.data.eras[s.selectedEraId]?.status === 'archived',
  );

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      disabled={readOnly}
      className={`group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        isChecked
          ? 'border-emerald-400/40 bg-emerald-400/[0.07]'
          : `border-white/10 bg-white/[0.02] ${readOnly ? '' : 'hover:border-white/25'}`
      } ${readOnly ? 'cursor-default' : ''}`}
    >
      <motion.span
        animate={isChecked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.25 }}
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border ${
          isChecked ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-white/30 text-transparent'
        }`}
      >
        <Check size={14} strokeWidth={3.5} />
      </motion.span>
      <span className="flex flex-col">
        <span className={`text-sm font-medium ${isChecked ? 'text-white/45 line-through' : 'text-white/90'}`}>
          {item.label}
        </span>
        {item.hint && <span className="mt-0.5 text-xs text-white/40">{item.hint}</span>}
      </span>
      {item.cadence !== 'daily' && (
        <span className="ml-auto mt-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
          {item.cadence}
        </span>
      )}
    </button>
  );
}

export function DayChecklist() {
  const groups = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: PROGRAM.items.filter((i) => i.priority === p),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.priority} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-black ${
                group.priority === 'P0'
                  ? 'bg-rose-400/15 text-rose-300'
                  : group.priority === 'P1'
                  ? 'bg-amber-400/15 text-amber-300'
                  : 'bg-sky-400/15 text-sky-300'
              }`}
            >
              {PRIORITY_META[group.priority].label}
            </span>
            <span className="text-xs text-white/40">{PRIORITY_META[group.priority].blurb}</span>
          </div>
          <div className="flex flex-col gap-2">
            {group.items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
