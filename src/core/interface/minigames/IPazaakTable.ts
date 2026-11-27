import { PazaakCards } from "@core/enums/minigames/PazaakCards";
import { PazaakHandSlots } from "@core/enums/minigames/PazaakHandSlots";
import { PazaakSideDeckSlots } from "@core/enums/minigames/PazaakSideDeckSlots";
import { PazaakTableSlots } from "@core/enums/minigames/PazaakTableSlots";
import { PazaakTurnState } from "@core/enums/minigames/PazaakTurnState";
import { IPazaakCard } from "@core/interface/minigames/IPazaakCard";

export interface IPazaakTable {
  /**
   * Points on the table
   */
  points: number;
  /**
   * Win count on the table
   */
  winCount: number;
  /**
   * Turn state
   */
  turnState: PazaakTurnState;
  /**
   * Stand state
   */
  stand: boolean;
  /**
   * Cards on the table
   */
  cardArea: Map<PazaakTableSlots, IPazaakCard>;
  /**
   * Remaining cards in the side deck
   */
  sideDeck: Map<PazaakSideDeckSlots, PazaakCards>;
  /**
   * Whether a hand card has been played this turn
   */
  handCardPlayed: boolean;
  /**
   * Cards in the player's hand
   */
  handCards: Map<PazaakHandSlots, PazaakCards>;
  /**
   * Cards flipped in the player's hand
   */
  flipCards: Map<PazaakHandSlots, boolean>;
  /**
   * Cards with swapped values in the player's hand (TSL Only)
   */
  swapValueCards: Map<PazaakHandSlots, boolean>;
  /**
   * TSL Tie Breaker gold card played this round — wins equal non-bust totals.
   */
  tieBreaker: boolean;
}
