import { TwoDAObject } from "@/resource/TwoDAObject";
import type { ITwoDARowData } from "@/resource/TwoDAObject";

/**
 * SWPriorityGroup class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWPriorityGroup.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWPriorityGroup {

  /** Row index in the prioritygroups.2da table */
  id: number = -1;
  
  /** Programmer label for this priority group */
  label: string = '';
  
  /** Matches up to hardcoded integer constants in sound engine source code. This means that you may not add, remove, or modify the order of rows in prioritygroups.2da. */
  priority: number = -1;
  
  /** Volume from 0 to 127 */
  volume: number = 0;
  
  /** Maximum number of sounds of this priority that may play simultaneously */
  maxplaying: number = -1;
  
  /** 0 if sound may be interrupted, 1 if sound may not be interrupted */
  interrpt: number = 0;
  
  /** When stopping the sound, number of milliseconds of fadeout */
  fadetime: number = 0;
  
  /** For placed Sound objects instances, the MaxDistance overrides this 2da value */
  maxvolumedist: number = 1;
  
  /** For placed Sound objects instances, the MinDistance overrides this 2da value */
  minvolumedist: number = 0;
  
  /** Pitch variance in octaves when playing sounds of this priority. Range is 0 to 1.0. For placed Sound objects instances, the PitchVariance overrides this 2da value. */
  playbackvariance: number = 0;

  static From2DA(row: any = {}){
    const group = new SWPriorityGroup();

    group.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      group.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('priority'))
      group.priority = TwoDAObject.normalizeValue(row.priority, 'number', 0) as number;
    
    if(row.hasOwnProperty('volume'))
      group.volume = TwoDAObject.normalizeValue(row.volume, 'number', 0) as number;
    
    if(row.hasOwnProperty('maxplaying'))
      group.maxplaying = TwoDAObject.normalizeValue(row.maxplaying, 'number', 0) as number;
    
    if(row.hasOwnProperty('interrpt'))
      group.interrpt = TwoDAObject.normalizeValue(row.interrpt, 'number', 0) as number;
    
    if(row.hasOwnProperty('fadetime'))
      group.fadetime = TwoDAObject.normalizeValue(row.fadetime, 'number', 0) as number;
    
    if(row.hasOwnProperty('maxvolumedist'))
      group.maxvolumedist = TwoDAObject.normalizeValue(row.maxvolumedist, 'number', 1) as number;

    if(row.hasOwnProperty('minvolumedist'))
      group.minvolumedist = TwoDAObject.normalizeValue(row.minvolumedist, 'number', 0) as number;

    if(row.hasOwnProperty('playbackvariance'))
      group.playbackvariance = TwoDAObject.normalizeValue(row.playbackvariance, 'number', 0) as number;

    return group;
  }
}