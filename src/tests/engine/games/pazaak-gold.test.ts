/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { PazaakCards } from '@core/enums/minigames/PazaakCards';
import { PazaakTurnState } from '@core/enums/minigames/PazaakTurnState';
import { PazaakConfig as PazaakConfig_TSL } from '@engine/games/tsl/minigames/mg-pazaak-config';
import type { IPazaakTable } from '@core/interface/minigames/IPazaakTable';
import {
  applyBoardFlip,
  previewBoardFlip,
  resolveSideCardDelta,
  sideCardDisplayLabel,
} from '@engine/minigames/pazaak-side-card';
import { PazaakDeck } from '@engine/minigames/PazaakDeck';

function emptyTable(): IPazaakTable {
  return {
    points: 10,
    winCount: 0,
    stand: false,
    turnState: PazaakTurnState.INVALID,
    cardArea: new Map(),
    sideDeck: new Map(),
    handCards: new Map(),
    handCardPlayed: false,
    flipCards: new Map(),
    swapValueCards: new Map(),
    tieBreaker: false,
  };
}

describe('TSL Pazaak gold specials', () => {
  const side = PazaakConfig_TSL.data.sideDeckCards;

  it('gold order matches engine 0x12..0x16', () => {
    expect(side[18].name).toBe('Tie Breaker');
    expect(side[19].name).toBe('Double');
    expect(side[20].name).toBe('Flip2&4');
    expect(side[21].name).toBe('Flip 3&6');
    expect(side[22].name).toBe('1±2');
    expect(side[22].type).toBe(0x16);
    expect(side[22].negateModifier).toBe(true);
    expect(PazaakCards.MAX_CARDS).toBe(23);
  });

  it('±1/±2 CHANGE+FLIP deltas', () => {
    const table = emptyTable();
    const card = side[PazaakCards.PLUS_MINUS_1_OR_2];
    expect(resolveSideCardDelta(card, PazaakCards.PLUS_MINUS_1_OR_2, false, false, table)).toBe(1);
    expect(resolveSideCardDelta(card, PazaakCards.PLUS_MINUS_1_OR_2, true, true, table)).toBe(-2);
    expect(sideCardDisplayLabel(card, PazaakCards.PLUS_MINUS_1_OR_2, false, true)).toBe('+2');
  });

  it('Tie Breaker ±1T', () => {
    const table = emptyTable();
    const card = side[PazaakCards.TIE_BREAKER];
    expect(resolveSideCardDelta(card, PazaakCards.TIE_BREAKER, false, false, table)).toBe(1);
    expect(resolveSideCardDelta(card, PazaakCards.TIE_BREAKER, true, false, table)).toBe(-1);
    expect(sideCardDisplayLabel(card, PazaakCards.TIE_BREAKER, true, false)).toBe('-1T');
  });

  it('Double copies last played value', () => {
    const table = emptyTable();
    table.cardArea.set(0, {
      name: 'x', type: 0, modifier: [5], modifierLabel: '+5',
      reversible: false, negateModifier: false, textures: [], playedValue: 5,
    });
    const card = side[PazaakCards.DOUBLE];
    expect(resolveSideCardDelta(card, PazaakCards.DOUBLE, false, false, table)).toBe(5);
  });

  it('Flip 2&4 negates only positive 2s and 4s on the playing side', () => {
    const own = emptyTable();
    const other = emptyTable();
    const card = (v: number) => ({
      name: `${v}`, type: 0, modifier: [v], modifierLabel: `${v}`,
      reversible: false, negateModifier: false, textures: [] as string[], playedValue: v,
    });
    own.cardArea.set(0, card(2));
    own.cardArea.set(1, card(4));
    own.cardArea.set(2, card(-2));
    own.cardArea.set(3, card(6));
    own.points = 10;
    other.cardArea.set(0, card(4));
    other.points = 4;

    expect(previewBoardFlip(own, [2, 4])).toBe(-2);
    applyBoardFlip(own, [2, 4]);
    expect(own.cardArea.get(0)!.playedValue).toBe(-2);
    expect(own.cardArea.get(1)!.playedValue).toBe(-4);
    expect(own.cardArea.get(2)!.playedValue).toBe(-2);
    expect(own.cardArea.get(3)!.playedValue).toBe(6);
    expect(own.points).toBe(-2);
    expect(other.cardArea.get(0)!.playedValue).toBe(4);
    expect(other.points).toBe(4);
  });
});

describe('pazaakdecks.2da entries', () => {
  it('parses plus, minus and plus/minus cards', () => {
    expect(PazaakDeck.ModifierToCardIndex('+1')).toBe(PazaakCards.PLUS_1);
    expect(PazaakDeck.ModifierToCardIndex('+6')).toBe(PazaakCards.PLUS_6);
    expect(PazaakDeck.ModifierToCardIndex('-3')).toBe(PazaakCards.MINUS_3);
    expect(PazaakDeck.ModifierToCardIndex('*1')).toBe(PazaakCards.PLUS_MINUS_1);
    expect(PazaakDeck.ModifierToCardIndex('*6')).toBe(PazaakCards.PLUS_MINUS_6);
    expect(PazaakDeck.ModifierToCardIndex('+-4')).toBe(PazaakCards.PLUS_MINUS_4);
  });

  it('parses TSL gold cards', () => {
    expect(PazaakDeck.ModifierToCardIndex('$$')).toBe(PazaakCards.DOUBLE);
    expect(PazaakDeck.ModifierToCardIndex('F1')).toBe(PazaakCards.FLIP_2_AND_4);
    expect(PazaakDeck.ModifierToCardIndex('F2')).toBe(PazaakCards.FLIP_3_AND_6);
    expect(PazaakDeck.ModifierToCardIndex('TT')).toBe(PazaakCards.TIE_BREAKER);
    expect(PazaakDeck.ModifierToCardIndex('vv')).toBe(PazaakCards.PLUS_MINUS_1_OR_2);
  });

  it('rejects empty or malformed entries', () => {
    expect(PazaakDeck.ModifierToCardIndex('')).toBe(PazaakCards.INVALID);
    expect(PazaakDeck.ModifierToCardIndex('+9')).toBe(PazaakCards.INVALID);
    expect(PazaakDeck.ModifierToCardIndex('x1')).toBe(PazaakCards.INVALID);
  });
});
