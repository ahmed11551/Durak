import React, { useState } from 'react';
import {
  Coins,
  Crown,
  Filter,
  Link as LinkIcon,
  Plus,
  Play,
  Search,
  Share2,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Currency, DurakGameMode, GameTable, User } from '../types';
import { ShareTableModal } from './ShareTableModal';

interface LobbyViewProps {
  user: User;
  tables: GameTable[];
  activeCurrency: Currency;
  onSelectTable: (tableId: string) => void;
  onCreateTable: (params: {
    name: string;
    mode: DurakGameMode;
    maxPlayers: 2 | 3 | 4;
    deckSize: 24 | 36;
    currency: Currency;
    stake: number;
    turnTimeLimitSec: number;
  }) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  user,
  tables,
  activeCurrency,
  onSelectTable,
  onCreateTable,
}) => {
  const [selectedMode, setSelectedMode] = useState<'all' | DurakGameMode>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | Currency>(activeCurrency);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [shareSelectedTable, setShareSelectedTable] = useState<GameTable | null>(null);

  // Direct Join state
  const [directCodeInput, setDirectCodeInput] = useState<string>('');

  const handleDirectJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directCodeInput.trim()) return;

    let targetId = directCodeInput.trim();
    // Parse URL parameter if full link pasted
    if (targetId.includes('table=')) {
      const match = targetId.match(/[?&]table=([^&]+)/);
      if (match && match[1]) {
        targetId = match[1];
      }
    } else if (targetId.includes('/')) {
      const parts = targetId.split('/');
      const last = parts[parts.length - 1];
      if (last.startsWith('tbl_')) {
        targetId = last;
      }
    }

    onSelectTable(targetId);
    setDirectCodeInput('');
  };

  // New Table Form state
  const [tableName, setTableName] = useState<string>('Стол Дурак');
  const [createMode, setCreateMode] = useState<DurakGameMode>('podkidnoy');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2);
  const [deckSize, setDeckSize] = useState<24 | 36>(36);
  const [stakeInput, setStakeInput] = useState<string>('10');
  const [turnTimeLimitSec, setTurnTimeLimitSec] = useState<number>(20);

  const filteredTables = tables.filter((t) => {
    if (selectedMode !== 'all' && t.mode !== selectedMode) return false;
    if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;
    if (searchQuery.trim() && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stake = parseFloat(stakeInput) || 1;
    onCreateTable({
      name: tableName,
      mode: createMode,
      maxPlayers,
      deckSize,
      currency: activeCurrency,
      stake,
      turnTimeLimitSec,
    });
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Мультивалютная Карта Игр Дурак</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Карточные Столы на Реальные Средства
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Подкидной и Переводной Дурак. Мгновенный вывод средств с низкой комиссией platform rake ({5}%), интеграция 2FA и защищенные платежные шлюзы.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Создать Стол</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMode === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все режимы
            </button>
            <button
              onClick={() => setSelectedMode('podkidnoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMode === 'podkidnoy'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Подкидной
            </button>
            <button
              onClick={() => setSelectedMode('perevodnoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMode === 'perevodnoy'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Переводной
            </button>
          </div>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="bg-slate-950 text-slate-200 font-bold text-xs px-3 py-2 rounded-xl border border-slate-800 outline-none"
          >
            <option value="all">Все валюты</option>
            <option value="USDT">₮ USDT</option>
            <option value="TON">💎 TON</option>
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="STARS">⭐ STARS</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
          {/* Direct Link / Code Input */}
          <form onSubmit={handleDirectJoinSubmit} className="relative flex-1 flex items-center gap-1">
            <div className="relative flex-1">
              <LinkIcon className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-3" />
              <input
                type="text"
                value={directCodeInput}
                onChange={(e) => setDirectCodeInput(e.target.value)}
                placeholder="Вставьте ссылку или ID стола..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              Войти
            </button>
          </form>

          {/* Search Field */}
          <div className="relative min-w-[140px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTables.map((t) => {
          const isFull = t.players.length >= t.maxPlayers;
          const isPlaying = t.status === 'playing';

          return (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px] border border-amber-500/30 uppercase">
                    {t.mode === 'podkidnoy' ? 'Подкидной' : 'Переводной'} ({t.deckSize} карт)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareSelectedTable(t);
                      }}
                      className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded-xl border border-slate-800 transition-colors"
                      title="Поделиться ссылкой стола"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 text-xs font-mono font-black text-amber-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{t.stake} {t.currency}</span>
                    </div>
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-100 text-base">{t.name}</h3>

                {/* Players Avatars */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    {t.players.map((p, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={p.avatar}
                          alt={p.username}
                          className="w-8 h-8 rounded-xl object-cover ring-2 ring-slate-800"
                          title={p.username}
                        />
                        {p.isBot && (
                          <span className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[8px] font-bold px-1 rounded-full">
                            BOT
                          </span>
                        )}
                      </div>
                    ))}
                    {Array.from({ length: t.maxPlayers - t.players.length }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-xs font-bold"
                      >
                        +
                      </div>
                    ))}
                  </div>

                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t.players.length}/{t.maxPlayers}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onSelectTable(t.id)}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isPlaying
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : isFull
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isPlaying ? 'Смотреть стол' : isFull ? 'Заполнен' : 'Войти в игру'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" /> Создать игровой стол Durak
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Название стола:
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Режим игры:
                  </label>
                  <select
                    value={createMode}
                    onChange={(e) => setCreateMode(e.target.value as DurakGameMode)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="podkidnoy">Подкидной</option>
                    <option value="perevodnoy">Переводной</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Количество игроков:
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value) as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value={2}>2 Игрока</option>
                    <option value={3}>3 Игрока</option>
                    <option value={4}>4 Игрока</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Размер колоды:
                  </label>
                  <select
                    value={deckSize}
                    onChange={(e) => setDeckSize(Number(e.target.value) as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value={36}>36 Карт (Стандарт)</option>
                    <option value={24}>24 Карты (Быстрый)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Таймер хода (сек):
                  </label>
                  <select
                    value={turnTimeLimitSec}
                    onChange={(e) => setTurnTimeLimitSec(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value={15}>15 сек (Блиц)</option>
                    <option value={20}>20 сек (Стандарт)</option>
                    <option value={30}>30 сек (Спокойный)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ставка за стол ({activeCurrency}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 font-mono text-sm text-amber-400 font-bold outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Комиссия стола (Platform Rake): 5%. Победитель забирает банк за вычетом комиссии.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Создать и войти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Table Modal */}
      {shareSelectedTable && (
        <ShareTableModal
          isOpen={!!shareSelectedTable}
          onClose={() => setShareSelectedTable(null)}
          table={shareSelectedTable}
        />
      )}
    </div>
  );
};
