import { PazaakCards } from '@/enums/minigames/PazaakCards';
import { PazaakTableSlots } from '@/enums/minigames/PazaakTableSlots';
import type { IPazaakCard } from '@/interface/minigames/IPazaakCard';
import type { IPazaakTable } from '@/interface/minigames/IPazaakTable';

/**
 * Side-card point delta for play / AI.
 * Card 0x16 (PLUS_MINUS_1_OR_2): CHANGE selects magnitude, FLIP selects sign.
 * SetCard / HandleChangeHandCard.
 */
export function resolveSideCardDelta(
  card: IPazaakCard,
  cardId: number,
  flipped: boolean,
  swapped: boolean,
  table: IPazaakTable
): number {
  if(cardId === PazaakCards.PLUS_MINUS_1_OR_2 || card.negateModifier){
    const mag = Math.abs(swapped ? card.modifier[1] : card.modifier[0]);
    return flipped ? -mag : mag;
  }
  if(cardId === PazaakCards.TIE_BREAKER){
    return flipped ? -1 : 1;
  }
  if(cardId === PazaakCards.DOUBLE){
    let last = 0;
    for(let j = PazaakTableSlots.MAX_SLOTS - 1; j >= 0; j--){
      const prev = table.cardArea.get(j);
      if(prev && typeof prev.playedValue === 'number'){
        last = prev.playedValue;
        break;
      }
    }
    return last;
  }
  if(cardId === PazaakCards.FLIP_2_AND_4 || cardId === PazaakCards.FLIP_3_AND_6){
    return 0;
  }
  return flipped ? card.modifier[1] : card.modifier[0];
}

export function sideCardDisplayLabel(
  card: IPazaakCard,
  cardId: number,
  flipped: boolean,
  swapped: boolean
): string {
  if(cardId === PazaakCards.PLUS_MINUS_1_OR_2 || card.negateModifier){
    const mag = Math.abs(swapped ? card.modifier[1] : card.modifier[0]);
    const v = flipped ? -mag : mag;
    return v > 0 ? `+${v}` : `${v}`;
  }
  if(cardId === PazaakCards.TIE_BREAKER){
    return flipped ? '-1T' : '+1T';
  }
  if(cardId === PazaakCards.DOUBLE){
    return 'D';
  }
  if(cardId === PazaakCards.FLIP_2_AND_4){
    return '2&4';
  }
  if(cardId === PazaakCards.FLIP_3_AND_6){
    return '3&6';
  }
  if(card.reversible){
    const v = flipped ? card.modifier[1] : card.modifier[0];
    return v > 0 ? `+${v}` : `${v}`;
  }
  return card.modifierLabel;
}

/**
 * TSL Flip 2&4 / 3&6 — negate played cards whose |value| is in targets on both tables.
 */
export function applyBoardFlipSpecial(tables: IPazaakTable[], targets: number[]){
  for(let t = 0; t < tables.length; t++){
    const table = tables[t];
    for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
      const slot = table.cardArea.get(j);
      if(!slot || typeof slot.playedValue !== 'number'){ continue; }
      const abs = Math.abs(slot.playedValue);
      if(!targets.includes(abs)){ continue; }
      table.points -= slot.playedValue;
      slot.playedValue = -slot.playedValue;
      slot.flipped = !slot.flipped;
      slot.modifierLabel = slot.playedValue > 0 ? `+${slot.playedValue}` : `${slot.playedValue}`;
      table.points += slot.playedValue;
    }
  }
}
