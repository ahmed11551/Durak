import React from 'react';
import { Card } from './Card';

interface HandProps {
  cards: import('../../types').Card[];
  trumpSuit?: import('../../types').CardSuit;
  selectedCardId?: string | null;
  onCardClick?: (card: import('../../types').Card) => void;
}

export const Hand: React.FC<HandProps> = ({ cards, trumpSuit, selectedCardId, onCardClick }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 pt-1">
      {cards.map((card) => {
        const isSelected = selectedCardId === card.id;
        return (
          <Card
            key={card.id}
            card={card}
            isTrump={trumpSuit ? card.suit === trumpSuit : false}
            isSelected={isSelected}
            onClick={() => onCardClick?.(card)}
          />
        );
      })}
    </div>
  );
};
