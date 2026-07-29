import React, { useState } from 'react';
import { Check, Copy, ExternalLink, QrCode, Send, Share2, Shield, X } from 'lucide-react';
import { GameTable } from '../types';
import { triggerHapticFeedback } from '../lib/telegram';

interface ShareTableModalProps {
  table: GameTable;
  onClose: () => void;
}

export const ShareTableModal: React.FC<ShareTableModalProps> = ({ table, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Generate invite link based on current origin
  const shareUrl = `${window.location.origin}/?table=${table.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    triggerHapticFeedback('success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(table.id);
    setCopiedCode(true);
    triggerHapticFeedback('success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTelegramShare = () => {
    triggerHapticFeedback('medium');
    const text = `🃏 Сыграем в Дурака на реальные деньги! Стол: "${table.name}" (${table.stake} ${table.currency}). Присоединяйся! 🚀`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;

    if ((window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Играть в Дурака: ${table.name}`,
          text: `Присоединяйся к игре в Дурака! Ставка: ${table.stake} ${table.currency}`,
          url: shareUrl,
        });
      } catch (e) {
        console.log('Share dismissed');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow backdrop decorative accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base">Пригласить в игру</h3>
              <p className="text-xs text-slate-400">Поделитесь ссылкой, чтобы играть вместе</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table info summary pill */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>{table.name}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-mono uppercase">
                {table.mode}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Ставка: <span className="font-mono font-bold text-amber-400">{table.stake} {table.currency}</span> • Игроков: {table.players.length}/{table.maxPlayers}
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-500">
            ID: {table.id.substring(0, 10)}...
          </div>
        </div>

        {/* Share buttons action grid */}
        <div className="space-y-3">
          {/* Direct Telegram Share */}
          <button
            onClick={handleTelegramShare}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Отправить в Telegram</span>
          </button>

          {/* Web Share or Copy Link */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Скопировать ссылку</span>
                </>
              )}
            </button>

            {navigator.share && (
              <button
                onClick={handleNativeShare}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center"
                title="Другие способы"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Direct Link Input Box */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Прямая пригласительная ссылка:
          </label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 pl-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              {copied ? 'Готово' : 'Копия'}
            </button>
          </div>
        </div>

        {/* Room Code Direct Entry */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <span>Код комнаты: <strong className="font-mono text-slate-200">{table.id}</strong></span>
          <button
            onClick={handleCopyCode}
            className="text-amber-400 hover:underline text-[11px] font-semibold"
          >
            {copiedCode ? 'Код скопирован!' : 'Скопировать код'}
          </button>
        </div>
      </div>
    </div>
  );
};
