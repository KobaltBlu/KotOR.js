/**
 * MDL lightpriority values. Retail lightcmp prefers lower numbers
 * first, so LOWEST (1) sorts before HIGHEST (5).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file LightPriority.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum LightPriority {
  LOWEST = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  HIGHEST = 5,
};