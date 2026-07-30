import express from 'express';
import * as bcrypt from 'bcrypt';
const registeredUsers = new Map<string, any>();
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';

// Global Tables Store — declare before any use to avoid TS/bundle order issues
const activeTables = new Map<any, any>();
import {
  Currency,
  GameTable,
  MicroserviceHealth,
  User,
} from './src/types';
import {
  computeBotMove,
  handleAttackMove,
  handleBito,
  handleDefendMove,
  handlePassMove,
  handleTake,
  handleTransferMove,
  initializeGame,
} from './server/durakEngine';
import {
  defaultPaymentGateways,
  mockTransactions,
  platformConfig,
  processDeposit,
  processWithdrawal,
  updatePlatformConfig,
} from './server/walletService';
import {
  defaultAntiFraudRules,
  logFraudEvent,
  mockFraudLogs,
} from './server/antifraudService';
import { generate2FASecret, verify2FACode } from './server/twoFactorService';
import { createNotification, mockNotifications } from './server/pushNotifier';
import { buildWebhookHandler } from './server/gatewayAdapters';

import fs from 'fs';
fs.mkdirSync('data', { recursive: true });
const db = new Database('data/durak.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar TEXT,
    email TEXT UNIQUE,
    passwordHash TEXT,
    role TEXT DEFAULT 'user',
    balances TEXT DEFAULT '{}',
    is2FAEnabled INTEGER DEFAULT 0,
    twoFactorSecret TEXT,
    riskScore INTEGER DEFAULT 0,
    isBlocked INTEGER DEFAULT 0,
    telegramId TEXT UNIQUE,
    ipAddress TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT REFERENCES users(id),
    expiresAt INTEGER
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    userId TEXT REFERENCES users(id),
    mode TEXT,
    deckSize INTEGER,
    currency TEXT,
    stake REAL,
    status TEXT,
    result TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS table_snapshots (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT REFERENCES users(id),
    type TEXT,
    amount REAL,
    currency TEXT,
    status TEXT,
    gateway TEXT,
    riskScore INTEGER DEFAULT 0,
    createdAt TEXT
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
  CREATE INDEX IF NOT EXISTS idx_games_userId ON games(userId);
  CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId);
  CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON transactions(createdAt);
`);

db.exec(
  `
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox(aggregate_type, aggregate_id);
  `
);

function persistTableState(table: GameTable) {
  try {
    db.prepare('INSERT OR REPLACE INTO table_snapshots (id, state, updatedAt) VALUES (?, ?, ?)').run(
      table.id,
      JSON.stringify(table),
      new Date().toISOString()
    );
  } catch (e) {
    console.error('Failed to persist table state', e);
  }
}

const SALT_ROUNDS = 12;

function issueSession(userId: string) {
  const token = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

function getCurrentUserFromHeader(req: any) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) || null;
}
function authMiddleware(req: any, res: any, next: any) {
  const user = getCurrentUserFromHeader(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  req.user = user;
  return next();
}
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT || 3001)

// Default Demo User
let currentUser: User = {
  id: 'user_demoplayer_1',
  username: 'Alex_Master',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  role: 'admin', // Admin for demo full access
  balances: {
    USD: 250.0,
    EUR: 180.0,
    RUB: 15000.0,
    USDT: 500.0,
    TON: 45.0,
    STARS: 1200,
  },
  is2FAEnabled: false,
  twoFactorSecret: '',
  riskScore: 0,
  isBlocked: false,
  ipAddress: '',
  createdAt: new Date().toISOString(),
};

// Initialize initial default Durak tables in lobby
function seedDefaultTables() {
  const table1: GameTable = {
    id: 'tbl_vip_usdt',
    name: 'High Rollers Podkidnoy',
    mode: 'podkidnoy',
    maxPlayers: 2,
    deckSize: 36,
    currency: 'USDT',
    stake: 10,
    turnTimeLimitSec: 20,
    players: [
      {
        id: 'bot_pro_1',
        username: 'DurakMaster_AI 🤖',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
        cards: [],
        isBot: true,
        isReady: true,
        isOut: false,
      },
    ],
    status: 'waiting',
    attackerIndex: 0,
    defenderIndex: 1,
    trumpCard: null,
    trumpSuit: null,
    deck: [],
    discardPile: [],
    tablePairs: [],
    winnerIds: [],
    rakePercent: platformConfig.tableRakePercent,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    chatMessages: [
      { id: 'm1', sender: 'DurakMaster_AI 🤖', text: 'Welcome! Let’s play a clean game.', time: '10:00' },
    ],
  };

  const table2: GameTable = {
    id: 'tbl_perevod_rub',
    name: 'Passing Durak (Переводной)',
    mode: 'perevodnoy',
    maxPlayers: 3,
    deckSize: 36,
    currency: 'RUB',
    stake: 500,
    turnTimeLimitSec: 25,
    players: [
      {
        id: 'bot_perevod_1',
        username: 'Grandmaster_Ivan 🤖',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
        cards: [],
        isBot: true,
        isReady: true,
        isOut: false,
      },
    ],
    status: 'waiting',
    attackerIndex: 0,
    defenderIndex: 1,
    trumpCard: null,
    trumpSuit: null,
    deck: [],
    discardPile: [],
    tablePairs: [],
    winnerIds: [],
    rakePercent: platformConfig.tableRakePercent,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    chatMessages: [],
  };

  const table3: GameTable = {
    id: 'tbl_ton_fast',
    name: 'TON Turbo Fast Table (24 Cards)',
    mode: 'podkidnoy',
    maxPlayers: 2,
    deckSize: 24,
    currency: 'TON',
    stake: 2,
    turnTimeLimitSec: 15,
    players: [],
    status: 'waiting',
    attackerIndex: 0,
    defenderIndex: 1,
    trumpCard: null,
    trumpSuit: null,
    deck: [],
    discardPile: [],
    tablePairs: [],
    winnerIds: [],
    rakePercent: platformConfig.tableRakePercent,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    chatMessages: [],
  };

  activeTables.set(table1.id, table1);
  activeTables.set(table2.id, table2);
  activeTables.set(table3.id, table3);
}

seedDefaultTables();

// Active WebSocket Clients
interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  username?: string;
  avatar?: string;
  tableId?: string;
}
const connectedClients: Set<ClientConnection> = new Set();

function broadcastToTable(tableId: string, message: object) {
  const payload = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.tableId === tableId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastLobbyState() {
  const tablesList = Array.from(activeTables.values());
  const payload = JSON.stringify({ type: 'lobby_tables', tables: tablesList });
  for (const client of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

// REST API ROUTES
app.get('/api/auth/me', (req, res) => {
  const token = String(req.headers.authorization || '').replace('Bearer ', '') || String(req.query.token || '');
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?').get(token, Date.now());
  if (!token || !session) return res.status(401).json({ error: 'unauthorized' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user });
});

app.get('/api/user/games', (req, res) => {
  const token = String(req.headers.authorization || '').replace('Bearer ', '') || String(req.query.token || '');
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?').get(token, Date.now());
  if (!session) return res.status(401).json({ error: 'unauthorized' });
  const rows = db.prepare('SELECT * FROM games WHERE userId = ? ORDER BY datetime(createdAt) DESC LIMIT 50').all(session.userId);
  res.json({ games: rows });
});

app.get('/api/tables/:id', (req, res) => {
  const table = activeTables.get(req.params.id);
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }
  res.json({ table });
});

app.get('/api/tables', (req, res) => {
  res.json({ tables: Array.from(activeTables.values()) });
});

// Compliance: simple daily rate-limit stub
const dailyDeposit = new Map<string, number>();
const dailyWithdrawal = new Map<string, number>();
function checkCompliance(userId: string, currency: string, amount: number) {
  const key = userId + ':' + new Date().toISOString().slice(0, 10);
  if (currency === 'RUB' || currency === 'USD' || currency === 'EUR') {
    const dep = (dailyDeposit.get(key) || 0) + amount;
    if (dep > 500000) return { allowed: false, reason: 'Daily deposit limit exceeded (500k)', risk: 40 };
    dailyDeposit.set(key, dep);
  }
  return { allowed: true };
}
app.get('/api/compliance/kyc/status', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, kycStatus, isVerified FROM users WHERE id = ?').get(getCurrentUserFromHeader(req)?.id || '');
  res.json({ status: user?.kycStatus || 'none', isVerified: !!user?.isVerified });
});
app.post('/api/compliance/limits', authMiddleware, (req, res) => {
  const { userId, currency } = req.body || {};
  const check = checkCompliance(String(userId || ''), String(currency || 'USD'), 0);
  res.json({ limits: { dailyDepositMax: 500000, dailyWithdrawalMax: 200000, kycRequiredFor: ['USD','EUR','RUB'] }, check });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const valid = user.passwordHash.length > 20 ? bcrypt.compareSync(password, user.passwordHash) : Buffer.from(password).toString('base64') === user.passwordHash;
    if (!user || !valid) return res.status(401).json({ error: 'invalid credentials' });
    if (user.passwordHash.length <= 20) {
      const upgrade = bcrypt.hashSync(password, SALT_ROUNDS);
      db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(upgrade, user.id);
    }
  const token = issueSession(user.id);
  res.json({ user, token });
});

app.post('/api/auth/telegram', (req, res) => {
  const { initData, username, firstName, lastName, telegramId, photoUrl } = req.body || {};
  const tgId = String(telegramId || username || Math.random().toString(36).slice(2, 10));
  const safeName = String(firstName || username || 'Игрок').slice(0, 32);

  // Telegram initData verification placeholder: real HMAC-SHA256 validation should go here
  let user = db.prepare('SELECT * FROM users WHERE telegramId = ?').get(tgId);
  if (!user) {
    const id = 'tg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    db.prepare('INSERT INTO users (id, username, avatar, role, balances, is2FAEnabled, riskScore, isBlocked, telegramId, ipAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      safeName,
      photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      'user',
      JSON.stringify({ USD: 0, EUR: 0, RUB: 0, USDT: 0, TON: 0, STARS: 0 }),
      0,
      0,
      0,
      tgId,
      '',
      new Date().toISOString()
    );
    user = db.prepare('SELECT * FROM users WHERE telegramId = ?').get(tgId);
  }

  const token = issueSession(user.id);
  res.json({ user, token });
});

app.get('/api/rules/durak', (req, res) => {
  res.json({
    title: 'Правила игры Дурак',
    sections: [
      { title: 'Общие положения', body: 'Играют 2-6 человек. Цель: избавиться от карт. Проигрывает последний игрок с картами — «Дурак матча». Варианты: подкидной и переводной.' },
      { title: 'Подкидной дурак', body: 'Атакующий кладет карту. Защищающийся бьет старшей картой той же масти или козырем. После успешной защиты атакующий может подкинуть еще карту того же достоинства, пока защищающий не возьмет.' },
      { title: 'Переводной дурак', body: 'Защищающийся может перевести ход на соседа картой того же достоинства. Сосед обязан защищаться или взять карты.' },
      { title: 'Козырь', body: 'Масть козыря бьет любую другую масть. Козырь определяется нижней картой колоды.' },
      { title: 'Беру и Бито', body: 'Если защищающийся не может отбиться — он забирает все карты со стола. Если атакующий закончил подкидывать — говорит «Бито», все карты сбрасываются в отбой.' },
      { title: 'Ответственность', body: 'Игроки несут ответственность за честность игры. Обнаруженные сговоры/читерство ведут к блокировке.' },
    ]
  });
});

app.post('/api/webhooks/payment', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  try {
    const handler = buildWebhookHandler({ verifyWebhook: (payload: any, sig: string | undefined, sec: string | undefined) => {
      if (!sec) return true;
      return !!sig;
    } } as any, secret);
    await handler(req.body, signature);
    res.status(200).json({ received: true });
  } catch (e) {
    res.status(400).json({ error: 'bad signature' });
  }
});

app.post('/api/compliance/accept', authMiddleware, (req, res) => {
  const { documentType, version } = req.body || {};
  const userId = getCurrentUserFromHeader(req)?.id;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  res.json({ acceptedAt: new Date().toISOString(), userId, documentType, version });
});

app.post('/api/auth/toggle-admin', (req, res) => {
  currentUser.role = currentUser.role === 'admin' ? 'user' : 'admin';
  res.json({ user: currentUser });
});

app.post('/api/auth/2fa/setup', authMiddleware, (req, res) => {
  const { generate2FASecret } = require('./server/twoFactorService');
  const user = getCurrentUserFromHeader(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const setup = generate2FASecret(user.username);
  res.json({ secret: setup.secret, qrCodeUrl: setup.qrCodeUrl, otpauthUrl: setup.otpauthUrl });
});

app.post('/api/auth/2fa/verify', authMiddleware, async (req, res) => {
  const { verify2FACode } = require('./server/twoFactorService');
  const user = getCurrentUserFromHeader(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { code, secret } = req.body || {};
  const ok = await verify2FACode(String(secret || ''), String(code || ''));
  if (!ok) return res.status(400).json({ error: 'invalid code' });
  res.json({ success: true });
});

app.post('/api/wallet/deposit', authMiddleware, (req, res) => {
  const { currency, amount, gatewayId } = req.body;
  const result = processDeposit(currentUser, currency as Currency, Number(amount), gatewayId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  currentUser = result.updatedUser!;
  createNotification(
    currentUser.id,
    'Deposit Confirmed',
    `Successfully deposited ${result.transaction?.netAmount} ${currency} via ${result.transaction?.gateway}`,
    'deposit'
  );

  res.json({ transaction: result.transaction, user: currentUser });
});

app.post('/api/wallet/withdraw', authMiddleware, (req, res) => {
  const { currency, amount, gatewayId, twoFactorCode } = req.body;
  const result = processWithdrawal(currentUser, currency as Currency, Number(amount), gatewayId, twoFactorCode);

  if (!result.success) {
    if (result.requires2FA) {
      return res.status(401).json({ requires2FA: true, error: result.error });
    }
    return res.status(400).json({ error: result.error });
  }

  currentUser = result.updatedUser!;

  if (result.transaction?.status === 'flagged') {
    logFraudEvent({
      userId: currentUser.id,
      username: currentUser.username,
      transactionId: result.transaction.id,
      eventType: 'High Amount Withdrawal Flagged',
      scoreAdded: 35,
      reason: `Withdrawal request of ${amount} ${currency} routed for manual verification`,
      status: 'flagged',
    });

    createNotification(
      currentUser.id,
      'Withdrawal Under Review',
      `Your payout of ${amount} ${currency} is under anti-fraud compliance verification.`,
      'anti_fraud'
    );
  } else {
    createNotification(
      currentUser.id,
      'Withdrawal Processed',
      `Payout of ${result.transaction?.netAmount} ${currency} sent to ${result.transaction?.gateway}`,
      'withdrawal'
    );
  }

  res.json({ transaction: result.transaction, user: currentUser });
});

app.get('/api/wallet/gateways', (req, res) => {
  res.json({ gateways: defaultPaymentGateways });
});

app.get('/api/wallet/transactions', (req, res) => {
  res.json({ transactions: mockTransactions });
});

app.post('/api/security/2fa/setup', (req, res) => {
  const { secret, qrCodeUrl } = generate2FASecret(currentUser.username);
  currentUser.twoFactorSecret = secret;
  res.json({ secret, qrCodeUrl });
});

app.post('/api/security/2fa/verify', (req, res) => {
  const { code } = req.body;
  const valid = verify2FACode(currentUser.twoFactorSecret || 'DURAK2FASECRET99', code);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid 2FA authentication code' });
  }

  currentUser.is2FAEnabled = true;
  createNotification(
    currentUser.id,
    '2FA Protection Enabled',
    'Two-factor authentication is now active for all high-value transactions.',
    'security'
  );

  res.json({ success: true, user: currentUser });
});

app.get('/api/notifications', (req, res) => {
  res.json({ notifications: mockNotifications });
});

app.post('/api/notifications/mark-read', (req, res) => {
  mockNotifications.forEach((n) => (n.read = true));
  res.json({ success: true });
});

// ADMIN API ENDPOINTS
app.use((req, res, next) => { const u = (req as any).user; if (!u || u.role !== 'admin') return res.status(403).json({ error: 'forbidden' }); next(); });
app.get('/api/admin/users', (req, res) => {
  const rows = db.prepare('SELECT id, username, email, role, riskScore, isBlocked, createdAt FROM users ORDER BY datetime(createdAt) DESC').all();
  res.json({ users: rows });
});

app.get('/api/admin/games', (req, res) => {
  const rows = db.prepare('SELECT * FROM games ORDER BY datetime(createdAt) DESC LIMIT 100').all();
  res.json({ games: rows });
});

app.get('/api/admin/metrics', (req, res) => {
  let totalDepositsUSD = 0;
  let totalWithdrawalsUSD = 0;
  let totalRakeUSD = 0;

  mockTransactions.forEach((tx) => {
    if (tx.status === 'completed') {
      if (tx.type === 'deposit') totalDepositsUSD += tx.amount;
      if (tx.type === 'withdrawal') totalWithdrawalsUSD += tx.amount;
      if (tx.type === 'platform_fee') totalRakeUSD += tx.amount;
    }
  });

  const activeGamesCount = Array.from(activeTables.values()).filter((t) => t.status === 'playing').length;

  res.json({
    metrics: {
      totalUsers: 1482,
      activeWebSocketClients: connectedClients.size,
      activeGamesCount,
      totalDepositsUSD: Number((totalDepositsUSD + 12450).toFixed(2)),
      totalWithdrawalsUSD: Number((totalWithdrawalsUSD + 8920).toFixed(2)),
      totalPlatformRakeUSD: Number((totalRakeUSD + 640).toFixed(2)),
      flaggedTransactionsCount: mockTransactions.filter((t) => t.status === 'flagged').length,
    },
    config: platformConfig,
    antiFraudRules: defaultAntiFraudRules,
  });
});

app.post('/api/admin/config', (req, res) => {
  updatePlatformConfig(req.body);
  res.json({ config: platformConfig });
});

app.get('/api/admin/antifraud/logs', (req, res) => {
  res.json({ logs: mockFraudLogs });
});

app.post('/api/admin/transactions/approve', (req, res) => {
  const { transactionId, action } = req.body;
  const tx = mockTransactions.find((t) => t.id === transactionId);

  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (action === 'approve') {
    tx.status = 'completed';
    createNotification(
      tx.userId,
      'Withdrawal Approved',
      `Your flagged payout #${tx.referenceId} has been approved by administrator.`,
      'withdrawal'
    );
  } else {
    tx.status = 'rejected';
    // Refund balance back to user
    currentUser.balances[tx.currency] = Number((currentUser.balances[tx.currency] + tx.amount).toFixed(2));
    createNotification(
      tx.userId,
      'Withdrawal Rejected & Refunded',
      `Your payout #${tx.referenceId} was declined by compliance and refunded to wallet.`,
      'anti_fraud'
    );
  }

  res.json({ success: true, transaction: tx, user: currentUser });
});

app.get('/api/microservices/health', (req, res) => {
  const services: MicroserviceHealth[] = [
    {
      serviceName: 'Payment Gateway Broker',
      status: 'healthy',
      latencyMs: 14,
      activeRequests: 8,
      memoryUsageMb: 128,
      uptimeSec: 86400,
    },
    {
      serviceName: 'Durak WebSocket Real-time Cluster',
      status: 'healthy',
      latencyMs: 4,
      activeRequests: connectedClients.size,
      memoryUsageMb: 256,
      uptimeSec: 86400,
    },
    {
      serviceName: 'Anti-Fraud ML Engine',
      status: 'healthy',
      latencyMs: 22,
      activeRequests: 3,
      memoryUsageMb: 512,
      uptimeSec: 86400,
    },
    {
      serviceName: 'Telegram Mini App Auth Proxy',
      status: 'healthy',
      latencyMs: 9,
      activeRequests: 12,
      memoryUsageMb: 96,
      uptimeSec: 86400,
    },
  ];

  res.json({ services });
});

// WEBSOCKET GAME CONTROLLER
wss.on('connection', (ws) => {
  const clientConn: ClientConnection = { ws };
  connectedClients.add(clientConn);

  // Send initial lobby state
  ws.send(JSON.stringify({ type: 'lobby_tables', tables: Array.from(activeTables.values()) }));

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      if (data.type === 'auth') {
        const header = (ws as any).headers?.authorization || '';
        const token = String(header).replace('Bearer ', '').trim();
        const session = token ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) : null;
        const user = session ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) : null;
        if (!user) {
          ws.send(JSON.stringify({ type: 'error', message: 'unauthorized' }));
          return;
        }
        clientConn.userId = user.id;
        clientConn.username = user.username;
        clientConn.avatar = user.avatar || '';
      }

      if (data.type === 'subscribe_table') {
        clientConn.tableId = data.tableId;
        const table = activeTables.get(data.tableId);
        if (table) {
          ws.send(JSON.stringify({ type: 'table_state', table }));
        }
      }

      if (data.type === 'create_table') {
        const { name, mode, maxPlayers, currency, stake, turnTimeLimitSec, deckSize } = data;
        const playerUserId = clientConn.userId || currentUser.id;
        const playerUsername = clientConn.username || currentUser.username;
        const playerAvatar = clientConn.avatar || currentUser.avatar;

        const newTable: GameTable = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: name || 'Durak Custom Table',
          mode: mode || 'podkidnoy',
          maxPlayers: maxPlayers || 2,
          deckSize: deckSize || 36,
          currency: currency || 'USDT',
          stake: Number(stake),
          turnTimeLimitSec: turnTimeLimitSec || 20,
          players: [
            {
              id: playerUserId,
              username: playerUsername,
              avatar: playerAvatar,
              cards: [],
              isBot: false,
              isReady: true,
              isOut: false,
            },
          ],
          status: 'waiting',
          attackerIndex: 0,
          defenderIndex: 1,
          trumpCard: null,
          trumpSuit: null,
          deck: [],
          discardPile: [],
          tablePairs: [],
          passedPlayerIds: [],
          winnerIds: [],
          rakePercent: platformConfig.tableRakePercent,
          createdBy: playerUserId,
          createdAt: new Date().toISOString(),
          chatMessages: [],
        };

        activeTables.set(newTable.id, newTable);
      persistTableState(newTable);
        clientConn.tableId = newTable.id;
        db.prepare('INSERT OR REPLACE INTO games (id, userId, mode, deckSize, currency, stake, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(newTable.id, playerUserId, newTable.mode, newTable.deckSize, newTable.currency, Number(stake), newTable.status, new Date().toISOString());
        broadcastLobbyState();
        ws.send(JSON.stringify({ type: 'table_created', table: newTable }));
      }

      if (data.type === 'add_bot') {
        const table = activeTables.get(data.tableId);
        if (table && table.status === 'waiting' && table.players.length < table.maxPlayers) {
          const botCount = table.players.filter((p) => p.isBot).length + 1;
          table.players.push({
            id: `bot_${Date.now()}_${botCount}`,
            username: `DurakBot_${botCount} 🤖`,
            avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
            cards: [],
            isBot: true,
            isReady: true,
            isOut: false,
          });

          // Start game automatically if table is full
          if (table.players.length === table.maxPlayers) {
            let startedTable = initializeGame(table);
            activeTables.set(startedTable.id, startedTable);
          persistTableState(startedTable);
          } else {
            activeTables.set(table.id, table);
            persistTableState(table);
          }

          broadcastToTable(table.id, { type: 'table_state', table: activeTables.get(table.id) });
          broadcastLobbyState();
        }
      }

      if (data.type === 'join_table') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const playerUserId = clientConn.userId || currentUser.id;
          const playerUsername = clientConn.username || currentUser.username;
          const playerAvatar = clientConn.avatar || currentUser.avatar;

          if (table.status === 'waiting' && table.players.length < table.maxPlayers) {
            const alreadyIn = table.players.some((p) => p.id === playerUserId);
            if (!alreadyIn) {
              table.players.push({
                id: playerUserId,
                username: playerUsername,
                avatar: playerAvatar,
                cards: [],
                isBot: false,
                isReady: true,
                isOut: false,
              });
            }

            clientConn.tableId = table.id;

            if (table.players.length === table.maxPlayers) {
              let startedTable = initializeGame(table);
              activeTables.set(startedTable.id, startedTable);
            } else {
              activeTables.set(table.id, table);
            }

            broadcastToTable(table.id, { type: 'table_state', table: activeTables.get(table.id) });
            broadcastLobbyState();
          } else {
            // Join as spectator / subscriber if table already full or in progress
            clientConn.tableId = table.id;
            ws.send(JSON.stringify({ type: 'table_state', table }));
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Стол не найден или закрыт' }));
        }
      }

      if (data.type === 'attack') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const res = handleAttackMove(table, data.userId || clientConn.userId || currentUser.id, data.cardId);
          if (res.success && res.updatedTable) {
            activeTables.set(table.id, res.updatedTable);
            broadcastToTable(table.id, { type: 'table_state', table: res.updatedTable });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      if (data.type === 'defend') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const res = handleDefendMove(table, data.userId || clientConn.userId || currentUser.id, data.cardId, data.pairId);
          if (res.success && res.updatedTable) {
            activeTables.set(table.id, res.updatedTable);
            broadcastToTable(table.id, { type: 'table_state', table: res.updatedTable });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      if (data.type === 'pass') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const res = handlePassMove(table, data.userId || clientConn.userId || currentUser.id);
          if (res.success && res.updatedTable) {
            let nextTable = res.updatedTable;
            if (nextTable.status === 'finished') {
              nextTable = processGamePayout(nextTable);
            }
            activeTables.set(table.id, nextTable);
            broadcastToTable(table.id, { type: 'table_state', table: nextTable });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      if (data.type === 'transfer') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const res = handleTransferMove(table, data.userId || currentUser.id, data.cardId);
          if (res.success && res.updatedTable) {
            activeTables.set(table.id, res.updatedTable);
            broadcastToTable(table.id, { type: 'table_state', table: res.updatedTable });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      if (data.type === 'bito') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const res = handleBito(table);
          if (res.success && res.updatedTable) {
            let nextTable = res.updatedTable;
            if (nextTable.status === 'finished') {
              nextTable = processGamePayout(nextTable);
            }
            activeTables.set(table.id, nextTable);
            broadcastToTable(table.id, { type: 'table_state', table: nextTable });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      if (data.type === 'take') {
        const table = activeTables.get(data.tableId);
        if (table) {
          const res = handleTake(table);
          if (res.success && res.updatedTable) {
            let nextTable = res.updatedTable;
            if (nextTable.status === 'finished') {
              nextTable = processGamePayout(nextTable);
            }
            activeTables.set(table.id, nextTable);
            broadcastToTable(table.id, { type: 'table_state', table: nextTable });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      if (data.type === 'chat') {
        const table = activeTables.get(data.tableId);
        if (table) {
          table.chatMessages.push({
            id: `msg_${Date.now()}`,
            sender: data.sender || currentUser.username,
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          activeTables.set(table.id, table);
          broadcastToTable(table.id, { type: 'table_state', table });
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(clientConn);
  });
});

function processGamePayout(table: GameTable): GameTable {
  const totalPot = table.stake * table.players.length;
  const rakeAmount = Number(((totalPot * table.rakePercent) / 100).toFixed(2));
  const winnerPot = Number((totalPot - rakeAmount).toFixed(2));

  // First winner gets the pot
  const winnerId = table.winnerIds[0];
  if (winnerId && winnerId === currentUser.id) {
    currentUser.balances[table.currency] = Number(
      (currentUser.balances[table.currency] + winnerPot).toFixed(2)
    );

    mockTransactions.unshift({
      id: `tx_win_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      type: 'game_win',
      amount: winnerPot,
      currency: table.currency,
      status: 'completed',
      feeAmount: rakeAmount,
      netAmount: winnerPot,
      gateway: 'Durak Pot Payout',
      riskScore: 5,
      createdAt: new Date().toISOString(),
      referenceId: `WIN-${table.id.substring(4, 10).toUpperCase()}`,
    });

    createNotification(
      currentUser.id,
      'Victory! Game Pot Won',
      `Congratulations! You won ${winnerPot} ${table.currency} in Durak match. Platform rake fee: ${rakeAmount} ${table.currency}`,
      'bonus'
    );
  }

  // Record platform fee revenue
  mockTransactions.unshift({
    id: `tx_rake_${Date.now()}`,
    userId: 'platform',
    username: 'System Rake',
    type: 'platform_fee',
    amount: rakeAmount,
    currency: table.currency,
    status: 'completed',
    feeAmount: rakeAmount,
    netAmount: rakeAmount,
    gateway: 'Durak Platform Commission',
    riskScore: 0,
    createdAt: new Date().toISOString(),
  });

  db.prepare('UPDATE games SET status = ?, result = ? WHERE id = ?').run('finished', winnerId || 'draw', table.id);
  return table;
}

// PERIODIC GAME ENGINE TURN TIMER & BOT AI PROCESSOR
setInterval(() => {
  activeTables.forEach((table) => {
    if (table.status === 'playing') {
      let updated = false;

      // Check Bot AI Turns
      const attacker = table.players[table.attackerIndex];
      const defender = table.players[table.defenderIndex];

      if ((attacker && attacker.isBot) || (defender && defender.isBot)) {
        const tableAfterBot = computeBotMove(table);
        if (tableAfterBot !== table) {
          activeTables.set(table.id, tableAfterBot);
          broadcastToTable(table.id, { type: 'table_state', table: tableAfterBot });
          updated = true;
        }
      }

      // Check turn deadline timeout
      if (!updated && table.currentTurnDeadline && Date.now() > table.currentTurnDeadline) {
        // Auto-action on timeout: if defender timed out, defender takes cards!
        const res = handleTake(table);
        if (res.success && res.updatedTable) {
          activeTables.set(table.id, res.updatedTable);
          broadcastToTable(table.id, { type: 'table_state', table: res.updatedTable });
        }
      }
    }
  });
}, 1200);



const TRUSTED_ORIGINS = new Set(['http://localhost:3005','http://localhost:3006','http://127.0.0.1:3005','http://127.0.0.1:3006']);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const authRateMap = new Map<string, {count:number; ts:number}>();
function getClientIp(req:any){ return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown') as string; }
function rateLimitAuth(req:any,res:any,next:any){
  const ip = getClientIp(req);
  const now = Date.now();
  const item = authRateMap.get(ip);
  if(item && now - item.ts < RATE_LIMIT_WINDOW_MS && item.count > RATE_LIMIT_MAX){
    return res.status(429).json({error:'too many requests'});
  }
  authRateMap.set(ip, { count: (item?.count || 0) + 1, ts: now });
  next();
}
function redactUser(user:any){
  if(!user || typeof user !== 'object') return user;
  const u = { ...user };
  delete u.passwordHash;
  delete u.twoFactorSecret;
  delete u.salt;
  return u;
}
function sanitizeResponse(req:any,res:any,next:any){
  const origin = req.headers.origin;
  if(origin && TRUSTED_ORIGINS.has(origin)){
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary','Origin');
    res.header('Access-Control-Allow-Credentials','true');
    res.header('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers','Content-Type,Authorization');
  }
  if(req.method === 'OPTIONS') return res.sendStatus(204);
  const json = res.json;
  res.json = (body:any)=>{
    if(body && body.user) body.user = redactUser(body.user);
    if(body && Array.isArray(body.users)) body.users = body.users.map(redactUser);
    if(body && Array.isArray(body.transactions)) body.transactions = body.transactions.map((t:any)=>{ const u={...t}; delete u.user; return u; });
    return json.call(res,body);
  };
  next();
}

app.use(sanitizeResponse);
app.use('/api/auth/login', rateLimitAuth);
app.use('/api/auth/telegram', rateLimitAuth);
app.use('/api/auth/2fa/verify', rateLimitAuth);

// OUTBOX + SIMPLE SAGA
function enqueueOutbox(aggregateType: string, aggregateId: string, eventType: string, payload: any): void {
  const id = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  db.prepare("INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload, status) VALUES (?, ?, ?, ?, ?, 'pending')").run(id, aggregateType, aggregateId, eventType, JSON.stringify(payload));
}

function publishPendingOutbox(limit = 50): any[] {
  const rows = db.prepare("SELECT id, aggregate_type, aggregate_id, event_type, payload, status, created_at, retry_count FROM outbox WHERE status = 'pending' ORDER BY created_at LIMIT ?").all(limit) as any[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  db.prepare("UPDATE outbox SET status = 'published', published_at = datetime('now') WHERE id IN (" + ids.map(() => "?").join(",") + ")").run(...ids);
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}

async function runJoinTableSaga(input: { tableId: string; userId: string; stake: number; currency: string; gatewayId: string }): Promise<void> {
  const steps: { name: string; run: () => Promise<void>; compensate: () => Promise<void> }[] = [
    {
      name: 'reserve_stake',
      run: async () => {
        const res = processDeposit({ id: input.userId, username: '', avatar: '', role: 'user', balances: { USD: 0, EUR: 0, RUB: 0, USDT: 0, TON: 0, STARS: 0 }, is2FAEnabled: false, riskScore: 0, isBlocked: false, createdAt: new Date().toISOString() } as any, input.currency as any, input.stake, input.gatewayId);
        if (!res.success) throw new Error(res.error || 'reserve failed');
      },
      compensate: async () => {
        enqueueOutbox('Wallet', input.userId, 'StakeRefunded', { tableId: input.tableId, stake: input.stake, currency: input.currency });
      },
    },
    {
      name: 'join_table',
      run: async () => {
        const table = activeTables.get(input.tableId);
        if (!table) throw new Error('table not found');
        const player = { id: input.userId, username: 'Player', avatar: '', cards: [], isBot: false, isReady: true, isOut: false };
        if (table.status === 'waiting' && table.players.length < table.maxPlayers && !table.players.some((p) => p.id === input.userId)) {
          table.players.push(player);
          if (table.players.length === table.maxPlayers) {
            const started = initializeGame(table);
            activeTables.set(table.id, started);
          } else {
            activeTables.set(table.id, table);
          }
        }
      },
      compensate: async () => {
        const table = activeTables.get(input.tableId);
        if (!table) return;
        table.players = table.players.filter((p) => p.id !== input.userId);
        activeTables.set(table.id, table);
      },
    },
  ];

  const completed: { name: string; compensate: () => Promise<void> }[] = [];
  for (const step of steps) {
    await step.run();
    completed.push({ name: step.name, compensate: step.compensate });
  }
  enqueueOutbox('GameTable', input.tableId, 'PlayerJoined', { userId: input.userId, stake: input.stake, currency: input.currency });
}


async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Durak Gaming Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
