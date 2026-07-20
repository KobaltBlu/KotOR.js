/**
 * Retail CSWTrackFollower sound slots (Engine=0, Death=1).
 * Layout @ +0x188: volume, +0x18c: frequency, +0x190: frequencyIsRandom (stride 0xc).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MGTrackFollowerSounds.ts
 */

export const MG_SOUND_ENGINE = 0;
export const MG_SOUND_DEATH = 1;
export const MG_SOUND_SLOT_COUNT = 2;

export interface IMGTrackFollowerSoundSlot {
  /** Retail +0x188 — Miles volume byte when applied to engine source. */
  volume: number;
  /** Retail +0x18c. */
  frequency: number;
  /** Retail +0x190. */
  frequencyIsRandom: number;
}

function emptySlot(): IMGTrackFollowerSoundSlot {
  return { volume: 0, frequency: 0, frequencyIsRandom: 0 };
}

/**
 * Shared state for SWMG_Get/SetSound* on track followers (player + enemies).
 */
export class MGTrackFollowerSounds {
  slots: IMGTrackFollowerSoundSlot[] = [emptySlot(), emptySlot()];
  engineResRef: string = '';
  deathResRef: string = '';

  /** Optional hook when engine (slot 0) volume changes — retail SetVolume on Miles source. */
  onEngineVolumeChanged?: (volume: number) => void;

  loadFromSoundsStruct(soundsNode: { hasField: (n: string) => boolean; getFieldByLabel: (n: string) => { getValue: () => any } } | undefined){
    if(!soundsNode){ return; }
    if(soundsNode.hasField('Death')){
      this.deathResRef = soundsNode.getFieldByLabel('Death').getValue() || '';
    }
    if(soundsNode.hasField('Engine')){
      this.engineResRef = soundsNode.getFieldByLabel('Engine').getValue() || '';
    }
  }

  private validIndex(index: number): boolean {
    return index >= 0 && index < MG_SOUND_SLOT_COUNT;
  }

  getSoundFrequency(index: number): number {
    if(!this.validIndex(index)){ return 0; }
    return this.slots[index].frequency | 0;
  }

  setSoundFrequency(index: number, frequency: number){
    if(!this.validIndex(index)){ return; }
    this.slots[index].frequency = frequency | 0;
  }

  getSoundFrequencyIsRandom(index: number): number {
    if(!this.validIndex(index)){ return 0; }
    return this.slots[index].frequencyIsRandom | 0;
  }

  setSoundFrequencyIsRandom(index: number, isRandom: number){
    if(!this.validIndex(index)){ return; }
    this.slots[index].frequencyIsRandom = isRandom | 0;
  }

  getSoundVolume(index: number): number {
    if(!this.validIndex(index)){ return 0; }
    return this.slots[index].volume | 0;
  }

  setSoundVolume(index: number, volume: number){
    if(!this.validIndex(index)){ return; }
    const v = volume >>> 0;
    this.slots[index].volume = v;
    // Retail SetSoundVolume: only slot 0 (engine) pushes to CExoSoundSource::SetVolume.
    if(index === MG_SOUND_ENGINE && this.onEngineVolumeChanged){
      this.onEngineVolumeChanged(v & 0xff);
    }
  }
}
