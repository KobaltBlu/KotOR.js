import { TwoDAObject } from "@/resource/TwoDAObject";

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
  corpse: number = 0;

  static From2DA(row: any = {}){
    const bodyBag = new SWBodyBag();

    bodyBag.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      bodyBag.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;

    if(row.hasOwnProperty('name'))
      bodyBag.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;

    if(row.hasOwnProperty('appearance'))
      bodyBag.appearance = TwoDAObject.normalizeValue(row.appearance, 'number', 0) as number;

    if(row.hasOwnProperty('corpse'))
      bodyBag.corpse = TwoDAObject.normalizeValue(row.corpse, 'number', 0) as number;

    return bodyBag;
  }

}
