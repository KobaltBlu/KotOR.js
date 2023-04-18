import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPAmmoCost {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number;
  arrow: string;
  bolt: string;
  bullet: string;

  static From2DA(row: any = {}){
    const propsDef = new SWIPAmmoCost();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;
  
    if(row.hasOwnProperty('arrow'))
      propsDef.arrow = TwoDAObject.normalizeValue(row.arrow, 'string', '') as string;
    
    if(row.hasOwnProperty('bolt'))
      propsDef.bolt = TwoDAObject.normalizeValue(row.bolt, 'string', '') as string;
  
    if(row.hasOwnProperty('bullet'))
      propsDef.bullet = TwoDAObject.normalizeValue(row.bullet, 'string', '') as string;

    return propsDef;
  }

}