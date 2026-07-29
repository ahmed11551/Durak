export type KYCProviderName = 'mock' | 'tinkoff' | 'yookassa' | 'stripe';

export interface KYCProviderConfig {
  name: KYCProviderName;
  apiKey?: string;
  secretKey?: string;
  enabled: boolean;
  supportedCountries: string[];
  requiredDocuments: string[];
  verificationLevels: string[];
  webhookUrl?: string;
}

export const defaultKYCProviders: KYCProviderConfig[] = [
  {
    name: 'mock',
    enabled: true,
    supportedCountries: ['RU', 'BY', 'KZ', 'UZ'],
    requiredDocuments: ['passport', 'inn_if_required', 'selfie'],
    verificationLevels: ['basic', 'full'],
  },
  {
    name: 'tinkoff',
    enabled: false,
    supportedCountries: ['RU'],
    requiredDocuments: ['passport', 'inn', 'selfie'],
    verificationLevels: ['basic', 'full'],
  },
  {
    name: 'yookassa',
    enabled: false,
    supportedCountries: ['RU', 'KZ', 'BY'],
    requiredDocuments: ['passport', 'inn'],
    verificationLevels: ['basic'],
  },
  {
    name: 'stripe',
    enabled: false,
    supportedCountries: ['US', 'EU', 'RU'],
    requiredDocuments: ['passport', 'proof_of_address'],
    verificationLevels: ['basic', 'full'],
  },
];

export function getActiveKYCProvider(name: KYCProviderName): KYCProviderConfig {
  return defaultKYCProviders.find((p) => p.name === name) || defaultKYCProviders[0];
}

export function isKYCProviderEnabled(name: KYCProviderName): boolean {
  return getActiveKYCProvider(name).enabled;
}
