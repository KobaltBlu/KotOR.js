import { TwoDAObject } from "../../resource/TwoDAObject";

interface IFeatGainClass {
  index: number;
  label: number;
  points: number[];
  bonuses: number[];
}

/**
 * class SWFeatGain
 * - used to get feat gain points for a class per level
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWFeatGain.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWFeatGain {

  index: number = 0;
  label: number = 0;

  classMap: Map<string, IFeatGainClass> = new Map();

  /**
   * **Unused** by the odyssey engine
   * https://lucasforumsarchive.com/thread/121440-more-feats#post-11
   * @param classCode
   * @returns number[]
   * @deprecated
   */
  getBonus(classCode: string): number[] {
    return this.classMap.get(classCode.toLowerCase())?.bonuses || [];
  }

  /**
   * Get the number of feat points gained for a class per level
   * @param classCode
   * @returns number[]
   */
  getRegular(classCode: string): number[] {
    return this.classMap.get(classCode.toLowerCase())?.points || [];
  }

  apply2DA(table: TwoDAObject){

    /**
     * Get class columns from the 2DA row
     * ex: jcn_reg, jcn_bon, etc...
     */
    for(let i = 0; i < table.RowCount; i++){
      const row = table.rows[i];
      const columns = Object.keys(row);

      const index = (row.hasOwnProperty('__index')) ? TwoDAObject.normalizeValue(row.__index, 'number', 0) : 0;
      const label = (row.hasOwnProperty('label')) ? TwoDAObject.normalizeValue(row.label, 'number', 0) : 0;

      
      for(let j = 0; j < columns.length; j++){
        const col = columns[j];
        const colNormalized = col.toLowerCase();

        if(!colNormalized.includes('_'))
          continue;

        const classCode = colNormalized.split('_')[0];
        const pointType = colNormalized.split('_')[1];

        const isNew = !this.classMap.has(classCode);
        const classData = this.classMap.get(classCode) || {
          index: index,
          label: label,
          points: [] as number[],
          bonuses: [] as number[]
        };

        const value = TwoDAObject.normalizeValue(row[col], 'number', 0);

        if(pointType === 'reg'){
          classData.points.push(value);
        } else if(pointType === 'bon'){
          classData.bonuses.push(value);
        }

        if(isNew)
          this.classMap.set(classCode, classData);
      } 
    }
  }

  static From2DA(table: TwoDAObject){
    const featGain = new SWFeatGain();
    featGain.apply2DA(table);
    return featGain;
  }
}
