import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPCostTable {
  id: number;
  name: number = -1;
  label: string = '';
  clientload: boolean;

  static From2DA(row: any = {}){
    const propsDef = new SWIPCostTable();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('clientload'))
      propsDef.clientload = TwoDAObject.normalizeValue(row.clientload, 'boolean', false) as boolean;

    return propsDef;
  }

}