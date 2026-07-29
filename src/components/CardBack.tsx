import React from 'react';

interface CardBackProps {
  className?: string;
}

export const CardBack: React.FC<CardBackProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-500 border-2 border-indigo-300 shadow-xl flex flex-col items-center justify-center gap-1 text-white select-none ${className}`}
    >
      <div className="text-[10px] tracking-widest font-bold uppercase">Durak</div>
      <div className="w-8 h-10 border border-white/40 rounded bg-white/20 flex items-center justify-center">
        <span className="text-[10px] font-black text-white/90">♠♣♥♦</span>
      </div>
      <div className="w-6 h-[1px] bg-white/50 rotate-45" />
    </div>
  );
};
