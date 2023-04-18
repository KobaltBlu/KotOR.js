import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPSpells {
  id: number;
  name: number = -1;
  label: string = '';
  casterlvl: number;
  innatelvl: number;
  cost: number;
  spellindex: number;
  potionuse: boolean;
  wanduse: boolean;
  generaluse: boolean;
  icon: string;

  static From2DA(row: any = {}){
    const propsDef = new SWIPSpells();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('casterlvl'))
      propsDef.casterlvl = TwoDAObject.normalizeValue(row.casterlvl, 'number', 0) as number;
  
    if(row.hasOwnProperty('innatelvl'))
      propsDef.innatelvl = TwoDAObject.normalizeValue(row.innatelvl, 'number', 0) as number;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;
  
    if(row.hasOwnProperty('spellindex'))
      propsDef.spellindex = TwoDAObject.normalizeValue(row.spellindex, 'number', -1) as number;
    
    if(row.hasOwnProperty('potionuse'))
      propsDef.potionuse = TwoDAObject.normalizeValue(row.potionuse, 'boolean', false) as boolean;
  
    if(row.hasOwnProperty('wanduse'))
      propsDef.wanduse = TwoDAObject.normalizeValue(row.wanduse, 'boolean', false) as boolean;
    
    if(row.hasOwnProperty('generaluse'))
      propsDef.generaluse = TwoDAObject.normalizeValue(row.generaluse, 'boolean', 0) as boolean;
  
    if(row.hasOwnProperty('icon'))
      propsDef.icon = TwoDAObject.normalizeValue(row.icon, 'string', '') as string;

    return propsDef;
  }

}