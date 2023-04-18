import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPChargeCost {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number;
  potioncost: boolean = false;
  wandcost: boolean = false;

  static From2DA(row: any = {}){
    const propsDef = new SWIPChargeCost();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;
  
    if(row.hasOwnProperty('potioncost'))
      propsDef.potioncost = TwoDAObject.normalizeValue(row.potioncost, 'boolean', false) as boolean;
    
    if(row.hasOwnProperty('wandcost'))
      propsDef.wandcost = TwoDAObject.normalizeValue(row.wandcost, 'boolean', false) as boolean;

    return propsDef;
  }

}