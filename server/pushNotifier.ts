import { AppNotification, NotificationType } from '../src/types';

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif_welcome',
    userId: 'user_1',
    title: 'Welcome to Durak Real-Money Platform!',
    body: 'Multi-currency wallets (USDT, TON, USD, RUB) are active with secure payment gateways and 2FA protection.',
    type: 'system',
    read: false,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'notif_bonus',
    userId: 'user_1',
    title: 'Daily Tournament Bonus',
    body: 'Claim your 100 STARS bonus to play low-stake tables today.',
    type: 'bonus',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

export function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  link?: string
): AppNotification {
  const notif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    title,
    body,
    type,
    read: false,
    timestamp: new Date().toISOString(),
    link,
  };
  mockNotifications.unshift(notif);
  return notif;
}
