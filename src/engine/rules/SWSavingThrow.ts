import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { TwoDAObject } from "@/resource/TwoDAObject";

/**
 * class SWSavingThrow
 * - used to get saving throw for a class per level
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWSavingThrow.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWSavingThrow {

  index: number = 0;
  level: number = 0;
  fortsave: number = 0;
  willsave: number = 0;
  refsave: number = 0;

  constructor(index: number = 0){
    // this.index = index;
  }

  apply2DA(row: any){
    this.index = TwoDAObject.normalizeValue(row.__index, 'number', 0);
    this.level = TwoDAObject.normalizeValue(row.level, 'number', 0);
    this.fortsave = TwoDAObject.normalizeValue(row.fortsave, 'number', 0);
    this.willsave = TwoDAObject.normalizeValue(row.willsave, 'number', 0);
    this.refsave = TwoDAObject.normalizeValue(row.refsave, 'number', 0);
  }
  
  static From2DA(row: any){
    const st = new SWSavingThrow();
    st.apply2DA(row);
    return st;
  }

}

