import { TLKManager } from "@/managers/TLKManager";
import { TwoDAObject } from "@/resource/TwoDAObject";

/**
 * SWItemPropsDef class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWItemPropsDef.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWItemPropsDef {
  id: number;
  name: number = -1;
  label: string = '';
  subtyperesref: string = '';
  cost: number = 0;
  costtableresref: number = 0;
  param1resref: number = -1;
  gamestrref: number = -1;
  description: number = -1;

  getName(){
    return TLKManager.GetStringById(this.name > -1 ? this.name : 0).Value;
  }

  hasSubType(): boolean {
    return this.subtyperesref != '';
  }

  static From2DA(row: import("@/resource/TwoDAObject").ITwoDARowData | Record<string, string | number> = {}): SWItemPropsDef {
    const propsDef = new SWItemPropsDef();

    propsDef.id = parseInt(row.__index);

    if(Object.hasOwn(row,'name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    
    if(Object.hasOwn(row,'label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(Object.hasOwn(row,'subtyperesref'))
      propsDef.subtyperesref = TwoDAObject.normalizeValue(row.subtyperesref, 'string', '') as string;
    
    if(Object.hasOwn(row,'cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', -1) as number;
    
    if(Object.hasOwn(row,'costtableresref'))
      propsDef.costtableresref = TwoDAObject.normalizeValue(row.costtableresref, 'number', -1) as number;
    
    if(Object.hasOwn(row,'param1resref'))
      propsDef.param1resref = TwoDAObject.normalizeValue(row.param1resref, 'number', -1) as number;
    
    if(Object.hasOwn(row,'gamestrref'))
      propsDef.gamestrref = TwoDAObject.normalizeValue(row.gamestrref, 'number', -1) as number;
    
    if(Object.hasOwn(row,'description'))
      propsDef.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;

    return propsDef;
  }

}