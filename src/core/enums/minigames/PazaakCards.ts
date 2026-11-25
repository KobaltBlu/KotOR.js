/**
 * Pazaak Cards enum.
 *
 * Indices 18-22 are the TSL-only gold cards.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file PazaakCards.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export enum PazaakCards {
  INVALID = -1,
  PLUS_1 = 0,
  PLUS_2 = 1,
  PLUS_3 = 2,
  PLUS_4 = 3,
  PLUS_5 = 4,
  PLUS_6 = 5,
  MINUS_1 = 6,
  MINUS_2 = 7,
  MINUS_3 = 8,
  MINUS_4 = 9,
  MINUS_5 = 10,
  MINUS_6 = 11,
  PLUS_MINUS_1 = 12,
  PLUS_MINUS_2 = 13,
  PLUS_MINUS_3 = 14,
  PLUS_MINUS_4 = 15,
  PLUS_MINUS_5 = 16,
  PLUS_MINUS_6 = 17,
  /** TSL gold card */
  TIE_BREAKER = 18,
  /** TSL gold card */
  DOUBLE = 19,
  /** TSL gold card */
  FLIP_2_AND_4 = 20,
  /** TSL gold card */
  FLIP_3_AND_6 = 21,
  /**
   * TSL gold card.
   * FLIP toggles sign; CHANGE (swapValueCards) toggles magnitude 1↔2.
   */
  PLUS_MINUS_1_OR_2 = 22,
  /** Exclusive upper bound for side-deck inventory indices (0.. MAX_CARDS-1). */
  MAX_CARDS = 23,
  MAIN_CARD_1 = 101,
  MAIN_CARD_2 = 102,
  MAIN_CARD_3 = 103,
  MAIN_CARD_4 = 104,
  MAIN_CARD_5 = 105,
  MAIN_CARD_6 = 106,
  MAIN_CARD_7 = 107,
  MAIN_CARD_8 = 108,
  MAIN_CARD_9 = 109,
  MAIN_CARD_10 = 110
};
