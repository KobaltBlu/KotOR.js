import { PazaakCards } from "../../enums/minigames/PazaakCards";

export interface IPazaakTableSlot {
  card: PazaakCards;
  flipped: boolean;
}
