import { TwoDAObject } from "@/resource/TwoDAObject";

/**
 * SWInfluence — TSL influence.2da row (Tag / BaseInfluence).
 *
 * @file SWInfluence.ts
 */
export class SWInfluence {

  id: number = -1;
  tag: string = '';
  baseInfluence: number = 50;

  static From2DA(row: any = {}){
    const entry = new SWInfluence();
    entry.id = parseInt(row.__index);

    if(row.hasOwnProperty('tag'))
      entry.tag = TwoDAObject.normalizeValue(row.tag, 'string', '') as string;
    else if(row.hasOwnProperty('Tag'))
      entry.tag = TwoDAObject.normalizeValue(row.Tag, 'string', '') as string;

    if(row.hasOwnProperty('baseinfluence'))
      entry.baseInfluence = TwoDAObject.normalizeValue(row.baseinfluence, 'number', 50) as number;
    else if(row.hasOwnProperty('BaseInfluence'))
      entry.baseInfluence = TwoDAObject.normalizeValue(row.BaseInfluence, 'number', 50) as number;

    return entry;
  }

}
