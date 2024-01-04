/**
 * OdysseyModelModelFlag enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelModelFlag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum OdysseyModelModelFlag {
  FlagEffect    = 0x01,
  FlagTile      = 0x02,
  FlagCharacter = 0x04,
  FlagDoor      = 0x08,
  FlagPlaceable = 0x20,
  FlagOther     = 0x00,
}