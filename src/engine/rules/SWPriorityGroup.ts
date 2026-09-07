import { TwoDAObject } from "@/resource/TwoDAObject";

/**
 * SWPriorityGroup class.
 *
 * matches engine behavior sound priority group (0x18 bytes) loaded by
 * LoadPriorityGroups (Linux TSL).
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

  /**
   * Matches up to hardcoded integer constants in sound engine source code.
   * Lower value = higher importance (used by GetFree2DVoice / GetFree3DVoice).
   * Do not add, remove, or reorder rows in prioritygroups.2da.
   */
  priority: number = 0;

  /** Volume from 0 to 127 (default 0x7f). */
  volume: number = 127;

  /**
   * Maximum concurrent voices for this group (byte in).
   * **** keeps ctor default 255.
   */
  maxplaying: number = 255;

  /**
   * Interrupt field (sound priority group).
   * When at maxplaying during Play:
   * - interrupt == 0 → deny the new play
   * - interrupt != 0 → InterruptPlayingSound (preempt one same-group voice)
   * **** keeps ctor default 1.
   */
  interrupt: number = 1;

  /** When stopping the sound, number of milliseconds of fadeout */
  fadetime: number = 0;

  /** For placed Sound objects instances, the MaxDistance overrides this 2da value */
  maxvolumedist: number = 20;

  /** For placed Sound objects instances, the MinDistance overrides this 2da value */
  minvolumedist: number = 10;

  /** Pitch variance in octaves when playing sounds of this priority. Range is 0 to 1.0. For placed Sound objects instances, the PitchVariance overrides this 2da value. */
  playbackvariance: number = 0;

  /** True when maxplaying is the blank/default cap (255). */
  isUnlimited(): boolean {
    return this.maxplaying >= 255;
  }

  /**
   * True when a new play at maxplaying may preempt a same-group voice
   * (InterruptPlayingSound path).
   */
  canPreemptSameGroup(): boolean {
    return (this.interrupt | 0) !== 0;
  }

  /** @deprecated Use canPreemptSameGroup — name matched inverted 2DA comment. */
  canInterrupt(): boolean {
    return this.canPreemptSameGroup();
  }

  /** Fadeout duration in seconds for forced stops. */
  getFadeTimeSeconds(): number {
    return Math.max(0, (this.fadetime || 0) / 1000);
  }

  static isBlank2DACell(value: any): boolean {
    return value === undefined || value === null || value === '****' || value === '';
  }

  static readNumber(row: any, keys: string[], defaultValue: number): number {
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      if(!row.hasOwnProperty(key)){
        continue;
      }
      const raw = row[key];
      if(SWPriorityGroup.isBlank2DACell(raw)){
        return defaultValue;
      }
      return TwoDAObject.normalizeValue(raw, 'number', defaultValue) as number;
    }
    return defaultValue;
  }

  static From2DA(row: any = {}){
    const group = new SWPriorityGroup();

    group.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      group.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;

    if(row.hasOwnProperty('priority'))
      group.priority = TwoDAObject.normalizeValue(row.priority, 'number', 0) as number;

    // K1: volume. K2: volume_pc / volume_xbox (PC preferred). blank → 127.
    group.volume = SWPriorityGroup.readNumber(row, ['volume', 'volume_pc'], 127);

    // **** → ctor default 255.
    if(row.hasOwnProperty('maxplaying') && SWPriorityGroup.isBlank2DACell(row.maxplaying)){
      group.maxplaying = 255;
    }else{
      group.maxplaying = SWPriorityGroup.readNumber(row, ['maxplaying'], 255);
    }

    // **** → ctor default 1 (can preempt same group).
    if(row.hasOwnProperty('interrupt') && SWPriorityGroup.isBlank2DACell(row.interrupt)){
      group.interrupt = 1;
    }else{
      group.interrupt = SWPriorityGroup.readNumber(row, ['interrupt'], 1);
    }

    if(row.hasOwnProperty('fadetime'))
      group.fadetime = SWPriorityGroup.isBlank2DACell(row.fadetime)
        ? 0
        : TwoDAObject.normalizeValue(row.fadetime, 'number', 0) as number;

    // K1: maxvolumedist/minvolumedist. K2: *_pc preferred. blanks → 20 / 10.
    group.maxvolumedist = SWPriorityGroup.readNumber(row, ['maxvolumedist', 'maxvolumedist_pc'], 20);
    group.minvolumedist = SWPriorityGroup.readNumber(row, ['minvolumedist', 'minvolumedist_pc'], 10);

    if(row.hasOwnProperty('playbackvariance'))
      group.playbackvariance = SWPriorityGroup.isBlank2DACell(row.playbackvariance)
        ? 0
        : TwoDAObject.normalizeValue(row.playbackvariance, 'number', 0) as number;

    return group;
  }
}
