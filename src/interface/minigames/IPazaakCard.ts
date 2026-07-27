export interface IPazaakCard {
  name: string;
  type: number;
  modifier: number[];
  modifierLabel: string;
  reversible: boolean;
  /** TSL ±1/±2 (card 0x16): CHANGE cycles magnitude via swapValueCards. */
  negateModifier: boolean;
  textures: string[];
  flipped?: boolean;
  /** Deck index when this instance is placed on the table. */
  cardId?: number;
  /** Effective points contributed when played (after specials). */
  playedValue?: number;
}