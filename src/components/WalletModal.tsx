import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Info,
  Lock,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { Currency, PaymentGatewayConfig, User, WalletTransaction } from '../types';
import { soundManager } from '../lib/audio';

interface WalletModalProps {
  user: User;
  activeCurrency: Currency;
  initialTab?: 'deposit' | 'withdraw' | 'history';
  gateways: PaymentGatewayConfig[];
  transactions: WalletTransaction[];
  onClose: () => void;
  onDeposit: (currency: Currency, amount: number, gatewayId: string) => Promise<boolean>;
  onWithdraw: (currency: Currency, amount: number, gatewayId: string, twoFactorCode?: string) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  onRefreshTransactions: () => void;
}

const CURRENCY_ICONS: Record<Currency, string> = {
  USDT: '₮',
  TON: '💎',
  USD: '$',
  RUB: '₽',
  STARS: '⭐',
  EUR: '€',
};

export const WalletModal: React.FC<WalletModalProps> = ({
  user,
  activeCurrency,
  initialTab = 'deposit',
  gateways,
  transactions,
  onClose,
  onDeposit,
  onWithdraw,
  onRefreshTransactions,
}) => {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>(initialTab);
  const [currency, setCurrency] = useState<Currency>(activeCurrency);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>(gateways[0]?.id || 'card_visa_mc');
  const [amountInput, setAmountInput] = useState<string>('50');
  const [twoFactorInput, setTwoFactorInput] = useState<string>('');
  const [needs2FAPrompt, setNeeds2FAPrompt] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const availableGateways = gateways.filter((g) => g.currencies.includes(currency));
  const currentGateway = gateways.find((g) => g.id === selectedGatewayId) || availableGateways[0] || gateways[0];

  const parsedAmount = parseFloat(amountInput) || 0;

  // Fee Calculations
  const depositFeePercent = currentGateway?.depositFeePercent ?? 1.5;
  const depositFeeAmount = Number(((parsedAmount * depositFeePercent) / 100).toFixed(2));
  const depositNetReceived = Math.max(0, Number((parsedAmount - depositFeeAmount).toFixed(2)));

  const withdrawFeePercent = currentGateway?.withdrawFeePercent ?? 2.5;
  const withdrawFeeAmount = Number(((parsedAmount * withdrawFeePercent) / 100).toFixed(2));
  const withdrawNetReceived = Math.max(0, Number((parsedAmount - withdrawFeeAmount).toFixed(2)));

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const ok = await onDeposit(currency, parsedAmount, currentGateway.id);
      if (ok) {
        soundManager.playCoinChink();
        setSuccessMsg(`Deposit of ${parsedAmount} ${currency} completed successfully!`);
        setAmountInput('50');
      } else {
        setErrorMsg('Deposit transaction failed. Please verify gateway settings.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Deposit error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await onWithdraw(currency, parsedAmount, currentGateway.id, twoFactorInput);
      if (res.success) {
        soundManager.playCoinChink();
        setSuccessMsg(`Payout request of ${parsedAmount} ${currency} submitted!`);
        setNeeds2FAPrompt(false);
        setTwoFactorInput('');
      } else if (res.requires2FA) {
        setNeeds2FAPrompt(true);
        setErrorMsg('2FA verification code required to release payout');
      } else {
        setErrorMsg(res.error || 'Withdrawal request failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-xl">
              💳
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Multi-Currency Wallet
              </h2>
              <p className="text-xs text-slate-400">Secure Payment Gateway & Financial Center</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Switcher Bar */}
        <div className="bg-slate-950/60 p-3 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Wallet Balance:
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['USDT', 'TON', 'USD', 'RUB', 'STARS', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCurrency(c);
                  const firstGw = gateways.find((g) => g.currencies.includes(c));
                  if (firstGw) setSelectedGatewayId(firstGw.id);
                }}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                  currency === c
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <span>{CURRENCY_ICONS[c]}</span>
                <span>{user.balances[c]?.toLocaleString() ?? 0}</span>
                <span className="text-[10px] text-slate-400 uppercase">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={() => {
              setTab('deposit');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'deposit'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" /> Пополнение (Deposit)
          </button>

          <button
            onClick={() => {
              setTab('withdraw');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'withdraw'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" /> Вывод средств (Withdraw)
          </button>

          <button
            onClick={() => {
              setTab('history');
              onRefreshTransactions();
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'history'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" /> История
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Compliance Notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-bold">Комплаенс / Режим демо</div>
              <div>Продукционная версия: платежи включены как UI-обёртка. Реальные деньги появятся после подключения процессинга и compliance-проверок.</div>
            </div>
          </div>

          {/** TAB DEPOSIT */}
          {tab === 'deposit' && (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Выберите Платежный Шлюз ({currency}):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableGateways.map((gw) => (
                    <div
                      key={gw.id}
                      onClick={() => setSelectedGatewayId(gw.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedGatewayId === gw.id
                          ? 'bg-amber-500/10 border-amber-500 text-slate-100 shadow-md shadow-amber-500/10'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-amber-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">{gw.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Комиссия: {gw.depositFeePercent}% | Лимит: {gw.minDeposit}-{gw.maxDeposit} {currency}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Сумма пополнения ({currency}):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={currentGateway?.minDeposit || 1}
                    max={currentGateway?.maxDeposit || 50000}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 font-mono font-bold text-lg focus:border-amber-500 outline-none"
                    placeholder="Enter amount"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-sm">
                    {currency}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2">
                  {[10, 50, 100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountInput(preset.toString())}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700 transition-colors"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commission Calculation Breakdown */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Сумма платежа:</span>
                  <span className="font-mono text-slate-200">
                    {parsedAmount} {currency}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Комиссия шлюза ({depositFeePercent}%):</span>
                  <span className="font-mono text-amber-400">
                    -{depositFeeAmount} {currency}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-slate-100">
                  <span>К зачислению на баланс:</span>
                  <span className="font-mono text-emerald-400">
                    +{depositNetReceived} {currency}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || parsedAmount <= 0}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                <span>Пополнить {depositNetReceived} {currency}</span>
              </button>
            </form>
          )}

          {/* TAB WITHDRAW */}
          {tab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Выберите Шлюз Вывода ({currency}):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableGateways.map((gw) => (
                    <div
                      key={gw.id}
                      onClick={() => setSelectedGatewayId(gw.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedGatewayId === gw.id
                          ? 'bg-sky-500/10 border-sky-500 text-slate-100'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-sky-400">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">{gw.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Комиссия: {gw.withdrawFeePercent}% | Мин: {gw.minWithdraw} {currency}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Сумма вывода ({currency}):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={currentGateway?.minWithdraw || 10}
                    max={user.balances[currency] || 0}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 font-mono font-bold text-lg focus:border-sky-500 outline-none"
                    placeholder="Enter amount"
                  />
                  <button
                    type="button"
                    onClick={() => setAmountInput((user.balances[currency] || 0).toString())}
                    className="absolute right-3 top-2.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-lg border border-slate-700"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Destination Address Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Реквизиты зачисления (Карта / Кошелек / TON Address):
                </label>
                <input
                  type="text"
                  defaultValue="4400 1234 5678 9012"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-sky-500"
                  placeholder="e.g. Card number or TON Wallet Address"
                />
              </div>

              {/* 2FA Prompt if required */}
              {(needs2FAPrompt || user.is2FAEnabled) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Lock className="w-4 h-4" />
                    <span>Подтверждение 2FA Кодом (Two-Factor Protection):</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorInput}
                    onChange={(e) => setTwoFactorInput(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-4 py-2.5 text-center font-mono font-black text-lg tracking-widest text-amber-400 outline-none"
                    placeholder="123456"
                  />
                  <p className="text-[10px] text-slate-400">
                    Введите 6-значный код из Вашего приложения Google Authenticator или Telegram 2FA.
                  </p>
                </div>
              )}

              {/* Commission Calculation Breakdown */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Сумма к списанию:</span>
                  <span className="font-mono text-slate-200">
                    {parsedAmount} {currency}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Комиссия на вывод ({withdrawFeePercent}%):</span>
                  <span className="font-mono text-amber-400">
                    -{withdrawFeeAmount} {currency}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-slate-100">
                  <span>Фактическая выплата:</span>
                  <span className="font-mono text-sky-400">
                    {withdrawNetReceived} {currency}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || parsedAmount <= 0 || parsedAmount > user.balances[currency]}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Запросить вывод {withdrawNetReceived} {currency}</span>
              </button>
            </form>
          )}

          {/* TAB HISTORY */}
          {tab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Все финансовые операции и комиссионные сборы:</span>
                <button
                  onClick={onRefreshTransactions}
                  className="flex items-center gap-1 text-amber-400 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Обновить
                </button>
              </div>

              <div className="space-y-2">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Транзакции пока отсутствуют
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.type === 'withdrawal'
                              ? 'bg-sky-500/20 text-sky-400'
                              : tx.type === 'game_win'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : '🏆'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 flex items-center gap-2">
                            <span>{tx.gateway}</span>
                            <span className="text-[10px] text-slate-500 font-mono">#{tx.referenceId}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.createdAt).toLocaleString()} | Risk: {tx.riskScore}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-sm ${
                            tx.type === 'deposit' || tx.type === 'game_win'
                              ? 'text-emerald-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {tx.type === 'deposit' || tx.type === 'game_win' ? '+' : '-'}
                          {tx.netAmount} {tx.currency}
                        </div>
                        <div className="text-[10px]">
                          {tx.status === 'completed' && (
                            <span className="text-emerald-400 font-semibold">Успешно</span>
                          )}
                          {tx.status === 'flagged' && (
                            <span className="text-amber-400 font-semibold">На проверке (Anti-Fraud)</span>
                          )}
                          {tx.status === 'rejected' && (
                            <span className="text-red-400 font-semibold">Отклонено</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
