/**
 * NWModuleObjectType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWModuleObjectType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum NWModuleObjectType {
  CREATURE         = 1,
  ITEM             = 2,
  TRIGGER          = 4,
  DOOR             = 8,
  AOE              = 16,
  WAYPOINT         = 32,
  PLACEABLE        = 64,
  STORE            = 128,
  ENCOUNTER        = 256,
  SOUND            = 512,
  ALL              = 32767,
}
