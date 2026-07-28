import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTransformStore } from './store';
import { PROGRAM } from './program';

export function PassphraseGate() {
  const { unlock, wrongAttempt } = useTransformStore();
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    unlock(value.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
          <Lock size={22} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl" style={{ fontFamily: 'Bangers, system-ui' }}>{PROGRAM.title}</h2>
          <p className="mt-1 text-sm text-white/50">Enter the passphrase to continue.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Passphrase"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-center outline-none focus:border-emerald-400/60"
        />
        {wrongAttempt && (
          <p className="text-xs font-semibold text-rose-400">That's not it. Try again.</p>
        )}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-400 py-3 text-sm font-black uppercase tracking-widest text-black transition-transform active:scale-95"
        >
          Unlock
        </button>
      </motion.form>
    </div>
  );
}
