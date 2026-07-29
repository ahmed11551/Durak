export type BankPartnerName = 'mock' | 'tinkoff' | 'sber' | 'vtb' | 'alpha';

export interface BankPartnerConfig {
  name: BankPartnerName;
  enabled: boolean;
  apiKey?: string;
  accountId?: string;
  supportedCurrencies: string[];
  settlementAccount?: string;
  bic?: string;
  correspondentAccount?: string;
  webhookSecret?: string;
  payoutSchedule: 'instant' | 'daily' | 'weekly';
}

export const defaultBankPartners: BankPartnerConfig[] = [
  {
    name: 'mock',
    enabled: true,
    supportedCurrencies: ['RUB'],
    payoutSchedule: 'daily',
  },
  {
    name: 'tinkoff',
    enabled: false,
    supportedCurrencies: ['RUB'],
    payoutSchedule: 'instant',
  },
  {
    name: 'sber',
    enabled: false,
    supportedCurrencies: ['RUB'],
    payoutSchedule: 'daily',
  },
  {
    name: 'vtb',
    enabled: false,
    supportedCurrencies: ['RUB', 'USD', 'EUR'],
    payoutSchedule: 'daily',
  },
  {
    name: 'alpha',
    enabled: false,
    supportedCurrencies: ['RUB', 'USD', 'EUR'],
    payoutSchedule: 'weekly',
  },
];

export function getActiveBankPartner(name: BankPartnerName): BankPartnerConfig {
  return defaultBankPartners.find((p) => p.name === name) || defaultBankPartners[0];
}

export function isBankPartnerEnabled(name: BankPartnerName): boolean {
  return getActiveBankPartner(name).enabled;
}
