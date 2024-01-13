import { TwoDAObject } from "../../resource/TwoDAObject";

/**
 * SWEffectIcon class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWEffectIcon.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWEffectIcon {

  id: number = -1;
  label: string = '';
  iconresref: string = '';
  good: number = -1;
  description: number = -1;
  priority: number = 0;

  static From2DA(row: any = {}){
    const effectIcon = new SWEffectIcon();

    effectIcon.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      effectIcon.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('iconresref'))
      effectIcon.iconresref = TwoDAObject.normalizeValue(row.iconresref, 'string', '') as string;
    
    if(row.hasOwnProperty('good'))
      effectIcon.good = TwoDAObject.normalizeValue(row.good, 'number', 0) as number;
    
    if(row.hasOwnProperty('description'))
      effectIcon.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;
    
    if(row.hasOwnProperty('priority'))
      effectIcon.priority = TwoDAObject.normalizeValue(row.priority, 'number', 0) as number;

    return effectIcon;
  }

}