export type Currency = 'USD' | 'EUR' | 'RUB' | 'USDT' | 'TON' | 'STARS';

export interface UserBalances {
  USD: number;
  EUR: number;
  RUB: number;
  USDT: number;
  TON: number;
  STARS: number;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  avatar: string;
  role: UserRole;
  balances: UserBalances;
  is2FAEnabled: boolean;
  twoFactorSecret?: string;
  riskScore: number; // 0 to 100
  isBlocked: boolean;
  telegramId?: string;
  ipAddress: string;
  createdAt: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'game_stake' | 'game_win' | 'platform_fee';
export type TransactionStatus = 'completed' | 'pending' | 'flagged' | 'rejected';

export interface WalletTransaction {
  id: string;
  userId: string;
  username: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  feeAmount: number;
  netAmount: number;
  gateway: string;
  riskScore: number;
  createdAt: string;
  note?: string;
  referenceId?: string;
}

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: 'card' | 'crypto' | 'telegram_pay' | 'e_wallet';
  icon: string;
  currencies: Currency[];
  depositFeePercent: number;
  withdrawFeePercent: number;
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
  isEnabled: boolean;
}

export interface AntiFraudRule {
  id: string;
  name: string;
  condition: string;
  riskWeight: number;
  isEnabled: boolean;
  triggersCount: number;
}

export interface FraudLog {
  id: string;
  userId: string;
  username: string;
  transactionId?: string;
  eventType: string;
  scoreAdded: number;
  reason: string;
  timestamp: string;
  status: 'flagged' | 'resolved' | 'blocked';
}

export type DurakGameMode = 'podkidnoy' | 'perevodnoy';
export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardRank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: CardSuit;
  rank: CardRank;
  value: number; // 6 to 14
}

export interface TablePair {
  id: string;
  attackCard: Card;
  defendCard?: Card;
  attackerId: string;
  defenderId?: string;
}

export interface PlayerState {
  id: string;
  username: string;
  avatar: string;
  cards: Card[];
  isBot: boolean;
  isReady: boolean;
  isOut: boolean; // Out of cards after deck empty
  place?: number; // 1st winner, 2nd, etc.
  isDurak?: boolean;
}

export type TableStatus = 'waiting' | 'playing' | 'finished';

export interface GameTable {
  id: string;
  name: string;
  mode: DurakGameMode;
  maxPlayers: 2 | 3 | 4;
  deckSize: 24 | 36;
  currency: Currency;
  stake: number;
  turnTimeLimitSec: number;
  players: PlayerState[];
  status: TableStatus;
  attackerIndex: number;
  defenderIndex: number;
  firstAttackerIndex?: number;
  trumpCard: Card | null;
  trumpSuit: CardSuit | null;
  deck: Card[];
  discardPile: Card[];
  tablePairs: TablePair[];
  passedPlayerIds?: string[];
  currentTurnDeadline?: number;
  winnerIds: string[];
  loserId?: string;
  rakePercent: number;
  createdBy: string;
  createdAt: string;
  chatMessages: { id: string; sender: string; text: string; time: string }[];
}

export type NotificationType = 'game_turn' | 'deposit' | 'withdrawal' | 'security' | 'anti_fraud' | 'bonus' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface PlatformConfig {
  depositFeeDefaultPercent: number;
  withdrawalFeeDefaultPercent: number;
  tableRakePercent: number;
  minWithdrawalLimits: Record<Currency, number>;
  antiFraudMaxRiskThreshold: number; // Transactions with risk > this get flagged
  require2FAForWithdrawalAbove: Record<Currency, number>;
  telegramMiniAppBotUsername: string;
}

export interface MicroserviceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  activeRequests: number;
  memoryUsageMb: number;
  uptimeSec: number;
}
