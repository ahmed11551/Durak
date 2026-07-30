import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Lock, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { User } from '../types';

interface TwoFactorModalProps {
  user: User;
  onClose: () => void;
  onVerifyAndEnable: (code: string) => Promise<boolean>;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ user, onClose, onVerifyAndEnable }) => {
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [secret, setSecret] = useState<string>(user.twoFactorSecret || '');

  useEffect(() => {
    let cancelled = false;
    async function fetchSetup() {
      try {
        const res = await fetch('/api/auth/2fa/setup', { headers: { Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '') } });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.secret) setSecret(data.secret);
        }
      } catch {}
    }
    if (!user.twoFactorSecret) fetchSetup();
    return () => { cancelled = true; };
  }, [user.twoFactorSecret]);

  const qrSvgUrl = secret
    ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="%230f172a"/><text x="90" y="80" font-family="sans-serif" font-size="11" fill="%2338bdf8" text-anchor="middle">Durak Online 2FA Key</text><text x="90" y="105" font-family="monospace" font-weight="bold" font-size="12" fill="%23f8fafc" text-anchor="middle">${secret}</text><rect x="30" y="130" width="120" height="6" rx="3" fill="%2322c55e"/></svg>`
    : '';

  const handleCopy = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const ok = await onVerifyAndEnable(code);
      if (ok) {
        setSuccessMsg('2FA Protection successfully activated on your account!');
        setTimeout(onClose, 1500);
      } else {
        setErrorMsg('Invalid authenticator code. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '2FA activation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative space-y-4">
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl"><X className="w-5 h-5" /></button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Двухфакторная Аутентификация (2FA)</h2>
            <p className="text-xs text-slate-400">Защита выводов средств и финансовых транзакций</p>
          </div>
        </div>

        {errorMsg && (<div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">{errorMsg}</div>)}
        {successMsg && (<div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>{successMsg}</span></div>)}

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
          {qrSvgUrl ? (<img src={qrSvgUrl} alt="2FA QR Code" className="w-40 h-40 mx-auto rounded-lg border border-slate-800" />) : (<div className="text-xs text-slate-400">Loading 2FA setup...</div>)}
          <div>
            <div className="text-[11px] text-slate-400 mb-1">Секретный ключ авторизатора:</div>
            <div className="flex items-center justify-center gap-2">
              <code className="px-3 py-1 bg-slate-900 rounded-lg text-emerald-400 font-mono font-bold text-sm tracking-wider border border-slate-800">{secret || '...'}</code>
              {secret ? (<button onClick={handleCopy} className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700" title="Copy secret key"><Copy className="w-4 h-4" /></button>) : null}
            </div>
            {copied && (<span className="text-[10px] text-emerald-400 font-semibold">Скопировано!</span>)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Введите 6-значный код из Authenticator:</label>
            <input type="text" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-center tracking-widest text-lg" placeholder="000000" />
          </div>
          <button type="submit" disabled={!secret || code.length !== 6 || loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-sm rounded-xl">{loading ? 'Проверяю...' : 'Подключить 2FA'}</button>
        </form>
      </div>
    </div>
  );
};
