import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Coins,
  RefreshCw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { FraudLog, GameTable, MicroserviceHealth, PlatformConfig, User, WalletTransaction } from '../types';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [logs, setLogs] = useState<FraudLog[]>([]);
  const [health, setHealth] = useState<MicroserviceHealth[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<GameTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'users' | 'games'>('overview');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, logsRes, healthRes, txRes, usersRes, gamesRes] = await Promise.all([
        fetch('/api/admin/metrics').then((r) => r.json()),
        fetch('/api/admin/antifraud/logs').then((r) => r.json()),
        fetch('/api/microservices/health').then((r) => r.json()),
        fetch('/api/wallet/transactions').then((r) => r.json()),
        fetch('/api/admin/users').then((r) => r.json()).catch(() => ({ users: [] })),
        fetch('/api/admin/games').then((r) => r.json()).catch(() => ({ games: [] })),
      ]);

      setMetrics(metricsRes.metrics);
      setConfig(metricsRes.config);
      setLogs(logsRes.logs);
      setHealth(healthRes.services);
      setTransactions(txRes.transactions || []);
      setUsers((usersRes.users || []) as any);
      setGames((gamesRes.games || []) as any);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveSuccessMsg('Платформенные комиссии и настройки успешно обновлены!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveTx = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      await fetch('/api/admin/transactions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                Панель Администратора & Антифрод
              </h2>
              <p className="text-xs text-slate-400">
                Мониторинг комиссий, антифрод-защита, финансовые транзакции и микросервисы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-900/90">
          {['overview','transactions','users','games'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-3 py-2 text-xs font-bold rounded-none border-b-2 transition-colors ${activeTab === tab ? 'text-amber-400 border-amber-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
              {tab === 'overview' ? 'Обзор' : tab === 'transactions' ? 'Транзакции' : tab === 'users' ? 'Пользователи' : 'Игры'}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Доход Платформы (Rake)
                  </div>
                  <div className="text-xl font-mono font-black text-amber-400">
                    {metrics?.totalPlatformRakeUSD?.toLocaleString?.() || '0'}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Общий Поток Депозитов
                  </div>
                  <div className="text-xl font-mono font-black text-emerald-400">
                    {metrics?.totalDepositsUSD?.toLocaleString?.() || '0'}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Заблокировано (Anti-Fraud)
                  </div>
                  <div className="text-xl font-mono font-black text-red-400">
                    {metrics?.flaggedTransactionsCount || 0}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-sky-400" /> WebSocket Клиенты
                  </div>
                  <div className="text-xl font-mono font-black text-sky-400">
                    {metrics?.activeWebSocketClients || 1} online
                  </div>
                </div>
              </div>

              {config && (
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" /> Настройка Комиссий и Комиссионных Сборов
                    </h3>
                    {saveSuccessMsg && (
                      <span className="text-emerald-400 font-semibold text-xs">{saveSuccessMsg}</span>
                    )}
                  </div>

                  <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">
                        Комиссия на Пополнение (%):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.depositFeeDefaultPercent || 0}
                        onChange={(e) => setConfig({ ...config, depositFeeDefaultPercent: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">
                        Комиссия на Вывод средств (%):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.withdrawalFeeDefaultPercent || 0}
                        onChange={(e) => setConfig({ ...config, withdrawalFeeDefaultPercent: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">
                        Platform Rake за столом Durak (%):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={config.tableRakePercent || 0}
                        onChange={(e) => setConfig({ ...config, tableRakePercent: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                      />
                    </div>

                    <div className="md:col-span-3 flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                      >
                        <Save className="w-4 h-4" /> Сохранить настройки
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Очередь транзакций под подозрением
              </h3>
              <div className="space-y-2">
                {transactions.filter((t) => t.status === 'flagged').length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">Подозрительных транзакций нет.</div>
                ) : (
                  transactions.filter((t) => t.status === 'flagged').map((tx) => (
                    <div key={tx.id} className="p-3 bg-slate-900 border border-red-500/30 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span>{tx.username}</span>
                          <span className="text-amber-400 font-mono">Risk: {tx.riskScore}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{tx.amount} {tx.currency} via {tx.gateway} | {tx.note}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApproveTx(tx.id, 'approve')} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Одобрить</button>
                        <button onClick={() => handleApproveTx(tx.id, 'reject')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-lg flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Отклонить</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-400" /> Пользователи
              </h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(users || []).map((u: any) => (
                  <div key={u.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{u.username} <span className="text-[10px] text-slate-500">{u.email}</span></div>
                      <div className="text-[10px] text-slate-400">id: {u.id} · role: {u.role} · risk: {u.riskScore} · blocked: {String(u.isBlocked)}</div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">{new Date(u.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> Последние игры
              </h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(games || []).map((g: any) => (
                  <div key={g.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{g.mode === 'podkidnoy' ? 'Подкидной' : 'Переводной'} · {g.deckSize} карт · {g.currency} {g.stake}</div>
                      <div className="text-[10px] text-slate-400">{g.status} · {new Date(g.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-700">{g.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
