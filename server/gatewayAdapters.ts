import { Currency, PaymentGatewayConfig, WalletTransaction } from '../src/types';

export type GatewayAdapter = {
  id: string;
  createDepositIntent(params: { userId: string; currency: Currency; amount: number; gatewayId: string }): Promise<{ success: boolean; referenceId?: string; redirectUrl?: string; error?: string }>;
  createWithdrawalIntent(params: { userId: string; currency: Currency; amount: number; gatewayId: string; destination: string }): Promise<{ success: boolean; referenceId?: string; error?: string }>;
  verifyWebhook(payload: unknown, signatureHeader: string | undefined, secret: string | undefined): boolean;
  refund(referenceId: string, amount: number, currency: Currency): Promise<{ success: boolean; error?: string }>;
};

function buildMockAdapter(gateway: PaymentGatewayConfig): GatewayAdapter {
  return {
    id: gateway.id,
    async createDepositIntent() {
      return { success: true, referenceId: 'mock_dep_' + Date.now(), redirectUrl: undefined };
    },
    async createWithdrawalIntent() {
      return { success: true, referenceId: 'mock_wd_' + Date.now() };
    },
    verifyWebhook() {
      return true;
    },
    async refund() {
      return { success: true };
    },
  };
}

let adapterCache: Record<string, GatewayAdapter> = {};

export function getGatewayAdapter(gatewayId: string): GatewayAdapter {
  if (!adapterCache[gatewayId]) {
    const byId = (id: string) => id === gatewayId;
    const gw = (global as any).defaultPaymentGateways?.find((g: any) => g.id === gatewayId);
    adapterCache[gatewayId] = buildMockAdapter(gw || { id: gatewayId, type: 'card', name: gatewayId });
  }
  return adapterCache[gatewayId];
}

export function buildWebhookHandler(adapter: GatewayAdapter, secret?: string) {
  return async (payload: unknown, signatureHeader?: string) => {
    if (!adapter.verifyWebhook(payload, signatureHeader, secret)) {
      throw new Error('Invalid webhook signature');
    }
    return { ok: true };
  };
}
