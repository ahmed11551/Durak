import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, CardSuit } from '../types';

const SUIT_ICONS: Record<CardSuit, { symbol: string; colorClass: string }> = {
  hearts:   { symbol: '♥️', colorClass: 'text-red-600' },
  diamonds: { symbol: '♦️', colorClass: 'text-red-600' },
  spades:   { symbol: '♠️', colorClass: 'text-slate-900' },
  clubs:    { symbol: '♣️', colorClass: 'text-slate-900' },
};

interface CardProps {
  card: CardType;
  isTrump?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const sizeStyles: Record<string, { w: string; h: string; p: string; rankCorner: string; suitCenter: string }> = {
  sm: { w: 'w-14', h: 'h-20', p: 'p-2', rankCorner: 'text-xs', suitCenter: 'text-2xl' },
  md: { w: 'w-20', h: 'h-28', p: 'p-3', rankCorner: 'text-sm', suitCenter: 'text-3xl' },
};

export const CardComponent: React.FC<CardProps> = ({ card, isTrump, isSelected, onClick, size = 'md' }) => {
  const suit = SUIT_ICONS[card.suit];
  const s = sizeStyles[size];

  return (
    <motion.div
      onClick={onClick}
      title={`${card.rank} ${suit.symbol}`}
      initial={{ y: -40, opacity: 0, rotate: -8 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ y: -10, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={[
        'relative rounded-xl border-2 shadow-xl select-none transition-all duration-200 flex flex-col justify-between bg-white cursor-pointer hover:-translate-y-2',
        s.w,
        s.h,
        s.p,
        isSelected ? 'border-amber-500 ring-4 ring-amber-400/40 -translate-y-3 scale-105 shadow-amber-500/30' : 'border-slate-300',
        isTrump && !isSelected ? 'border-amber-400 shadow-amber-500/20' : '',
      ].join(' ')}
    >
      <div className="flex justify-between items-center leading-none">
        <span className={`font-black font-mono ${s.rankCorner} ${suit.colorClass}`}>{card.rank}</span>
        <span className="text-xs">{suit.symbol}</span>
      </div>

      <div className={`text-center font-black my-auto select-none ${s.suitCenter} ${suit.colorClass}`}>{suit.symbol}</div>

      <div className="flex justify-between items-center leading-none rotate-180">
        <span className={`font-black font-mono ${s.rankCorner} ${suit.colorClass}`}>{card.rank}</span>
        <span className="text-xs">{suit.symbol}</span>
      </div>
    </motion.div>
  );
};
