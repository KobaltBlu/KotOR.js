import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPAmmoType {
  id: number;
  name: number = -1;
  label: string = '';
  ammotype: number;

  static From2DA(row: any = {}){
    const propsDef = new SWIPAmmoType();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('ammotype'))
      propsDef.ammotype = TwoDAObject.normalizeValue(row.ammotype, 'number', 0) as number;

    return propsDef;
  }

}