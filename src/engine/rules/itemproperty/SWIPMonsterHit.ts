import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPMonsterHit {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number;
  param1resref: number;
  param2resref: number;

  static From2DA(row: any = {}){
    const propsDef = new SWIPMonsterHit();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', -1) as number;
  
    if(row.hasOwnProperty('param1resref'))
      propsDef.param1resref = TwoDAObject.normalizeValue(row.param1resref, 'number', -1) as number;
  
    if(row.hasOwnProperty('param2resref'))
      propsDef.param2resref = TwoDAObject.normalizeValue(row.param2resref, 'number', -1) as number;

    return propsDef;
  }

}