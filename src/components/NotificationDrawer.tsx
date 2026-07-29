import React from 'react';
import {
  Bell,
  CheckCheck,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  X,
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  onClose,
  onMarkAllRead,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">Push-уведомления</h2>
              <p className="text-xs text-slate-400">События игр, депозитов и безопасности</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="p-1.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 text-xs flex items-center gap-1"
              title="Mark all read"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 text-slate-400 rounded-xl hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Уведомлений пока нет
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  n.read
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                  <div className="flex items-center gap-1.5">
                    {n.type === 'deposit' || n.type === 'withdrawal' ? (
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    ) : n.type === 'bonus' ? (
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    ) : n.type === 'anti_fraud' || n.type === 'security' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>{n.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
