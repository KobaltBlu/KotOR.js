/**
 * AILevel enum.
 *
 * Retail CServerAIMaster AI priority levels (SetAILevel / AddObject).
 * Higher levels receive a larger share of the per-frame AIUpdate budget.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AILevel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AILevel {
  /** Not registered with the AI master */
  INVALID = -1,
  /** Background objects (default on construction) */
  VERY_LOW = 0,
  /** Objects in a player-occupied area */
  LOW = 1,
  /** Combat / recently left party */
  NORMAL = 2,
  /** Elevated (script / unused in K1 promotions) */
  HIGH = 3,
  /** Party members and PC */
  VERY_HIGH = 4,
}
