import { GameObject } from "@engine/module/GameObject";
import { AudioEmitter } from "@engine/audio/AudioEmitter";
import { AudioEngine } from "@engine/audio/AudioEngine";
import { GFFObject } from "@core/resource/GFFObject";
import { MDLLoader, ResourceLoader } from "@engine/loaders";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { GameObjectType } from "@core/enums/module/GameObjectType";
// import { GameObjectManager } from "@engine/managers";
import { AudioEmitterType } from "@core/enums/audio/AudioEmitterType";
import { AudioEngineChannel } from "@core/enums/audio/AudioEngineChannel";
import { GameState } from "@engine/runtime/GameState";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";
import { AudioGeneratedType } from "@core/enums/audio/AudioGeneratedType";
import { AudioPriorityGroup } from "@core/enums/audio/AudioPriorityGroup";
import { ModuleDayPhase } from "@core/enums/module/ModuleDayPhase";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { soundSerializer } from "@engine/module/serialization/SoundSerializer";

/**
* Sound class.
*
* Class representing sound emitters found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Sound.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Sound extends GameObject {
  audioEngine: AudioEngine;
  soundType: AudioEmitterType = AudioEmitterType.GLOBAL;
  active: boolean = true;
  /**
   * Client-only time-of-day gate.
   * Does not persist — never overwrite Active from UpdateTimeOfDay.
   */
  timeOfDayActive: boolean = true;
  continuous: boolean = false;
  fixedVariance: number = 0;
  generatedType: AudioGeneratedType = AudioGeneratedType.MANUALLY_PLACED;
  hours: number = 0;

  interval: number = 1000;

  intervalVariation: number = 0;

  looping: boolean = false;

  maxDistance: number = 1;

  minDistance: number = 0;

  pitchVariation: number = 0;

  positional: boolean = false;

  /**
   * IF true, the waves in the Sound's wave list are chosen randomly each time one finishes playing.
   * IF false, the waves are played in sequential order.
   */
  random: boolean = false;

  /**
   * IF true, the sound should be played from a random position with an offset from the Sound's position.
   * IF false, the sound should be played from the Sound's position.
   */
  randomPosition: boolean = false;

  /**
   * The maximum distance from the Sound's position to the random position on the X axis.
   */
  randomRangeX: number = 0;

  /**
   * The maximum distance from the Sound's position to the random position on the Y axis.
   */
  randomRangeY: number = 0;

  /**
   * The list of sound resrefs to play.
   */
  soundResRefs: string[] = [];

  /**
   * Times to play the sound.
   * 0 = Hour specific
   * 1 = Day
   * 2 = Night
   * 3 = Always
   */
  times: number = 3;

  /**
   * The volume of the sound.
   * MIN = 0, MAX = 127
   */
  volume: number = 70;

  /**
   * The variation of the volume of the sound.
   * MIN = 0, MAX = 127
   */
  volumeVariation: number = 0;

  /**
   * The elevation of the sound on the Z axis.
   */
  elevation: number = 0;

  /**
   * The priority of the sound.
   * index into prioritygroups.2da
   */
  priority: number = 0;

  constructor ( gff: GFFObject, audioEngine?: AudioEngine ) {

    super(gff);
    this.objectType |= GameObjectType.Sound;

    this.template = gff;
    this.audioEngine = audioEngine;

    this.active = true;
    this.commandable = 1;
    this.continuous = false;
    this.fixedVariance = 1;
    this.generatedType = 0;
    this.hours = 0;
    this.interval = 0;
    this.intervalVariation = 0;
    this.looping = false;
    this.maxDistance = 0;
    this.minDistance = 0;
    this.pitchVariation = 0;
    this.positional = false;
    this.random = false;
    this.randomPosition = false;
    this.randomRangeX = 0;
    this.randomRangeY = 0;
    this.soundResRefs = [];
    this.times = 3;
    this.volume = 0;
    this.volumeVariation = 0;
    this.priority = 0;

  }

  load(){
    this.seedResRefsFromTemplate();
    if(this.getTemplateResRef()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'TemplateResRef',
        resourceKey: 'uts',
        runtimeResRef: this.getTemplateResRef(),
      });
      if(!merged){
        console.error('Failed to load Sound template');
      }
      if(this.template instanceof GFFObject){
        this.initProperties();
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
    }
  }

  getPreviewModelResRef(): string {
    if(this.random){
      return 'gi_sound_rndm';
    }else if(this.positional){
      return 'gi_sound_pos';
    }
    return 'gi_sound_area';
  }

  async loadModel ( ) {
    const modelName = this.getPreviewModelResRef();
    const mdl = await MDLLoader.loader.load(modelName);
    const model = await OdysseyModel3D.FromMDL(mdl, {
      context: GameState.context
    });
    this.model = model;
    return model;
  }

  async loadSound(){
    const priorityGroup = GameState.SWRuleSet.getPriorityGroupById(this.priority);
    const type = !!this.positional ? AudioEmitterType.POSITIONAL : AudioEmitterType.GLOBAL;
    // LoadFromMessage promote: Continuous && 1 sound && Interval==0 && !RandomPosition → Looping.
    if(this.continuous && this.soundResRefs.length === 1 && !this.randomPosition && (this.interval | 0) === 0){
      this.looping = true;
    }
    if(this.audioEmitter){
      this.audioEmitter.destroy();
    }
    this.audioEmitter = new AudioEmitter(this.audioEngine, AudioEngineChannel.SFX);
    this.audioEmitter.name = this.tag;
    this.audioEmitter.isActive = this.active && (this.timeOfDayActive ?? true);
    this.audioEmitter.isLooping = this.looping;
    this.audioEmitter.isContinuous = this.continuous;
    this.audioEmitter.isRandom = this.random;
    this.audioEmitter.isRandomPosition = this.randomPosition;
    this.audioEmitter.interval = this.interval;
    this.audioEmitter.intervalVariation = this.intervalVariation;
    this.audioEmitter.playbackRate = 1;
    this.audioEmitter.playbackRateVariation = this.pitchVariation > 0 ? this.pitchVariation : priorityGroup?.playbackvariance || 0;
    this.audioEmitter.fixedVariance = this.fixedVariance;
    this.audioEmitter.volume = Math.max(0, Math.min(127, this.volume));
    this.audioEmitter.volumeVariation = this.volumeVariation || 0;
    this.audioEmitter.setPriorityGroupId(Number.isFinite(this.priority) ? this.priority : AudioPriorityGroup.DEFAULT);
    this.audioEmitter.type = type;
    this.audioEmitter.sounds = this.soundResRefs.slice(0);
    this.audioEmitter.position.x = this.position.x;
    this.audioEmitter.position.y = this.position.y;
    this.audioEmitter.position.z = this.position.z;
    this.audioEmitter.randomX = this.randomPosition ? this.randomRangeX || 0 : 0;
    this.audioEmitter.randomY = this.randomPosition ? this.randomRangeY || 0 : 0;
    this.audioEmitter.randomZ = 0;
    this.audioEmitter.elevation = this.elevation || 0;
    const minD = this.minDistance > 0 ? this.minDistance : Math.max(1, priorityGroup?.minvolumedist || 1);
    const maxD = this.maxDistance > 0 ? this.maxDistance : Math.max(minD, priorityGroup?.maxvolumedist || 1);
    this.audioEmitter.setMinDistance(minD);
    this.audioEmitter.setMaxDistance(maxD);
    await this.audioEmitter.load();
  }

  setVolume(volume: number): Sound {
    this.volume = Math.max(0, Math.min(127, volume));
    if(this.audioEmitter){
      this.audioEmitter.setVolume(this.volume);
    }
    return this;
  }

  /**
   * UpdateTimeOfDay.
   * Times: 0 = Hours bitmask, 1 = day-only, 2 = night-only, other = always.
   * Client-only: updates timeOfDayActive; never mutates persisted Active.
   */
  updateTimeOfDay(phase: ModuleDayPhase, hour = 0){
    let timeOfDayActive = true;
    const times = this.times | 0;
    if(times === 0){
      timeOfDayActive = ((1 << ((hour | 0) & 0x1f)) & (this.hours | 0)) !== 0;
    }else{
      switch(phase){
        case ModuleDayPhase.Day:
        case ModuleDayPhase.Dawn:
          timeOfDayActive = times !== 2;
          break;
        case ModuleDayPhase.Night:
        case ModuleDayPhase.Dusk:
          timeOfDayActive = times !== 1;
          break;
      }
    }
    this.timeOfDayActive = timeOfDayActive;
    if(this.audioEmitter){
      const combined = this.active && (this.timeOfDayActive ?? true);
      const wasActive = this.audioEmitter.isActive;
      this.audioEmitter.isActive = combined;
      if(wasActive && !combined){
        this.audioEmitter.stop(this.audioEmitter.getPriorityFadeTime());
      }else if(!wasActive && combined){
        this.audioEmitter.start();
      }
    }
  }

  setPosition(x: number = 0, y: number = 0, z: number = 0): Sound {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    if(this.audioEmitter){
      this.audioEmitter.setPosition(x, y, z);
    }
    return this;
  }

  setPitchVariation(pitchVariation: number = 1.0): Sound {
    this.pitchVariation = Math.max(0, Math.min(2.0, pitchVariation));
    if(this.audioEmitter){
      this.audioEmitter.playbackRateVariation = this.pitchVariation;
    }
    return this;
  }

  setFixedVariance(fixedVariance: number = 1.0): Sound {
    // SetFixedVariance accepts [0.5, 2]; outside range is ignored on the source.
    const v = Math.max(0, Math.min(2.0, fixedVariance));
    this.fixedVariance = v;
    if(this.audioEmitter){
      this.audioEmitter.fixedVariance = v;
    }
    return this;
  }

  start(): Sound {
    // Play sets Active = 1 before starting the source.
    this.active = true;
    if(this.audioEmitter){
      const combined = this.active && (this.timeOfDayActive ?? true);
      this.audioEmitter.isActive = combined;
      if(combined){
        this.audioEmitter.start();
      }
    }
    return this;
  }

  stop(fadeTime: number = 0): Sound {
    fadeTime = Math.max(0, fadeTime);

    if(this.audioEmitter){
      this.audioEmitter.stop(fadeTime);
    }
    return this;
  }

  /**
   * FadeAndStop — deactivate then fade/stop the source.
   * @param fadeSeconds NWScript fSeconds (converted to ms in; Web Audio uses seconds).
   */
  fadeAndStop(fadeSeconds: number = 0): Sound {
    this.active = false;
    if(this.audioEmitter){
      this.audioEmitter.isActive = this.active && (this.timeOfDayActive ?? true);
      const t = Math.max(0, fadeSeconds);
      this.audioEmitter.stop(t);
    }
    return this;
  }

  initProperties(){
    const needsRegister = !this.initialized;
    soundSerializer.deserialize(this, this.template);

    this.soundType = AudioEmitterType.GLOBAL;
    if(this.positional){
      this.soundType = this.randomPosition ? AudioEmitterType.RANDOM : AudioEmitterType.POSITIONAL;
    }

    this.loadActionList();

    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }
  }

  save(){
    const gff = soundSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

  destroy(): void {
    super.destroy();
  }

}
