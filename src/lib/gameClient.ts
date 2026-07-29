import { Card, CardSuit, GameTable, PlayerState } from '../types';

let ws: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const listeners: Record<string, Set<(data: unknown) => void>> = {};

export type GameEventHandler<T = unknown> = (data: T) => void;

export function connectToTable(tableId: string): Promise<WebSocket> {
  if (ws && ws.readyState === WebSocket.OPEN && (ws as WebSocket & { tableId?: string }).tableId === tableId) {
    return Promise.resolve(ws);
  }

  ws?.close();

  return new Promise((resolve, reject) => {
    const wsUrl = `ws://localhost:8080/tables/${tableId}`; // override with VITE_WS_URL at build time
    const connection = new WebSocket(wsUrl);

    (connection as WebSocket & { tableId?: string }).tableId = tableId;

    connection.onopen = () => {
      clearTimeout(retryTimer);
      resolve(connection);
    };

    connection.onerror = (event) => {
      console.error('WebSocket error', event);
      reject(new Error('WebSocket connection error'));
    };

    connection.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; data?: unknown };
        if (payload.type) {
          const handlers = listeners[payload.type];
          if (handlers) {
            handlers.forEach((handler) => handler(payload.data));
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    connection.onclose = () => {
      scheduleReconnect(tableId);
    };

    ws = connection;
  });
}

export function disconnect(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  ws?.close();
  ws = null;
}

export function on<K extends string>(
  event: K,
  handler: GameEventHandler
): () => void {
  if (!listeners[event]) {
    listeners[event] = new Set();
  }
  listeners[event].add(handler as GameEventHandler);

  return () => {
    const handlers = listeners[event];
    if (handlers) {
      handlers.delete(handler as GameEventHandler);
      if (handlers.size === 0) {
        delete listeners[event];
      }
    }
  };
}

export function playCard(
  tableId: string,
  cardId: string,
  pairId?: string
): Promise<void> {
  return sendWithSocket(tableId, {
    type: 'play_card',
    cardId,
    pairId,
  });
}

export function takeCards(tableId: string): Promise<void> {
  return sendWithSocket(tableId, {
    type: 'take',
  });
}

export function passTurn(tableId: string): Promise<void> {
  return sendWithSocket(tableId, {
    type: 'pass',
  });
}

export function readyToPlay(tableId: string): Promise<void> {
  return sendWithSocket(tableId, {
    type: 'ready',
  });
}

function sendWithSocket(tableId: string, payload: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = getOrReopenSocket(tableId);
    if (target.readyState !== WebSocket.OPEN) {
      return reject(new Error('WebSocket is not connected'));
    }

    const responseHandler = (eventData: unknown) => {
      const data = eventData as { success?: boolean; error?: string };
      if (typeof data?.success === 'boolean') {
        if (data.success) {
          resolve();
        } else {
          reject(new Error(data.error || 'Invalid game operation'));
        }
        off('message_response', responseHandler);
      }
    };

    off('message_response', responseHandler);
    on('message_response', responseHandler);

    target.send(JSON.stringify(payload));
  });
}

function scheduleReconnect(tableId: string) {
  if (retryTimer) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectToTable(tableId).catch((err) => {
      console.warn('Reconnect failed, will retry later', err);
    });
  }, 2000);
}

function getOrReopenSocket(tableId: string): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN && (ws as WebSocket & { tableId?: string }).tableId === tableId) {
    return ws;
  }

  connectToTable(tableId).catch((err) => {
    console.error('Socket reopen failed', err);
  });

  if (!ws) {
    throw new Error('WebSocket is not available');
  }

  return ws;
}

function off<K extends string>(event: K, handler: GameEventHandler): void {
  const handlers = listeners[event];
  if (handlers) {
    handlers.delete(handler);
    if (handlers.size === 0) {
      delete listeners[event];
    }
  }
}
