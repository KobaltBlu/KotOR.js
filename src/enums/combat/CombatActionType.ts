/**
 * CombatActionType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CombatActionType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum CombatActionType {
  ATTACK = 1,
  ITEM_EQUIP = 6,
  ITEM_UNEQUIP = 7,
  CAST_SPELL = 9,
  ITEM_CAST_SPELL = 10,
  ATTACK_USE_FEAT = 11,
  ATTACK_CUTSCENE_MOVE = 12,
  INVALID = -1,
}