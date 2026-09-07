/**
 * engine + death playback.
 * LoadSounds, Go, Stop, OnDeath,
 * SetSoundVolume (engine Miles volume only).
 *
 * @file MGTrackFollowerAudio.ts
 */

import { AudioEmitter } from '@/audio/AudioEmitter';
import { AudioEngine } from '@/audio/AudioEngine';
import { AudioEmitterType } from '@/enums/audio/AudioEmitterType';
import { AudioPriorityGroup } from '@/enums/audio/AudioPriorityGroup';
import {
  MGTrackFollowerSounds,
  MG_SOUND_ENGINE,
} from '@/module/minigame/MGTrackFollowerSounds';

export class MGTrackFollowerAudio {
  private sounds: MGTrackFollowerSounds;
  private isPlayer: boolean;
  private engineEmitter: AudioEmitter | undefined;
  private deathEmitter: AudioEmitter | undefined;
  private going: boolean = false;
  private destroyed: boolean = false;
  private loadPromise: Promise<void> | undefined;

  constructor(sounds: MGTrackFollowerSounds, isPlayer: boolean){
    this.sounds = sounds;
    this.isPlayer = isPlayer;
  }

  /** Priority: player → DEFAULT (0x17), enemy → MINIGAME_ENEMY (0x18). */
  private priorityGroup(): AudioPriorityGroup {
    return this.isPlayer ? AudioPriorityGroup.DEFAULT : AudioPriorityGroup.MINIGAME_ENEMY;
  }

  /**
   * LoadSounds: create looping 3D engine source when Engine resref valid.
   */
  async load(): Promise<void> {
    if(this.destroyed){ return; }
    if(this.loadPromise){ return this.loadPromise; }

    this.loadPromise = this.loadEngineEmitter();
    await this.loadPromise;
    if(this.going && this.engineEmitter && !this.engineEmitter.currentSound){
      this.engineEmitter.start();
    }
  }

  private async loadEngineEmitter(): Promise<void> {
    const engineRef = (this.sounds.engineResRef || '').replace(/\0[\s\S]*$/g, '').toLowerCase();
    if(!engineRef || engineRef === '****'){ return; }

    try{
      const engine = AudioEngine.GetAudioEngine();
      this.engineEmitter = new AudioEmitter(engine);
      this.engineEmitter.type = AudioEmitterType.POSITIONAL;
      this.engineEmitter.isLooping = true;
      this.engineEmitter.sounds = [engineRef];
      this.engineEmitter.setPriorityGroupId(this.priorityGroup());
      this.engineEmitter.setMaxDistance(50);
      const vol = this.sounds.getSoundVolume(MG_SOUND_ENGINE) & 0xff;
      this.engineEmitter.setVolume(vol);
      await this.engineEmitter.load();

      this.sounds.onEngineVolumeChanged = (v) => {
        this.engineEmitter?.setVolume(v & 0xff);
      };
    }catch(e){
      console.error('MGTrackFollowerAudio: failed to load engine sound', e);
    }
  }

  /** Go — Play engine if not already playing. */
  go(x: number = 0, y: number = 0, z: number = 0){
    if(this.destroyed || this.going){ return; }
    this.going = true;
    if(!this.engineEmitter){
      void this.load();
      return;
    }
    this.engineEmitter.setPosition(x, y, z);
    if(!this.engineEmitter.currentSound){
      this.engineEmitter.start();
    }
  }

  /** Stop — Stop engine source. */
  stop(){
    this.going = false;
    this.engineEmitter?.stop();
  }

  updatePosition(x: number, y: number, z: number){
    if(this.destroyed || !this.going || !this.engineEmitter){ return; }
    this.engineEmitter.setPosition(x, y, z);
  }

  /**
   * OnDeath death oneshot after Stop (when default death path runs).
   * Volume 100; 127 when death resref is mgs_accelpad.
   */
  async playDeathSound(): Promise<void> {
    const deathRef = (this.sounds.deathResRef || '').replace(/\0[\s\S]*$/g, '').toLowerCase();
    if(!deathRef || deathRef === '****'){
      this.stop();
      return;
    }

    this.stop();

    try{
      const engine = AudioEngine.GetAudioEngine();
      if(!this.deathEmitter){
        this.deathEmitter = new AudioEmitter(engine);
        this.deathEmitter.type = AudioEmitterType.GLOBAL;
        this.deathEmitter.setPriorityGroupId(this.priorityGroup());
        await this.deathEmitter.load();
      }
      const vol = deathRef === 'mgs_accelpad' ? 127 : 100;
      this.deathEmitter.setVolume(vol);
      await this.deathEmitter.playSoundFireAndForget(deathRef);
    }catch(e){
      console.error('MGTrackFollowerAudio: failed to play death sound', e);
    }
  }

  destroy(){
    this.destroyed = true;
    this.going = false;
    this.sounds.onEngineVolumeChanged = undefined;
    this.engineEmitter?.destroy();
    this.engineEmitter = undefined;
    this.deathEmitter?.destroy();
    this.deathEmitter = undefined;
  }
}
