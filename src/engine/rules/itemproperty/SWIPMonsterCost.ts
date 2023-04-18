import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPMonsterCost {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number;
  numdice: number;
  die: number;

  static From2DA(row: any = {}){
    const propsDef = new SWIPMonsterCost();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;
  
    if(row.hasOwnProperty('numdice'))
      propsDef.numdice = TwoDAObject.normalizeValue(row.numdice, 'number', 0) as number;
    
    if(row.hasOwnProperty('die'))
      propsDef.die = TwoDAObject.normalizeValue(row.die, 'number', 0) as number;

    return propsDef;
  }

}