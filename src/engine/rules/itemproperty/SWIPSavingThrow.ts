import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPSavingThrow {
  id: number;
  name: number = -1;
  namestring: string = '';

  static From2DA(row: any = {}){
    const propsDef = new SWIPSavingThrow();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('namestring'))
      propsDef.namestring = TwoDAObject.normalizeValue(row.namestring, 'string', '') as string;

    return propsDef;
  }

}