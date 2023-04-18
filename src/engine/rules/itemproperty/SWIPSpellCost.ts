import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPSpellCost {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number = -1;
  spellindex: number = -1;

  static From2DA(row: any = {}){
    const propsDef = new SWIPSpellCost();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', -1) as number;
  
    if(row.hasOwnProperty('spellindex'))
      propsDef.spellindex = TwoDAObject.normalizeValue(row.spellindex, 'number', -1) as number;

    return propsDef;
  }

}