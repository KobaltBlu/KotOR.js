/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { PazaakCards } from '@core/enums/minigames/PazaakCards';
import { PazaakTurnState } from '@core/enums/minigames/PazaakTurnState';
import { PazaakConfig as PazaakConfig_TSL } from '@engine/games/tsl/minigames/mg-pazaak-config';
import type { IPazaakTable } from '@core/interface/minigames/IPazaakTable';
import {
  applyBoardFlipSpecial,
  resolveSideCardDelta,
  sideCardDisplayLabel,
} from '@engine/minigames/pazaak-side-card';

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

describe('TSL Pazaak gold specials (SetCard)', () => {
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

  it('Flip 2&4 negates matching board values on both tables', () => {
    const a = emptyTable();
    const b = emptyTable();
    a.cardArea.set(0, {
      name: '2', type: 0, modifier: [2], modifierLabel: '+2',
      reversible: false, negateModifier: false, textures: [], playedValue: 2,
    });
    b.cardArea.set(0, {
      name: '4', type: 0, modifier: [4], modifierLabel: '+4',
      reversible: false, negateModifier: false, textures: [], playedValue: 4,
    });
    a.points = 12;
    b.points = 14;
    applyBoardFlipSpecial([a, b], [2, 4]);
    expect(a.cardArea.get(0)!.playedValue).toBe(-2);
    expect(b.cardArea.get(0)!.playedValue).toBe(-4);
    expect(a.points).toBe(8);
    expect(b.points).toBe(6);
  });
});
