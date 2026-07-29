import React from 'react';
import {
  Bell,
  CheckCircle,
  Coins,
  CreditCard,
  PlusCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Currency, User } from '../types';
import { soundManager } from '../lib/audio';
import { isTelegramMiniApp } from '../lib/telegram';
import { ShieldCheck } from 'lucide-react';

interface HeaderNavbarProps {
  user: User;
  activeCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
  onOpenWallet: (tab?: 'deposit' | 'withdraw' | 'history') => void;
  onOpen2FA: () => void;
  onOpenAdmin: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleAdminRole: () => void;
  onOpenOffer?: () => void;
}

const CURRENCIES: { code: Currency; symbol: string; bg: string; text: string }[] = [
  { code: 'USDT', symbol: '₮', bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400' },
  { code: 'TON', symbol: '💎', bg: 'bg-sky-500/20 border-sky-500/40', text: 'text-sky-400' },
  { code: 'USD', symbol: '$', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400' },
  { code: 'RUB', symbol: '₽', bg: 'bg-indigo-500/20 border-indigo-500/40', text: 'text-indigo-400' },
  { code: 'STARS', symbol: '⭐', bg: 'bg-purple-500/20 border-purple-500/40', text: 'text-purple-400' },
  { code: 'EUR', symbol: '€', bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' },
];

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  user,
  activeCurrency,
  onSelectCurrency,
  onOpenWallet,
  onOpen2FA,
  onOpenAdmin,
  onOpenNotifications,
  unreadNotificationsCount,
  isMuted,
  onToggleMute,
  onToggleAdminRole,
  onOpenOffer,
}) => {
  const currentCurrMeta = CURRENCIES.find((c) => c.code === activeCurrency) || CURRENCIES[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-amber-400 text-xl tracking-wider">
              ♠️
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-100 uppercase">
                Дурак <span className="text-amber-400 font-bold">Online</span>
              </span>
              {isTelegramMiniApp() && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-400 rounded-md border border-sky-500/30 flex items-center gap-1">
                  <Send className="w-2.5 h-2.5" /> TMA
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Real-Money Table Platform</span>
            </div>
          </div>
        </div>

        {/* Multi-Currency Balance Pills & Wallet Actions */}
        <div className="flex items-center gap-2">
          {/* Active Balance Pill & Currency Picker */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 shadow-inner">
            <select
              value={activeCurrency}
              onChange={(e) => onSelectCurrency(e.target.value as Currency)}
              className="bg-slate-900 text-slate-200 font-bold text-xs rounded-lg px-2 py-1 border border-slate-700 outline-none cursor-pointer hover:border-amber-500/50 transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>

            <div className="px-2.5 py-0.5 flex items-center gap-1 font-mono font-extrabold text-sm text-slate-100">
              <span className={currentCurrMeta.text}>{user.balances[activeCurrency]?.toLocaleString() ?? 0}</span>
              <span className="text-xs text-slate-400 font-normal">{activeCurrency}</span>
            </div>

            <button
              onClick={() => onOpenWallet('deposit')}
              className="ml-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-amber-500/20 active:scale-95"
              title="Deposit Funds"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Пополнить</span>
            </button>

            <button
              onClick={() => onOpenWallet('withdraw')}
              className="ml-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95"
              title="Withdraw Funds"
            >
              <Send className="w-3 h-3 text-sky-400" />
            </button>
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center gap-1">
            {/* 2FA Status Badge */}
            <button
              onClick={onOpen2FA}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
                user.is2FAEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title={user.is2FAEnabled ? '2FA Protected' : 'Enable 2FA Protection'}
            >
              {user.is2FAEnabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              <span className="hidden md:inline font-semibold text-[11px]">{user.is2FAEnabled ? '2FA Active' : '2FA Off'}</span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Offer + Auth */}
            <button onClick={onOpenOffer} className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors" title="Оферта / Конфиденциальность">
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAdmin}
              className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                user.role === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/40 shadow-lg shadow-purple-500/20 hover:brightness-110'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <ShieldEllipsis className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-amber-500/40"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{user.username}</div>
                <div className="text-[10px] text-amber-400 font-mono">Risk Score: {user.riskScore}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
