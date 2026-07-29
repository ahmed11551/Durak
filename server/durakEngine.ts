import { Card, CardRank, CardSuit, DurakGameMode, GameTable, PlayerState, TablePair } from '../src/types';

const SUITS: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS_36: CardRank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_24: CardRank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES: Record<CardRank, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export function createDeck(deckSize: 24 | 36): Card[] {
  const ranks = deckSize === 24 ? RANKS_24 : RANKS_36;
  const deck: Card[] = [];
  let idCounter = 1;

  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({
        id: `card_${idCounter++}_${suit}_${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }

  // Shuffle deck (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function initializeGame(table: GameTable): GameTable {
  const deck = createDeck(table.deckSize);
  const activePlayers = table.players.map((p) => ({
    ...p,
    cards: [] as Card[],
    isOut: false,
    place: undefined,
    isDurak: false,
  }));

  // Deal 6 cards to each active player
  for (let i = 0; i < 6; i++) {
    for (const p of activePlayers) {
      if (deck.length > 0) {
        p.cards.push(deck.pop()!);
      }
    }
  }

  // Trump card is the bottom card
  const trumpCard = deck.length > 0 ? deck[0] : null;
  const trumpSuit = trumpCard ? trumpCard.suit : SUITS[Math.floor(Math.random() * SUITS.length)];

  // Find player with lowest trump card to start
  let lowestTrumpValue = 99;
  let firstAttackerIndex = 0;

  activePlayers.forEach((p, idx) => {
    p.cards.forEach((c) => {
      if (c.suit === trumpSuit && c.value < lowestTrumpValue) {
        lowestTrumpValue = c.value;
        firstAttackerIndex = idx;
      }
    });
  });

  const attackerIndex = firstAttackerIndex;
  const defenderIndex = (attackerIndex + 1) % activePlayers.length;

  return {
    ...table,
    status: 'playing',
    deck,
    trumpCard,
    trumpSuit,
    discardPile: [],
    tablePairs: [],
    players: activePlayers,
    attackerIndex,
    defenderIndex,
    firstAttackerIndex,
    winnerIds: [],
    loserId: undefined,
    currentTurnDeadline: Date.now() + table.turnTimeLimitSec * 1000,
  };
}

export function canBeat(attackCard: Card, defendCard: Card, trumpSuit: CardSuit): boolean {
  if (defendCard.suit === attackCard.suit) {
    return defendCard.value > attackCard.value;
  }
  if (defendCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
    return true;
  }
  return false;
}

export function canAttack(tablePairs: TablePair[], card: Card): boolean {
  if (tablePairs.length === 0) return true;
  const allCardsOnTable: Card[] = [];
  tablePairs.forEach((pair) => {
    if (pair.attackCard) allCardsOnTable.push(pair.attackCard);
    if (pair.defendCard) allCardsOnTable.push(pair.defendCard);
  });
  return allCardsOnTable.some((c) => c.rank === card.rank);
}

export function handleAttackMove(
  table: GameTable,
  playerId: string,
  cardId: string
): { success: boolean; error?: string; updatedTable?: GameTable } {
  const player = table.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  const attacker = table.players[table.attackerIndex];
  if (!attacker || attacker.id !== playerId) {
    // Check if secondary attacker
    const defender = table.players[table.defenderIndex];
    if (playerId === defender.id) {
      return { success: false, error: 'Defender cannot attack' };
    }
  }

  const card = player.cards.find((c) => c.id === cardId);
  if (!card) return { success: false, error: 'Card not in hand' };

  if (!canAttack(table.tablePairs, card)) {
    return { success: false, error: 'Card rank does not match any table card' };
  }

  const defender = table.players[table.defenderIndex];
  const totalUnbeaten = table.tablePairs.filter((p) => !p.defendCard).length + 1;
  const maxAttackCardsAllowed = Math.min(6, defender.cards.length);

  if (table.tablePairs.length >= maxAttackCardsAllowed) {
    return { success: false, error: 'Defender cannot take more cards' };
  }

  // Remove card from player hand and add to table
  const updatedPlayerCards = player.cards.filter((c) => c.id !== cardId);
  const updatedPlayers = table.players.map((p) => (p.id === playerId ? { ...p, cards: updatedPlayerCards } : p));

  const newPair: TablePair = {
    id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    attackCard: card,
    attackerId: playerId,
  };

  const updatedTable: GameTable = {
    ...table,
    players: updatedPlayers,
    tablePairs: [...table.tablePairs, newPair],
    passedPlayerIds: [], // Reset passes when a new attack card is thrown
    currentTurnDeadline: Date.now() + table.turnTimeLimitSec * 1000,
  };

  return { success: true, updatedTable };
}

export function handleDefendMove(
  table: GameTable,
  playerId: string,
  cardId: string,
  pairId: string
): { success: boolean; error?: string; updatedTable?: GameTable } {
  const defender = table.players[table.defenderIndex];
  if (defender.id !== playerId) {
    return { success: false, error: 'Only defender can play defense' };
  }

  const card = defender.cards.find((c) => c.id === cardId);
  if (!card) return { success: false, error: 'Card not in hand' };

  const pairIndex = table.tablePairs.findIndex((p) => p.id === pairId);
  if (pairIndex === -1) return { success: false, error: 'Table pair not found' };

  const pair = table.tablePairs[pairIndex];
  if (pair.defendCard) return { success: false, error: 'Pair already defended' };

  if (!canBeat(pair.attackCard, card, table.trumpSuit!)) {
    return { success: false, error: 'Card cannot beat attack card' };
  }

  // Remove card from defender hand and attach to pair
  const updatedCards = defender.cards.filter((c) => c.id !== cardId);
  const updatedPlayers = table.players.map((p) => (p.id === playerId ? { ...p, cards: updatedCards } : p));

  const updatedPairs = [...table.tablePairs];
  updatedPairs[pairIndex] = {
    ...pair,
    defendCard: card,
    defenderId: playerId,
  };

  const updatedTable: GameTable = {
    ...table,
    players: updatedPlayers,
    tablePairs: updatedPairs,
    currentTurnDeadline: Date.now() + table.turnTimeLimitSec * 1000,
  };

  return { success: true, updatedTable };
}

export function handleTransferMove(
  table: GameTable,
  playerId: string,
  cardId: string
): { success: boolean; error?: string; updatedTable?: GameTable } {
  if (table.mode !== 'perevodnoy') {
    return { success: false, error: 'Transfer only allowed in Perevodnoy mode' };
  }

  const defender = table.players[table.defenderIndex];
  if (defender.id !== playerId) {
    return { success: false, error: 'Only defender can transfer attack' };
  }

  // Defender cannot transfer if they have already played a defense card on any pair
  const hasDefendedAny = table.tablePairs.some((p) => !!p.defendCard);
  if (hasDefendedAny) {
    return { success: false, error: 'Cannot transfer after defending' };
  }

  const card = defender.cards.find((c) => c.id === cardId);
  if (!card) return { success: false, error: 'Card not in hand' };

  // Card rank must match current attacking cards rank
  const attackRank = table.tablePairs[0]?.attackCard.rank;
  if (attackRank && card.rank !== attackRank) {
    return { success: false, error: 'Transfer card rank must match attacking rank' };
  }

  // Next defender must have enough cards to defend
  let nextDefenderIndex = (table.defenderIndex + 1) % table.players.length;
  while (table.players[nextDefenderIndex].isOut || table.players[nextDefenderIndex].id === defender.id) {
    nextDefenderIndex = (nextDefenderIndex + 1) % table.players.length;
  }

  const nextDefender = table.players[nextDefenderIndex];
  if (nextDefender.cards.length < table.tablePairs.length + 1) {
    return { success: false, error: 'Next defender does not have enough cards to take transfer' };
  }

  const updatedDefenderCards = defender.cards.filter((c) => c.id !== cardId);
  const updatedPlayers = table.players.map((p) => (p.id === playerId ? { ...p, cards: updatedDefenderCards } : p));

  const newPair: TablePair = {
    id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    attackCard: card,
    attackerId: playerId,
  };

  const updatedTable: GameTable = {
    ...table,
    players: updatedPlayers,
    tablePairs: [...table.tablePairs, newPair],
    attackerIndex: table.defenderIndex,
    defenderIndex: nextDefenderIndex,
    currentTurnDeadline: Date.now() + table.turnTimeLimitSec * 1000,
  };

  return { success: true, updatedTable };
}

export function replenishHands(table: GameTable): GameTable {
  let deck = [...table.deck];
  const players = table.players.map((p) => ({ ...p, cards: [...p.cards] }));

  if (deck.length === 0) return { ...table, players };

  // Deal order: Attacker first, then other attackers, then defender
  const dealOrderIndexes: number[] = [];
  let idx = table.attackerIndex;
  for (let count = 0; count < players.length; count++) {
    if (!players[idx].isOut) {
      dealOrderIndexes.push(idx);
    }
    idx = (idx + 1) % players.length;
  }

  for (const playerIdx of dealOrderIndexes) {
    const p = players[playerIdx];
    while (p.cards.length < 6 && deck.length > 0) {
      p.cards.push(deck.pop()!);
    }
  }

  return {
    ...table,
    deck,
    players,
  };
}

export function checkGameEnd(table: GameTable): GameTable {
  const activePlayers = table.players.filter((p) => !p.isOut);

  // If player has 0 cards and deck is empty, they are out (winner/safe)
  const newlyOutPlayers: string[] = [];
  const updatedPlayers = table.players.map((p) => {
    if (!p.isOut && p.cards.length === 0 && table.deck.length === 0) {
      newlyOutPlayers.push(p.id);
      return { ...p, isOut: true };
    }
    return p;
  });

  const winnerIds = [...table.winnerIds, ...newlyOutPlayers];
  const remainingActive = updatedPlayers.filter((p) => !p.isOut);

  if (remainingActive.length <= 1) {
    const loser = remainingActive[0];
    const finalPlayers = updatedPlayers.map((p) => (p.id === loser?.id ? { ...p, isDurak: true } : p));

    return {
      ...table,
      status: 'finished',
      players: finalPlayers,
      winnerIds,
      loserId: loser?.id,
    };
  }

  return {
    ...table,
    players: updatedPlayers,
    winnerIds,
  };
}

export function handlePassMove(
  table: GameTable,
  playerId: string
): { success: boolean; error?: string; updatedTable?: GameTable } {
  const defender = table.players[table.defenderIndex];
  if (defender && defender.id === playerId) {
    return { success: false, error: 'Defender cannot pass' };
  }

  const currentPassed = new Set(table.passedPlayerIds || []);
  currentPassed.add(playerId);

  let updatedTable: GameTable = {
    ...table,
    passedPlayerIds: Array.from(currentPassed),
  };

  const activeAttackers = table.players.filter((p) => !p.isOut && p.id !== defender?.id);
  const allAttackersPassed = activeAttackers.every((p) => currentPassed.has(p.id));

  const allDefended = updatedTable.tablePairs.length > 0 && updatedTable.tablePairs.every((p) => !!p.defendCard);

  if (allAttackersPassed && allDefended) {
    return handleBito(updatedTable);
  }

  return { success: true, updatedTable };
}

export function handleBito(table: GameTable): { success: boolean; error?: string; updatedTable?: GameTable } {
  // Bito requires all table pairs to have a defense card
  const allDefended = table.tablePairs.length > 0 && table.tablePairs.every((p) => !!p.defendCard);
  if (!allDefended) {
    return { success: false, error: 'Cannot pass bito until all cards are defended' };
  }

  // All cards on table go to discard pile
  const tableCards: Card[] = [];
  table.tablePairs.forEach((p) => {
    if (p.attackCard) tableCards.push(p.attackCard);
    if (p.defendCard) tableCards.push(p.defendCard);
  });

  const discardPile = [...table.discardPile, ...tableCards];
  let updatedTable: GameTable = {
    ...table,
    tablePairs: [],
    passedPlayerIds: [],
    discardPile,
  };

  // Replenish cards from deck
  updatedTable = replenishHands(updatedTable);

  // Turn passes to former defender (who becomes new attacker)
  let nextAttackerIndex = updatedTable.defenderIndex;
  while (updatedTable.players[nextAttackerIndex].isOut) {
    nextAttackerIndex = (nextAttackerIndex + 1) % updatedTable.players.length;
  }

  let nextDefenderIndex = (nextAttackerIndex + 1) % updatedTable.players.length;
  while (updatedTable.players[nextDefenderIndex].isOut || nextDefenderIndex === nextAttackerIndex) {
    nextDefenderIndex = (nextDefenderIndex + 1) % updatedTable.players.length;
  }

  updatedTable = {
    ...updatedTable,
    attackerIndex: nextAttackerIndex,
    defenderIndex: nextDefenderIndex,
    currentTurnDeadline: Date.now() + table.turnTimeLimitSec * 1000,
  };

  updatedTable = checkGameEnd(updatedTable);

  return { success: true, updatedTable };
}

export function handleTake(table: GameTable): { success: boolean; error?: string; updatedTable?: GameTable } {
  if (table.tablePairs.length === 0) {
    return { success: false, error: 'Table is empty' };
  }

  const defender = table.players[table.defenderIndex];
  const tableCards: Card[] = [];
  table.tablePairs.forEach((p) => {
    if (p.attackCard) tableCards.push(p.attackCard);
    if (p.defendCard) tableCards.push(p.defendCard);
  });

  const updatedDefenderCards = [...defender.cards, ...tableCards];
  const updatedPlayers = table.players.map((p) => (p.id === defender.id ? { ...p, cards: updatedDefenderCards } : p));

  let updatedTable: GameTable = {
    ...table,
    players: updatedPlayers,
    tablePairs: [],
  };

  // Replenish cards for attackers (not defender, who took)
  updatedTable = replenishHands(updatedTable);

  // Turn skips defender, next player becomes attacker
  let nextAttackerIndex = (table.defenderIndex + 1) % updatedTable.players.length;
  while (updatedTable.players[nextAttackerIndex].isOut) {
    nextAttackerIndex = (nextAttackerIndex + 1) % updatedTable.players.length;
  }

  let nextDefenderIndex = (nextAttackerIndex + 1) % updatedTable.players.length;
  while (updatedTable.players[nextDefenderIndex].isOut || nextDefenderIndex === nextAttackerIndex) {
    nextDefenderIndex = (nextDefenderIndex + 1) % updatedTable.players.length;
  }

  updatedTable = {
    ...updatedTable,
    attackerIndex: nextAttackerIndex,
    defenderIndex: nextDefenderIndex,
    currentTurnDeadline: Date.now() + table.turnTimeLimitSec * 1000,
  };

  updatedTable = checkGameEnd(updatedTable);

  return { success: true, updatedTable };
}

export function computeBotMove(table: GameTable): GameTable {
  if (table.status !== 'playing') return table;

  const currentAttacker = table.players[table.attackerIndex];
  const currentDefender = table.players[table.defenderIndex];

  // If Defender is Bot and has undefended attacks
  if (currentDefender && currentDefender.isBot && !currentDefender.isOut) {
    const undefendedPairs = table.tablePairs.filter((p) => !p.defendCard);
    if (undefendedPairs.length > 0) {
      const pair = undefendedPairs[0];
      // Find lowest beating card
      const BeatingCard = currentDefender.cards
        .filter((c) => canBeat(pair.attackCard, c, table.trumpSuit!))
        .sort((a, b) => {
          const aIsTrump = a.suit === table.trumpSuit;
          const bIsTrump = b.suit === table.trumpSuit;
          if (aIsTrump && !bIsTrump) return 1;
          if (!aIsTrump && bIsTrump) return -1;
          return a.value - b.value;
        })[0];

      if (BeatingCard) {
        const result = handleDefendMove(table, currentDefender.id, BeatingCard.id, pair.id);
        if (result.success && result.updatedTable) return result.updatedTable;
      } else {
        // Bot takes cards if it can't beat
        const result = handleTake(table);
        if (result.success && result.updatedTable) return result.updatedTable;
      }
    }
  }

  // If Attacker is Bot
  if (currentAttacker && currentAttacker.isBot && !currentAttacker.isOut) {
    if (table.tablePairs.length === 0) {
      // First attack: play lowest non-trump card
      const attackCard = [...currentAttacker.cards].sort((a, b) => {
        const aIsTrump = a.suit === table.trumpSuit;
        const bIsTrump = b.suit === table.trumpSuit;
        if (aIsTrump && !bIsTrump) return 1;
        if (!aIsTrump && bIsTrump) return -1;
        return a.value - b.value;
      })[0];

      if (attackCard) {
        const result = handleAttackMove(table, currentAttacker.id, attackCard.id);
        if (result.success && result.updatedTable) return result.updatedTable;
      }
    } else {
      // Follow-up attack if matching rank exists
      const matchingAttackCard = currentAttacker.cards
        .filter((c) => canAttack(table.tablePairs, c))
        .sort((a, b) => a.value - b.value)[0];

      if (matchingAttackCard) {
        const result = handleAttackMove(table, currentAttacker.id, matchingAttackCard.id);
        if (result.success && result.updatedTable) return result.updatedTable;
      } else {
        // Pass bito if all defended
        if (table.tablePairs.every((p) => !!p.defendCard)) {
          const result = handleBito(table);
          if (result.success && result.updatedTable) return result.updatedTable;
        }
      }
    }
  }

  return table;
}
