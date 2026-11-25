import { PazaakCards } from '@core/enums/minigames/PazaakCards';
import { PazaakTableSlots } from '@core/enums/minigames/PazaakTableSlots';
import type { IPazaakCard } from '@core/interface/minigames/IPazaakCard';
import type { IPazaakTable } from '@core/interface/minigames/IPazaakTable';

/**
 * Value of the most recently placed card on a table (0 when the board is empty).
 */
export function lastPlayedValue(table: IPazaakTable): number {
  for(let j = PazaakTableSlots.MAX_SLOTS - 1; j >= 0; j--){
    const prev = table.cardArea.get(j);
    if(prev && typeof prev.playedValue === 'number'){
      return prev.playedValue;
    }
  }
  return 0;
}

/**
 * Point delta a side card contributes when played.
 * The TSL ±1/±2 card uses CHANGE (swapped) for magnitude and FLIP for sign.
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
    return lastPlayedValue(table);
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
 * Board points a Flip 2&4 / Flip 3&6 card would produce, without changing the board.
 */
export function previewBoardFlip(table: IPazaakTable, targets: number[]): number {
  let total = 0;
  for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
    const slot = table.cardArea.get(j);
    if(!slot || typeof slot.playedValue !== 'number'){ continue; }
    total += targets.includes(slot.playedValue) ? -slot.playedValue : slot.playedValue;
  }
  return total;
}

/**
 * TSL Flip 2&4 / Flip 3&6 — turns every positive card on the playing side's own
 * board whose value is one of the targets negative. Negative cards and the
 * opponent's board are untouched.
 */
export function applyBoardFlip(table: IPazaakTable, targets: number[]){
  for(let j = 0; j < PazaakTableSlots.MAX_SLOTS; j++){
    const slot = table.cardArea.get(j);
    if(!slot || typeof slot.playedValue !== 'number'){ continue; }
    if(!targets.includes(slot.playedValue)){ continue; }
    table.points -= slot.playedValue;
    slot.playedValue = -slot.playedValue;
    if(slot.reversible || slot.negateModifier){
      slot.flipped = !slot.flipped;
    }
    slot.modifierLabel = slot.cardId === PazaakCards.TIE_BREAKER
      ? (slot.playedValue > 0 ? '+1T' : '-1T')
      : (slot.playedValue > 0 ? `+${slot.playedValue}` : `${slot.playedValue}`);
    table.points += slot.playedValue;
  }
}
