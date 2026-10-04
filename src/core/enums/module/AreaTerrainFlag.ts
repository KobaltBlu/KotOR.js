/**
 * AreaTerrainFlag enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AreaTerrainFlag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AreaTerrainFlag {
  INTERIOR = 0x0001,    // interior (exterior if unset)
  UNDERGROUND = 0x0002, // underground (aboveground if unset)
  NATURAL = 0x0004,     // (urban if unset)
}