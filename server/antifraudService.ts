import { AntiFraudRule, FraudLog, User, WalletTransaction } from '../src/types';

export const defaultAntiFraudRules: AntiFraudRule[] = [
  {
    id: 'rule_high_withdrawal',
    name: 'High Amount Payout Trigger',
    condition: 'Withdrawal > $500 equivalent',
    riskWeight: 35,
    isEnabled: true,
    triggersCount: 14,
  },
  {
    id: 'rule_rapid_tx',
    name: 'High Velocity Transactions',
    condition: '> 5 transactions in 10 minutes',
    riskWeight: 25,
    isEnabled: true,
    triggersCount: 8,
  },
  {
    id: 'rule_failed_2fa',
    name: 'Repeated Invalid 2FA Attempts',
    condition: '3 consecutive wrong TOTP codes',
    riskWeight: 40,
    isEnabled: true,
    triggersCount: 3,
  },
  {
    id: 'rule_multi_ip',
    name: 'Multi-Account IP Detection',
    condition: 'Multiple accounts sharing same IP subnet',
    riskWeight: 30,
    isEnabled: true,
    triggersCount: 5,
  },
  {
    id: 'rule_chip_dumping',
    name: 'Chip Dumping / Collusion Pattern',
    condition: 'Frequent rapid forfeits against same opponent',
    riskWeight: 50,
    isEnabled: true,
    triggersCount: 2,
  },
];

export const mockFraudLogs: FraudLog[] = [
  {
    id: 'log_1',
    userId: 'user_9928',
    username: 'CryptoWhale_99',
    transactionId: 'tx_wd_1722',
    eventType: 'High Amount Payout Trigger',
    scoreAdded: 35,
    reason: 'Withdrawal of $1,200 exceeds automatic clearance threshold',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'flagged',
  },
  {
    id: 'log_2',
    userId: 'user_4011',
    username: 'Alex_Moscow',
    eventType: 'Multi-Account IP Detection',
    scoreAdded: 30,
    reason: 'IP 185.220.101.4 associated with 3 active Durak sessions',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: 'resolved',
  },
];

export function evaluateTransactionRisk(user: User, amount: number, type: 'deposit' | 'withdrawal'): { riskScore: number; triggeredRules: string[] } {
  let score = user.riskScore || 0;
  const triggered: string[] = [];

  if (type === 'withdrawal' && amount > 500) {
    score += 35;
    triggered.push('High Amount Payout Trigger');
  }

  if (score > 100) score = 100;

  return { riskScore: score, triggeredRules: triggered };
}

export function logFraudEvent(log: Omit<FraudLog, 'id' | 'timestamp'>): FraudLog {
  const newLog: FraudLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
  };
  mockFraudLogs.unshift(newLog);
  return newLog;
}
