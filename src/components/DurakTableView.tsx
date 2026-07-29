import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  MessageCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CardSuit, GameTable, PlayerState, TablePair, User } from '../types';
import { soundManager } from '../lib/audio';
import { triggerHapticFeedback } from '../lib/telegram';
import { ShareTableModal } from './ShareTableModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CardComponent as Card } from './Card';
import { Hand } from './Hand';
import { CardBack } from './CardBack';

interface DurakTableViewProps {
  user: User;
  table: GameTable;
  onBackToLobby: () => void;
  onAttack: (cardId: string) => void;
  onDefend: (cardId: string, pairId: string) => void;
  onTransfer: (cardId: string) => void;
  onBito: () => void;
  onTake: () => void;
  onAddBot: () => void;
  onSendChat: (text: string) => void;
}

const SUIT_ICONS: Record<CardSuit, { symbol: string; color: string }> = {
  hearts: { symbol: '♥️', color: 'text-red-500' },
  diamonds: { symbol: '♦️', color: 'text-red-500' },
  spades: { symbol: '♠️', color: 'text-slate-100' },
  clubs: { symbol: '♣️', color: 'text-slate-100' },
};

export const DurakTableView: React.FC<DurakTableViewProps> = ({
  user,
  table,
  onBackToLobby,
  onAttack,
  onDefend,
  onTransfer,
  onBito,
  onTake,
  onAddBot,
  onSendChat,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [feedback, setFeedback] = useState<'play' | 'defend' | 'bito' | 'take' | null>(null);

  const me = table.players.find((p) => p.id === user.id);
  const attacker = table.players[table.attackerIndex];
  const defender = table.players[table.defenderIndex];

  const isMyTurnToAttack = attacker?.id === user.id;
  const isMyTurnToDefend = defender?.id === user.id;

  useEffect(() => {
    if (!feedback) return;
    // sound/haptic
    if (feedback === 'play') soundManager.playCardPlay();
    if (feedback === 'defend') soundManager.playDefend();
    if (feedback === 'bito') soundManager.playBito();
    if (feedback === 'take') soundManager.playTake();
    triggerHapticFeedback(feedback === 'bito' || feedback === 'take' ? 'success' : 'light');
    const t = setTimeout(() => setFeedback(null), 420);
    return () => clearTimeout(t);
  }, [feedback]);

  // Trigger victory fanfare and confetti when game finishes and current user won
  useEffect(() => {
    if (table.status === 'finished' && table.winnerIds.includes(user.id)) {
      soundManager.playVictoryFanfare();
      triggerHapticFeedback('success');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [table.status, table.winnerIds, user.id]);

  const handleCardClick = (card: import('../types').Card) => {
    soundManager.playCardFlip();
    triggerHapticFeedback('light');
    if (isMyTurnToAttack) setFeedback('play');

    if (isMyTurnToAttack) {
      onAttack(card.id);
      setSelectedCardId(null);
    } else if (isMyTurnToDefend) {
      if (selectedCardId === card.id) {
        setSelectedCardId(null);
      } else {
        setSelectedCardId(card.id);
      }
    } else {
      setSelectedCardId(card.id);
    }
  };

  const handlePairClick = (pair: TablePair) => {
    if (isMyTurnToDefend && selectedCardId && !pair.defendCard) {
      onDefend(selectedCardId, pair.id);
      soundManager.playDefend();
      triggerHapticFeedback('medium');
      setFeedback('defend');
      setSelectedCardId(null);
    } else {
      setSelectedPairId(pair.id);
    }
  };

  const handleSendChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const sendQuickEmoji = (emoji: string) => {
    onSendChat(emoji);
    triggerHapticFeedback('light');
  };

  // Render individual Card UI
  const renderPairCard = (card: import('../types').Card, isTrump = false, onClick?: () => void) => {
    return (
      <Card card={card} isTrump={isTrump} onClick={onClick} />
    );
  };

  return (
    <div className="relative min-h-[85vh] bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 rounded-3xl border border-emerald-800/40 p-3 sm:p-6 shadow-2xl overflow-hidden flex flex-col justify-between">
      {/* Felt Vignette Texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Table Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToLobby}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Лобби
          </button>

          <div>
            <h2 className="font-extrabold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <span>{table.name}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[10px] uppercase">
                {table.mode}
              </span>
            </h2>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Банк: {table.stake * table.players.length} {table.currency}</span>
              <span>•</span>
              <span>Колода: {table.deckSize} карт</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Share Link Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            title="Пригласить друга / Поделиться ссылкой"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Поделиться</span>
          </button>

          {/* Add Bot Button if space */}
          {table.status === 'waiting' && table.players.length < table.maxPlayers && (
            <button
              onClick={onAddBot}
              className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Bot className="w-4 h-4" /> + Бота
            </button>
          )}

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="relative p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {table.chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Main Table Felt Play Area */}
      <div className="relative z-10 flex-1 my-4 flex flex-col justify-between items-center gap-4">
        {/* Opponents Area (Top / Sides) */}
        <div className="w-full flex items-center justify-around gap-2">
          {table.players
            .filter((p) => p.id !== user.id)
            .map((p) => {
              const isCurrentAttacker = attacker?.id === p.id;
              const isCurrentDefender = defender?.id === p.id;

              return (
                <div
                  key={p.id}
                  className={`relative p-3 rounded-2xl bg-slate-900/90 border transition-all flex items-center gap-3 shadow-xl backdrop-blur-md ${
                    isCurrentDefender
                      ? 'border-sky-500 ring-2 ring-sky-500/40'
                      : isCurrentAttacker
                      ? 'border-amber-500 ring-2 ring-amber-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={p.avatar}
                      alt={p.username}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700"
                    />
                    {p.isBot && (
                      <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white font-bold text-[9px] px-1 rounded-md">
                        BOT
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-xs text-slate-100 flex items-center gap-1">
                      <span>{p.username}</span>
                      {p.isOut && <span className="text-emerald-400 text-[10px]">(Вышел)</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <span>🎴 {p.cards.length} карт</span>
                      {isCurrentAttacker && <span className="text-amber-400 font-bold">• Атака</span>}
                      {isCurrentDefender && <span className="text-sky-400 font-bold">• Защита</span>}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Center Field: Deck Stack + Table Pairs */}
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-6 my-auto">
          {/* Deck & Trump Card Indicator */}
          <div className="relative w-24 h-32 flex items-center justify-center shrink-0">
            {/* Trump Card (horizontal under deck) */}
            {table.trumpCard && (
              <div className="absolute rotate-90 transform translate-x-3 translate-y-1 shadow-2xl">
                <Card card={table.trumpCard} isTrump />
              </div>
            )}

            {/* Main Deck Stack */}
            {table.deck.length > 0 ? (
              <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border-2 border-indigo-500/60 shadow-2xl flex flex-col items-center justify-center p-2 text-center text-slate-200">
                <span className="font-extrabold font-mono text-lg text-amber-400">
                  {table.deck.length}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                  в колоде
                </span>
                <CardBack className="absolute inset-0 m-auto opacity-20" />
              </div>
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-slate-700/60 flex items-center justify-center text-slate-600 font-bold text-xs">
                Колода пуста
              </div>
            )}

            {/* Trump Suit Label */}
            {table.trumpSuit && (
              <div className="absolute -top-3 right-0 bg-slate-900 border border-amber-500/40 rounded-full px-2 py-0.5 text-xs font-bold text-amber-400 shadow-md">
                {SUIT_ICONS[table.trumpSuit].symbol} Козырь
              </div>
            )}
          </div>

          {/* Table Active Pairs Field */}
          <div className="flex-1 min-h-[140px] bg-slate-950/60 rounded-2xl border border-emerald-900/40 p-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 shadow-inner">
            {table.status === 'waiting' ? (
              <div className="flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ожидание подключения игроков ({table.players.length}/{table.maxPlayers})</span>
                </div>
                <p className="text-xs text-slate-300 max-w-sm">
                  Поделитесь прямым веб-ссылкой или ID стола с другом, либо добавьте виртуального соперника.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Пригласить друга / Поделиться</span>
                  </button>
                  {table.players.length < table.maxPlayers && (
                    <button
                      onClick={onAddBot}
                      className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Bot className="w-4 h-4" />
                      <span>+ Добавить бота</span>
                    </button>
                  )}
                </div>
              </div>
            ) : table.tablePairs.length === 0 ? (
              <div className="text-slate-500 text-xs font-semibold tracking-wide text-center">
                Ждем первого хода...
              </div>
            ) : (
              table.tablePairs.map((pair) => (
                <motion.div
                  key={pair.id}
                  onClick={() => handlePairClick(pair)}
                  className={`relative w-20 h-28 sm:w-24 sm:h-32 transition-all ${
                    isMyTurnToDefend && selectedCardId && !pair.defendCard ? 'ring-2 ring-amber-400 rounded-xl cursor-pointer animate-pulse' : ''
                  }`}
                  initial={{ scale: 0.8, opacity: 0, y: -18 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <motion.div
                    className="absolute top-0 left-0"
                    initial={{ y: -28, rotate: -6 }}
                    animate={{ y: 0, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    {renderPairCard(pair.attackCard, pair.attackCard.suit === table.trumpSuit)}
                  </motion.div>
                  {pair.defendCard && (
                    <motion.div
                      className="absolute top-4 left-4 rotate-6 transform shadow-2xl"
                      initial={{ y: 28, rotate: 8 }}
                      animate={{ y: 0, rotate: 6 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    >
                      {renderPairCard(pair.defendCard, pair.defendCard.suit === table.trumpSuit)}
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="w-full flex flex-wrap items-center justify-center gap-3">
          {isMyTurnToDefend && (
            <button
              onClick={onTake}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>БЕРУ (Take All)</span>
            </button>
          )}

          {isMyTurnToAttack && (
            <button
              onClick={() => { setFeedback("bito"); onBito(); }}
              disabled={table.tablePairs.length === 0 || table.tablePairs.some((p) => !p.defendCard)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>БИТО (Discard)</span>
            </button>
          )}

          {table.mode === 'perevodnoy' && isMyTurnToDefend && selectedCardId && (
            <button
              onClick={() => onTransfer(selectedCardId)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ПЕРЕВОД (Transfer)</span>
            </button>
          )}
        </div>

        {/* Current Player Hand (Bottom) */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-bold text-slate-200">
              Ваша рука ({me?.cards.length || 0} карт):
            </span>
            {isMyTurnToAttack && <span className="text-amber-400 font-bold animate-pulse">Ваш ход — Атакуйте!</span>}
            {isMyTurnToDefend && <span className="text-sky-400 font-bold animate-pulse">Ваш ход — Защищайтесь!</span>}
          </div>

          <Hand
            cards={me?.cards || []}
            trumpSuit={table.trumpSuit ?? undefined}
            selectedCardId={selectedCardId}
            onCardClick={(card) => handleCardClick(card)}
          />
        </div>
      </div>

      {/* In-Game Table Chat Popup */}
      {showChat && (
        <div className="absolute right-4 bottom-20 z-40 bg-slate-900 border border-slate-800 rounded-2xl w-80 shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-xs text-slate-200">Чат стола</span>
            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-44 overflow-y-auto space-y-2 text-xs pr-1">
            {table.chatMessages.map((m) => (
              <div key={m.id} className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60">
                <div className="flex justify-between font-bold text-[10px] text-amber-400 mb-0.5">
                  <span>{m.sender}</span>
                  <span className="text-slate-500 font-mono">{m.time}</span>
                </div>
                <div className="text-slate-200 text-xs">{m.text}</div>
              </div>
            ))}
          </div>

          {/* Quick Reaction Emojis */}
          <div className="flex justify-between text-base pt-1">
            {['🔥', '👏', '💩', '🤡', '💸', '😎'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendQuickEmoji(emoji)}
                className="hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendChatSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
              placeholder="Сообщение..."
            />
            <button type="submit" className="p-2 bg-amber-500 text-slate-950 font-bold rounded-xl">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Victory / Finish Dialog */}
      {table.status === 'finished' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto text-3xl">
              🏆
            </div>

            <h2 className="text-2xl font-black text-slate-100">Игра завершена!</h2>

            <div className="space-y-1 text-xs">
              {table.winnerIds.map((id, idx) => {
                const winnerPlayer = table.players.find((p) => p.id === id);
                return (
                  <div key={id} className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl">
                    Победитель #{idx + 1}: {winnerPlayer?.username || id}
                  </div>
                );
              })}

              {table.loserId && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-xl mt-2">
                  ДУРАК МАТЧА 💩: {table.players.find((p) => p.id === table.loserId)?.username}
                </div>
              )}
            </div>

            <button
              onClick={onBackToLobby}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20"
            >
              Вернуться в лобби
            </button>
          </div>
        </div>
      )}

      {/* Share Table Modal */}
      <ShareTableModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        table={table}
      />
    </div>
  );
};
