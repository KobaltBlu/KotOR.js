import { TLKManager } from "../../managers/TLKManager";
import { TwoDAObject } from "../../resource/TwoDAObject";

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
    if(this.name >= 0){
      return TLKManager.GetStringById(this.name).Value;
    }else{
      return TLKManager.GetStringById(0).Value;
    }
  }

  hasSubType(): boolean {
    return this.subtyperesref != '';
  }

  static From2DA(row: any = {}){
    const propsDef = new SWItemPropsDef();

    propsDef.id = parseInt(row.__index);

    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    
    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('subtyperesref'))
      propsDef.subtyperesref = TwoDAObject.normalizeValue(row.subtyperesref, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', -1) as number;
    
    if(row.hasOwnProperty('costtableresref'))
      propsDef.costtableresref = TwoDAObject.normalizeValue(row.costtableresref, 'number', -1) as number;
    
    if(row.hasOwnProperty('param1resref'))
      propsDef.param1resref = TwoDAObject.normalizeValue(row.param1resref, 'number', -1) as number;
    
    if(row.hasOwnProperty('gamestrref'))
      propsDef.gamestrref = TwoDAObject.normalizeValue(row.gamestrref, 'number', -1) as number;
    
    if(row.hasOwnProperty('description'))
      propsDef.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;

    return propsDef;
  }

}