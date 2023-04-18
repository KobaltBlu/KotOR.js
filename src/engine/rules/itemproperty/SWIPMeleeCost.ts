import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPMeleeCost {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number;
  value: number;

  static From2DA(row: any = {}){
    const propsDef = new SWIPMeleeCost();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;
  
    if(row.hasOwnProperty('value'))
      propsDef.value = TwoDAObject.normalizeValue(row.value, 'number', 0) as number;

    return propsDef;
  }

}