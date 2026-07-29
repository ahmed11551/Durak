import React from 'react';
import { motion } from 'framer-motion';
import { CardSuit, PlayerState, TablePair } from '../types';
import { CardComponent as Card } from './Card';
import { CardBack } from './CardBack';

interface GameTableProps {
  trumpSuit: CardSuit | null;
  tablePairs: TablePair[];
  deckCount: number;
  currentTurn: number;
  players: PlayerState[];
}

const TRUMP_SYMBOLS: Record<CardSuit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const TRUMP_COLORS: Record<CardSuit, string> = {
  spades: 'text-slate-900',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-900',
};

const positionClasses = [
  '-top-16 left-1/2 -translate-x-1/2',
  'top-1/2 -right-10 -translate-y-1/2',
  '-bottom-16 left-1/2 -translate-x-1/2',
  'top-1/2 -left-10 -translate-y-1/2',
];

export const GameTable: React.FC<GameTableProps> = ({
  trumpSuit,
  tablePairs,
  deckCount,
  currentTurn,
  players,
}) => {
  return (
    <div
className="relative min-h-[560px] rounded-2xl shadow-inner border border-slate-700/40 table-felt"
      style={{
        background: '#f0f4f8',
      }}
    >
      {/* Felt texture area */}
      <div className="absolute inset-4 rounded-xl overflow-hidden" style={{ background: '#0f7a5a' }}>
        {/* Subtle crosshatch felt */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
      </div>

      {/* Players around */}
      <div className="relative z-10">
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`${positionClasses[idx]} flex flex-col items-center gap-1 backdrop-blur-md bg-white/70 hover:bg-white/90 transition-colors rounded-xl border border-slate-200 shadow-md px-3 py-2`}
          >
            <div className="text-xs font-bold text-slate-800 whitespace-nowrap">{player.username}</div>
            <div className="text-[10px] text-slate-500 font-mono">{player.cards.length} cards</div>
            {idx === currentTurn && (
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-wide">
                Active
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Center deck & trump */}
      <div className="absolute left-5 bottom-6 z-10 flex flex-col items-center gap-2">
        <div className="relative">
          <CardBack size="sm" />
          {deckCount > 0 && (
            <span className="absolute -bottom-1 -right-2 bg-slate-900 text-amber-300 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-amber-600/40">
              {deckCount}
            </span>
          )}
        </div>

        {trumpSuit && (
          <div className="mt-1 flex items-center gap-1 bg-white/80 border border-slate-200 rounded-lg px-2 py-1 shadow">
            <span className={`text-base font-black ${TRUMP_COLORS[trumpSuit]}`}>
              {TRUMP_SYMBOLS[trumpSuit]}
            </span>
          </div>
        )}
      </div>

      {/* Table Pairs with play/take animations */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="flex flex-wrap items-center justify-center gap-4 opacity-90">
          {tablePairs.map((pair) => (
            <motion.div
              key={pair.id}
              className="flex items-center gap-2"
              initial={{ scale: 0.8, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <motion.div
                className="shadow-xl rounded-lg"
                initial={{ y: -30, rotate: -6 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              >
                <Card card={pair.attackCard} size="sm" />
              </motion.div>
              {pair.defendCard && (
                <motion.div
                  className="shadow-xl rounded-lg"
                  initial={{ y: 30, rotate: 6 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <Card card={pair.defendCard} size="sm" />
                </motion.div>
              )}
            </motion.div>
          ))}

          {tablePairs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
              Waiting for the first move...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
