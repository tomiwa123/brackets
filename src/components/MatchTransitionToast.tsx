import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swords, Zap } from 'lucide-react';

interface MatchTransitionToastProps {
  matchNumber: number;
  round: string;
  onGoNow: () => void;
  onDismiss: () => void;
}

export const MatchTransitionToast: React.FC<MatchTransitionToastProps> = ({
  matchNumber,
  round,
  onGoNow,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(3);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasFiredRef.current) {
            hasFiredRef.current = true;
            onGoNow();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onGoNow]);

  // SVG countdown ring
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / 3;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.9, x: '-50%' }}
      animate={{ y: 0, opacity: 1, scale: 1, x: '-50%' }}
      exit={{ y: -80, opacity: 0, scale: 0.9, x: '-50%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed top-6 left-1/2 z-[9999] flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-2xl border border-[#00FFFF]/30 bg-black/90 backdrop-blur-xl w-[92%] max-w-[480px] sm:w-auto"
      style={{ boxShadow: '0 0 40px rgba(0,255,255,0.15), 0 8px 32px rgba(0,0,0,0.8)' }}
    >
      {/* Top row (contains info + countdown) */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        {/* Icon */}
        <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center">
          <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FFFF]" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col text-left">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#00FFFF]/60 leading-none mb-1">{round}</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white leading-tight">
            Match {matchNumber} starting
          </span>
        </div>

        {/* Countdown ring */}
        <div className="shrink-0 relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="#00FFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.4s linear' }}
            />
          </svg>
          <span className="relative text-xs sm:text-sm font-black text-white tabular-nums">{countdown}</span>
        </div>
      </div>

      {/* Separator for mobile */}
      <div className="w-full h-px bg-white/10 sm:hidden" />

      {/* Buttons (aligned right/bottom) */}
      <div className="flex items-center justify-end w-full sm:w-auto gap-2 shrink-0">
        <button
          onClick={onGoNow}
          id="toast-go-now-btn"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#00FFFF] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider hover:bg-white transition-colors cursor-pointer"
        >
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Go Now
        </button>
        <button
          onClick={onDismiss}
          id="toast-dismiss-btn"
          className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-[11px] sm:text-xs uppercase tracking-wider hover:text-white hover:border-white/30 transition-colors cursor-pointer"
        >
          Later
        </button>
      </div>
    </motion.div>
  );
};
