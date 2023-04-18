import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAObject } from "../../../resource/TwoDAObject";

export class SWIPOnHitDuration {
  id: number;
  name: number = -1;
  label: string = '';
  cost: number;
  effectchance: number;
  durationrounds: number;

  static From2DA(row: any = {}){
    const propsDef = new SWIPOnHitDuration();

    propsDef.id = parseInt(row.__index);
    
    if(row.hasOwnProperty('name'))
      propsDef.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('label'))
      propsDef.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('cost'))
      propsDef.cost = TwoDAObject.normalizeValue(row.cost, 'number', 0) as number;
  
    if(row.hasOwnProperty('effectchance'))
      propsDef.effectchance = TwoDAObject.normalizeValue(row.effectchance, 'number', 0) as number;

    if(row.hasOwnProperty('durationrounds'))
      propsDef.durationrounds = TwoDAObject.normalizeValue(row.durationrounds, 'number', 0) as number;

    return propsDef;
  }

}