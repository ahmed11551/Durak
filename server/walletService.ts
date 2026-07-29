import { AntiFraudRule, Currency, PaymentGatewayConfig, PlatformConfig, TransactionStatus, User, WalletTransaction } from '../src/types';

export let platformConfig: PlatformConfig = {
  depositFeeDefaultPercent: 1.5, // 1.5% commission on deposit
  withdrawalFeeDefaultPercent: 2.5, // 2.5% commission on withdrawal
  tableRakePercent: 5.0, // 5% platform rake on game pots
  minWithdrawalLimits: {
    USD: 10,
    EUR: 10,
    RUB: 500,
    USDT: 10,
    TON: 2,
    STARS: 50,
  },
  antiFraudMaxRiskThreshold: 70,
  require2FAForWithdrawalAbove: {
    USD: 50,
    EUR: 50,
    RUB: 2500,
    USDT: 50,
    TON: 10,
    STARS: 250,
  },
  telegramMiniAppBotUsername: 'DurakRealMoneyBot',
};

export const defaultPaymentGateways: PaymentGatewayConfig[] = [
  {
    id: 'card_visa_mc',
    name: 'Visa / MasterCard / MIR',
    type: 'card',
    icon: 'CreditCard',
    currencies: ['USD', 'EUR', 'RUB'],
    depositFeePercent: 2.0,
    withdrawFeePercent: 2.5,
    minDeposit: 5,
    maxDeposit: 5000,
    minWithdraw: 10,
    maxWithdraw: 3000,
    isEnabled: true,
  },
  {
    id: 'ton_crypto_wallet',
    name: 'TON Connect & Telegram Wallet',
    type: 'crypto',
    icon: 'Coins',
    currencies: ['TON', 'USDT'],
    depositFeePercent: 0.5,
    withdrawFeePercent: 1.0,
    minDeposit: 1,
    maxDeposit: 10000,
    minWithdraw: 2,
    maxWithdraw: 10000,
    isEnabled: true,
  },
  {
    id: 'telegram_stars_pay',
    name: 'Telegram Stars Payment',
    type: 'telegram_pay',
    icon: 'Star',
    currencies: ['STARS'],
    depositFeePercent: 0.0,
    withdrawFeePercent: 3.0,
    minDeposit: 10,
    maxDeposit: 50000,
    minWithdraw: 50,
    maxWithdraw: 50000,
    isEnabled: true,
  },
  {
    id: 'e_wallet_fast_pay',
    name: 'SBP / Fast Bank Transfer',
    type: 'e_wallet',
    icon: 'Zap',
    currencies: ['RUB', 'USD'],
    depositFeePercent: 1.0,
    withdrawFeePercent: 1.8,
    minDeposit: 100,
    maxDeposit: 250000,
    minWithdraw: 500,
    maxWithdraw: 100000,
    isEnabled: true,
  },
];

export const mockTransactions: WalletTransaction[] = [];

export function updatePlatformConfig(newConfig: Partial<PlatformConfig>) {
  platformConfig = { ...platformConfig, ...newConfig };
}

export function processDeposit(
  user: User,
  currency: Currency,
  amount: number,
  gatewayId: string
): { success: boolean; transaction?: WalletTransaction; updatedUser?: User; error?: string } {
  const gateway = defaultPaymentGateways.find((g) => g.id === gatewayId);
  if (!gateway || !gateway.isEnabled) {
    return { success: false, error: 'Payment gateway is disabled or invalid' };
  }

  if (amount < gateway.minDeposit || amount > gateway.maxDeposit) {
    return { success: false, error: `Deposit amount must be between ${gateway.minDeposit} and ${gateway.maxDeposit} ${currency}` };
  }

  const feePercent = gateway.depositFeePercent || platformConfig.depositFeeDefaultPercent;
  const feeAmount = Number(((amount * feePercent) / 100).toFixed(2));
  const netAmount = Number((amount - feeAmount).toFixed(2));

  // Risk Score calculation
  let riskScore = 10;
  if (amount > 1000) riskScore += 20;

  const transaction: WalletTransaction = {
    id: `tx_dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    username: user.username,
    type: 'deposit',
    amount,
    currency,
    status: 'completed',
    feeAmount,
    netAmount,
    gateway: gateway.name,
    riskScore,
    createdAt: new Date().toISOString(),
    referenceId: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  const updatedBalances = {
    ...user.balances,
    [currency]: Number((user.balances[currency] + netAmount).toFixed(2)),
  };

  const updatedUser: User = {
    ...user,
    balances: updatedBalances,
  };

  mockTransactions.unshift(transaction);
  return { success: true, transaction, updatedUser };
}

export function processWithdrawal(
  user: User,
  currency: Currency,
  amount: number,
  gatewayId: string,
  twoFactorCode?: string
): { success: boolean; transaction?: WalletTransaction; updatedUser?: User; error?: string; requires2FA?: boolean } {
  if (user.isBlocked) {
    return { success: false, error: 'Account is locked for security review' };
  }

  const gateway = defaultPaymentGateways.find((g) => g.id === gatewayId);
  if (!gateway || !gateway.isEnabled) {
    return { success: false, error: 'Payment gateway not available' };
  }

  const minWithdraw = gateway.minWithdraw || platformConfig.minWithdrawalLimits[currency];
  if (amount < minWithdraw || amount > gateway.maxWithdraw) {
    return { success: false, error: `Minimum withdrawal is ${minWithdraw} ${currency}` };
  }

  if (user.balances[currency] < amount) {
    return { success: false, error: 'Insufficient wallet balance' };
  }

  // 2FA check
  const threshold2FA = platformConfig.require2FAForWithdrawalAbove[currency] || 50;
  const needs2FA = user.is2FAEnabled || amount >= threshold2FA;

  if (needs2FA && (!twoFactorCode || twoFactorCode.trim().length !== 6)) {
    return { success: false, requires2FA: true, error: '2FA authentication code required for payout' };
  }

  const feePercent = gateway.withdrawFeePercent || platformConfig.withdrawalFeeDefaultPercent;
  const feeAmount = Number(((amount * feePercent) / 100).toFixed(2));
  const netAmount = Number((amount - feeAmount).toFixed(2));

  // Risk Score evaluation
  let riskScore = 15;
  if (amount > 500) riskScore += 35;
  if (user.riskScore > 50) riskScore += 25;

  const isFlagged = riskScore >= platformConfig.antiFraudMaxRiskThreshold;
  const status: TransactionStatus = isFlagged ? 'flagged' : 'completed';

  const transaction: WalletTransaction = {
    id: `tx_wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    username: user.username,
    type: 'withdrawal',
    amount,
    currency,
    status,
    feeAmount,
    netAmount,
    gateway: gateway.name,
    riskScore,
    createdAt: new Date().toISOString(),
    note: isFlagged ? 'Flagged by Anti-Fraud Engine for manual compliance approval' : undefined,
    referenceId: `WD-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  // Deduct full amount from user balance immediately
  const updatedBalances = {
    ...user.balances,
    [currency]: Number((user.balances[currency] - amount).toFixed(2)),
  };

  const updatedUser: User = {
    ...user,
    balances: updatedBalances,
  };

  mockTransactions.unshift(transaction);
  return { success: true, transaction, updatedUser };
}
