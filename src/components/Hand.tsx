import React from 'react';
import { Card as CardType, CardSuit } from '../types';
import { CardComponent as Card } from './Card';

interface HandProps {
  cards: CardType[];
  trumpSuit?: CardSuit;
  selectedCardId?: string | null;
  onCardClick?: (card: CardType) => void;
}

export const Hand: React.FC<HandProps> = ({ cards, trumpSuit, selectedCardId, onCardClick }) => {
  return (
    <div className="flex items-end justify-center gap-1 sm:gap-2 overflow-x-auto pb-2 pt-1">
      {cards.map((card) => {
        const isSelected = selectedCardId === card.id;
        return (
          <Card
            key={card.id}
            card={card}
            isTrump={!!(trumpSuit && card.suit === trumpSuit)}
            isSelected={isSelected}
            onClick={() => onCardClick?.(card)}
          />
        );
      })}
    </div>
  );
};
