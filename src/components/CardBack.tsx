import React from 'react';

interface CardBackProps {
  className?: string;
}

export const CardBack: React.FC<CardBackProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border-2 border-indigo-500/60 shadow-2xl flex flex-col items-center justify-center gap-1 text-slate-300 select-none ${className}`}
    >
      <div className="text-[10px] tracking-widest font-bold uppercase opacity-80">Durak</div>
      <div className="w-8 h-10 border border-indigo-400/60 rounded bg-indigo-800/40 flex items-center justify-center">
        <span className="text-[10px] font-black text-indigo-300">♠♣♥♦</span>
      </div>
      <div className="w-6 h-[1px] bg-indigo-400/50 rotate-45" />
    </div>
  );
};
