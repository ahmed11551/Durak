export type PaymentProviderName = 'mock' | 'stripe' | 'tinkoff' | 'yookassa' | 'crypto' | 'telegram_stars';

export interface PaymentProviderConfig {
  name: PaymentProviderName;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantId?: string;
  enabled: boolean;
  supportedCurrencies: string[];
  depositFeePercent: number;
  withdrawalFeePercent: number;
  minDeposit: Record<string, number>;
  maxDeposit: Record<string, number>;
  minWithdraw: Record<string, number>;
  maxWithdraw: Record<string, number>;
  kycRequiredFor: string[];
}

export const defaultPaymentProviders: PaymentProviderConfig[] = [
  {
    name: 'mock',
    enabled: true,
    supportedCurrencies: ['USD', 'EUR', 'RUB', 'USDT', 'TON', 'STARS'],
    depositFeePercent: 1.5,
    withdrawalFeePercent: 2.5,
    minDeposit: { USD: 5, EUR: 5, RUB: 500, USDT: 10, TON: 2, STARS: 50 },
    maxDeposit: { USD: 5000, EUR: 5000, RUB: 250000, USDT: 10000, TON: 10000, STARS: 50000 },
    minWithdraw: { USD: 10, EUR: 10, RUB: 500, USDT: 10, TON: 2, STARS: 50 },
    maxWithdraw: { USD: 3000, EUR: 3000, RUB: 100000, USDT: 10000, TON: 10000, STARS: 50000 },
    kycRequiredFor: ['USD', 'EUR', 'RUB'],
  },
  {
    name: 'stripe',
    enabled: false,
    supportedCurrencies: ['USD', 'EUR'],
    depositFeePercent: 1.4,
    withdrawalFeePercent: 2.2,
    minDeposit: { USD: 5, EUR: 5 },
    maxDeposit: { USD: 5000, EUR: 5000 },
    minWithdraw: { USD: 10, EUR: 10 },
    maxWithdraw: { USD: 3000, EUR: 3000 },
    kycRequiredFor: ['USD', 'EUR'],
  },
  {
    name: 'yookassa',
    enabled: false,
    supportedCurrencies: ['RUB', 'USD', 'EUR'],
    depositFeePercent: 1.2,
    withdrawalFeePercent: 2.0,
    minDeposit: { RUB: 100, USD: 5, EUR: 5 },
    maxDeposit: { RUB: 250000, USD: 5000, EUR: 5000 },
    minWithdraw: { RUB: 500, USD: 10, EUR: 10 },
    maxWithdraw: { RUB: 100000, USD: 3000, EUR: 3000 },
    kycRequiredFor: ['RUB', 'USD', 'EUR'],
  },
  {
    name: 'telegram_stars',
    enabled: false,
    supportedCurrencies: ['STARS'],
    depositFeePercent: 0.0,
    withdrawalFeePercent: 3.0,
    minDeposit: { STARS: 50 },
    maxDeposit: { STARS: 50000 },
    minWithdraw: { STARS: 50 },
    maxWithdraw: { STARS: 50000 },
    kycRequiredFor: [],
  },
];

export function getActiveProvider(name: PaymentProviderName): PaymentProviderConfig {
  return defaultPaymentProviders.find((p) => p.name === name) || defaultPaymentProviders[0];
}

export function isProviderEnabled(name: PaymentProviderName): boolean {
  return getActiveProvider(name).enabled;
}
