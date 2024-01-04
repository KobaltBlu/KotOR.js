/**
 * CreatureType enum.
 * 
 * the thing after CREATURE_TYPE_ should refer to the
 * actual "subtype" in the lists given above.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CreatureType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum CreatureType {
  RACIAL_TYPE     = 0,
  PLAYER_CHAR     = 1,
  CLASS           = 2,
  REPUTATION      = 3,
  IS_ALIVE        = 4,
  HAS_SPELL_EFFECT = 5,
  DOES_NOT_HAVE_SPELL_EFFECT = 6,
  PERCEPTION                = 7,
}
//const CREATURE_TYPE_ALIGNMENT       = 2;
