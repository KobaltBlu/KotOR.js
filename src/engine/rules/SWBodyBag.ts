import { TwoDAObject } from "@/resource/TwoDAObject";
import type { ITwoDARowData } from "@/resource/TwoDAObject";

/**
 * SWBodyBag class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWBodyBag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWBodyBag {

  id: number = -1;
  label: string = '';
  name: number = -1;
  appearance: number = -1;
  corpse: number = -1;

  static From2DA(row: ITwoDARowData | Record<string, string | number> = {}){
    const bodyBag = new SWBodyBag();

    bodyBag.id = parseInt(String(row.__index ?? -1), 10);

    if(Object.hasOwn(row,'label'))
      bodyBag.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;

    if(Object.hasOwn(row,'iconresref'))
      bodyBag.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    
    if(Object.hasOwn(row,'appearance'))
      bodyBag.appearance = TwoDAObject.normalizeValue(row.appearance, 'number', 0) as number;
    
    if(Object.hasOwn(row,'description'))
      bodyBag.corpse = TwoDAObject.normalizeValue(row.corpse, 'number', -1) as number;

    return bodyBag;
  }

}