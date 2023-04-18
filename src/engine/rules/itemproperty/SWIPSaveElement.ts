import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPSaveElement {
  id: number;
  name: number = -1;
  namestring: string = '';
  cost: number;

  static From2DA(row: any = {}){
    const propsDef = new SWIPSaveElement();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('namestring'))
      propsDef.namestring = TwoDAObject.normalizeValue(row.namestring, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;

    return propsDef;
  }

}