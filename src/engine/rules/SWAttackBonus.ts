import { TwoDAObject, type ITwoDARowData } from "../../resource/TwoDAObject";

/**
 * class SWAttackBonus
 * - used to get attack bonus for a class per level
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWAttackBonus.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWAttackBonus {
  index: number = 0;
  bab: number = 0;

  constructor(index: number = 0){
    this.index = index;
  }

  apply2DA(row: ITwoDARowData){
    this.index = TwoDAObject.normalizeValue(row.__index, 'number', 0);
    this.bab = TwoDAObject.normalizeValue(row.bab, 'number', 1);
  }

  static From2DA(row: ITwoDARowData){
    const ab = new SWAttackBonus();
    ab.apply2DA(row);
    return ab;
  }
}

