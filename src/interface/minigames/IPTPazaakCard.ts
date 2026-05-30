import { PazaakCards } from "@/enums/minigames/PazaakCards";

/**
 * Pazaak Cards interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IPTPazaakCards.ts
 */
export interface IPTPazaakCard {
  card: PazaakCards;
  count: number;
}