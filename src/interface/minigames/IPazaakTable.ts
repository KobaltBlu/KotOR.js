import { PazaakCards } from "../../enums/minigames/PazaakCards";
import { PazaakHandSlots } from "../../enums/minigames/PazaakHandSlots";
import { PazaakSideDeckSlots } from "../../enums/minigames/PazaakSideDeckSlots";
import { PazaakTableSlots } from "../../enums/minigames/PazaakTableSlots";
import { PazaakTurnState } from "../../enums/minigames/PazaakTurnState";
import { IPazaakCard } from "./IPazaakCard";

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
}
