import React, { useEffect, useState } from 'react';
import {
  AppNotification,
  Currency,
  DurakGameMode,
  GameTable,
  PaymentGatewayConfig,
  User,
  WalletTransaction,
} from './types';
import { HeaderNavbar } from './components/HeaderNavbar';
import { LobbyView } from './components/LobbyView';
import { DurakTableView } from './components/DurakTableView';
import { WalletModal } from './components/WalletModal';
import { TwoFactorModal } from './components/TwoFactorModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AdminDashboard } from './components/AdminDashboard';
import { soundManager } from './lib/audio';
import { initTelegramWebApp, triggerHapticFeedback } from './lib/telegram';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeCurrency, setActiveCurrency] = useState<Currency>('USDT');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [tables, setTables] = useState<GameTable[]>([]);
  const [currentTable, setCurrentTable] = useState<GameTable | null>(null);

  // Modals & Drawers
  const [showWallet, setShowWallet] = useState<boolean>(false);
  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [show2FA, setShow2FA] = useState<boolean>(false);
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<'check' | 'login' | 'offer'>('check');
  const [acceptedOffer, setAcceptedOffer] = useState<boolean>(false);

  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [wsSocket, setWsSocket] = useState<WebSocket | null>(null);

  // Initialize Telegram WebApp integration
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  // Fetch initial profile & data
  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) setUser(data.user);

      const [gwRes, txRes, notifRes] = await Promise.all([
        fetch('/api/wallet/gateways').then((r) => r.json()),
        fetch('/api/wallet/transactions').then((r) => r.json()),
        fetch('/api/notifications').then((r) => r.json()),
      ]);

      setGateways(gwRes.gateways || []);
      setTransactions(txRes.transactions || []);
      setNotifications(notifRes.notifications || []);
    } catch (err) {
      console.error('Initial fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Setup Real-time WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId: user?.id }));
      if (activeTableId) {
        ws.send(JSON.stringify({ type: 'subscribe_table', tableId: activeTableId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'lobby_tables') {
          setTables(msg.tables || []);
          if (activeTableId) {
            const updated = (msg.tables || []).find((t: GameTable) => t.id === activeTableId);
            if (updated) setCurrentTable(updated);
          }
        }

        if (msg.type === 'table_state' || msg.type === 'table_created') {
          setCurrentTable(msg.table);
          if (msg.type === 'table_created') {
            setActiveTableId(msg.table.id);
          }
        }

        if (msg.type === 'error') {
          triggerHapticFeedback('error');
          alert(msg.message);
        }
      } catch (e) {
        console.error('WS Parse Error:', e);
      }
    };

    setWsSocket(ws);

    return () => {
      ws.close();
    };
  }, [activeTableId, user?.id]);

  const handleDeposit = async (currency: Currency, amount: number, gatewayId: string) => {
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, amount, gatewayId }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        fetchUserData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleWithdraw = async (currency: Currency, amount: number, gatewayId: string, twoFactorCode?: string) => {
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, amount, gatewayId, twoFactorCode }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        fetchUserData();
        return { success: true };
      }
      return { success: false, requires2FA: data.requires2FA, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleVerify2FA = async (code: string) => {
    try {
      const res = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const handleCreateTable = (params: {
    name: string;
    mode: DurakGameMode;
    maxPlayers: 2 | 3 | 4;
    deckSize: 24 | 36;
    currency: Currency;
    stake: number;
    turnTimeLimitSec: number;
  }) => {
    if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
      wsSocket.send(JSON.stringify({ type: 'create_table', ...params }));
    }
  };

  const handleSelectTable = (tableId: string) => {
    setActiveTableId(tableId);
    if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
      wsSocket.send(JSON.stringify({ type: 'join_table', tableId }));
      wsSocket.send(JSON.stringify({ type: 'subscribe_table', tableId }));
    }
  };

  // Game Moves over WebSocket
  const sendGameAction = (type: string, payload: object = {}) => {
    if (wsSocket && wsSocket.readyState === WebSocket.OPEN && activeTableId) {
      wsSocket.send(JSON.stringify({ type, tableId: activeTableId, userId: user?.id, ...payload }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-app-bg text-contrast flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted">Loading Durak Gaming Platform...</p>
        </div>
      </div>
    );
  }

  const openAuth = () => setAuthStep('login');
  const openOffer = () => setAuthStep('offer');

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-app-bg text-contrast font-sans antialiased selection:bg-amber-500 selection:text-slate-950 flex flex-col">
      {/* Navbar Header */}
      <HeaderNavbar
        user={user}
        activeCurrency={activeCurrency}
        onSelectCurrency={setActiveCurrency}
        onOpenWallet={(tab) => {
          setWalletTab(tab || 'deposit');
          setShowWallet(true);
        }}
        onOpen2FA={() => setShow2FA(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        unreadNotificationsCount={unreadCount}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(soundManager.toggleMute())}
        onToggleAdminRole={async () => {
          const res = await fetch('/api/auth/toggle-admin', { method: 'POST' });
          const d = await res.json();
          if (d.user) setUser(d.user);
        }}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTableId && currentTable ? (
          <DurakTableView
            user={user}
            table={currentTable}
            onBackToLobby={() => {
              setActiveTableId(null);
              setCurrentTable(null);
            }}
            onAttack={(cardId) => sendGameAction('attack', { cardId })}
            onDefend={(cardId, pairId) => sendGameAction('defend', { cardId, pairId })}
            onTransfer={(cardId) => sendGameAction('transfer', { cardId })}
            onBito={() => sendGameAction('bito')}
            onTake={() => sendGameAction('take')}
            onAddBot={() => sendGameAction('add_bot')}
            onSendChat={(text) => sendGameAction('chat', { text })}
          />
        ) : (
          <LobbyView
            user={user}
            tables={tables}
            activeCurrency={activeCurrency}
            onSelectTable={handleSelectTable}
            onCreateTable={handleCreateTable}
          />
        )}
      </main>

      {/* Wallet Modal */}
      {showWallet && (
        <WalletModal
          user={user}
          activeCurrency={activeCurrency}
          initialTab={walletTab}
          gateways={gateways}
          transactions={transactions}
          onClose={() => setShowWallet(false)}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
          onRefreshTransactions={fetchUserData}
        />
      )}

      {/* 2FA Modal */}
      {show2FA && (
        <TwoFactorModal
          user={user}
          onClose={() => setShow2FA(false)}
          onVerifyAndEnable={handleVerify2FA}
        />
      )}

      {/* Admin Panel Modal */}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}

      {/* Notifications Drawer */}
      {showNotifications && (
        <NotificationDrawer
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={async () => {
            await fetch('/api/notifications/mark-read', { method: 'POST' });
            fetchUserData();
          }}
        />
      )}
    </div>
  );
}
