/**
 * Pazaak Cards enum.
 *
 * TSL gold side indices match SetCard:
 * 0x12 Tie Breaker, 0x13 Double, 0x14 Flip2&4, 0x15 Flip3&6, 0x16 ±1/±2 (CHANGE).
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
  /** TSL gold — SetCard case 0x12 */
  TIE_BREAKER = 18,
  /** TSL gold — SetCard case 0x13 */
  DOUBLE = 19,
  /** TSL gold — SetCard case 0x14 */
  FLIP_2_AND_4 = 20,
  /** TSL gold — SetCard case 0x15 */
  FLIP_3_AND_6 = 21,
  /**
   * TSL gold — SetCard case 0x16 / HandleChangeHandCard type 0x16.
   * FLIP toggles sign; CHANGE (swapValueCards) toggles magnitude 1↔2.
   */
  PLUS_MINUS_1_OR_2 = 22,
  /** Exclusive upper bound for side-deck inventory indices (0 .. MAX_CARDS-1). */
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
