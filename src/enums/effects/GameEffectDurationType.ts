/**
 * GameEffectDurationType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEffectDurationType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GameEffectDurationType {
  INSTANT   = 0x00,
  TEMPORARY = 0x01,
  PERMANENT = 0x02,
  EQUIPPED  = 0x03,
  INNATE    = 0x04,

  MASK      = 0x07,
};