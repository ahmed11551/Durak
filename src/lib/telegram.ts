// Telegram Mini App API Helper
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        ready: () => void;
      };
    };
  }
}

export function isTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

export function initTelegramWebApp() {
  if (isTelegramMiniApp()) {
    const tg = window.Telegram!.WebApp!;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0f172a');
  }
}

export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  if (isTelegramMiniApp() && window.Telegram?.WebApp?.HapticFeedback) {
    const haptic = window.Telegram.WebApp.HapticFeedback;
    if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  }
}

export function getTelegramUser() {
  if (isTelegramMiniApp()) {
    return window.Telegram?.WebApp?.initDataUnsafe?.user;
  }
  return null;
}
