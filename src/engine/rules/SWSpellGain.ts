import { TwoDAObject } from "@/resource/TwoDAObject";

interface ISpellGainClass {
  index: number;
  label: number;
  points: number[];
}

/**
 * class SWSpellGain
 * - used to get spell gain points for a class per level
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWSpellGain.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWSpellGain {

  classMap: Map<string, ISpellGainClass> = new Map();

  /**
   * Get the number of spell points gained for a class per level
   * @param classCode 
   * @returns number[]
   */
  getSpellGain(classCode: string){
    return this.classMap.get(classCode.toLowerCase())?.points || [];
  }
  
  apply2DA(table: TwoDAObject){
    /**
     * Get class columns from the 2DA file
     * ex: jcn, jsn, jgd, sas, sld, sma, jwa, jma, jwm
     */
    for(let i = 0; i < table.RowCount; i++){
      const row = table.rows[i];
      const columns = Object.keys(row);

      const index = (row.hasOwnProperty('__index')) ? TwoDAObject.normalizeValue(row.__index, 'number', 0) : 0;
      const label = (row.hasOwnProperty('label')) ? TwoDAObject.normalizeValue(row.label, 'number', 0) : 0;
      
      for(let j = 0; j < columns.length; j++){
        const col = columns[j];
        const colNormalized = col.toLowerCase();

        if(colNormalized === '__rowlabel' || colNormalized === 'label')
          continue;
        
        const value = TwoDAObject.normalizeValue(row[col], 'number', 0);

        const isNew = !this.classMap.has(colNormalized);
        const data = this.classMap.get(colNormalized) || {
          index: index,
          label: label,
          points: [] as number[]
        };

        data.points.push(value);

        if(isNew)
        this.classMap.set(colNormalized, data);
      }
    }
  }

  static From2DA(table: TwoDAObject){
    const spellGain = new SWSpellGain();
    spellGain.apply2DA(table);
    return spellGain;
  }
}
