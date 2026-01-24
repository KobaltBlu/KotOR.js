import { ModuleObject } from "./ModuleObject";
import { AudioEmitter } from "../audio/AudioEmitter";
import { AudioEngine } from "../audio/AudioEngine";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { MDLLoader, ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
// import { ModuleObjectManager } from "../managers";
import { AudioEmitterType } from "../enums/audio/AudioEmitterType";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { GameState } from "../GameState";
import { OdysseyModel3D } from "../three/odyssey/OdysseyModel3D";
import { AudioGeneratedType } from "../enums/audio/AudioGeneratedType";

/**
* ModuleSound class.
* 
* Class representing sound emitters found in modules areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleSound.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleSound extends ModuleObject {
  audioEngine: AudioEngine;
  soundType: AudioEmitterType = AudioEmitterType.GLOBAL;
  active: boolean = true;
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
    this.objectType |= ModuleObjectType.ModuleSound;

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
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uts'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
      }else{
        console.error('Failed to load ModuleSound template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
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
    const type = !!this.positional ? AudioEmitterType.POSITIONAL : AudioEmitterType.GLOBAL;
    if(this.audioEmitter){
      this.audioEmitter.destroy();
    }
    this.audioEmitter = new AudioEmitter(this.audioEngine, AudioEngineChannel.SFX);
    this.audioEmitter.name = this.tag;
    this.audioEmitter.isActive = this.active;
    this.audioEmitter.isLooping = this.looping;
    this.audioEmitter.isRandom = this.random;
    this.audioEmitter.isRandomPosition = this.randomPosition;
    this.audioEmitter.interval = this.interval;
    this.audioEmitter.intervalVariation = this.intervalVariation;
    this.audioEmitter.minDistance = this.minDistance || 1;
    this.audioEmitter.maxDistance = this.maxDistance;
    this.audioEmitter.playbackRate = 1;
    this.audioEmitter.playbackRateVariation = this.pitchVariation || 0;
    this.audioEmitter.volume = Math.max(0, Math.min(127, this.volume));
    this.audioEmitter.volumeVariation = this.volumeVariation || 0;
    this.audioEmitter.type = type;
    this.audioEmitter.sounds = this.soundResRefs.slice(0);
    this.audioEmitter.position.x = this.position.x;
    this.audioEmitter.position.y = this.position.y;
    this.audioEmitter.position.z = this.position.z;
    this.audioEmitter.randomX = this.randomPosition ? this.randomRangeX || 0 : 0;
    this.audioEmitter.randomY = this.randomPosition ? this.randomRangeY || 0 : 0;
    this.audioEmitter.randomZ = 0;
    this.audioEmitter.elevation = this.elevation || 0;
    await this.audioEmitter.load();
  }

  setVolume(volume: number): ModuleSound {
    this.volume = Math.max(0, Math.min(127, volume));
    if(this.audioEmitter){
      this.audioEmitter.setVolume(this.volume);
    }
    return this;
  }

  setPosition(x: number = 0, y: number = 0, z: number = 0): ModuleSound {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    if(this.audioEmitter){
      this.audioEmitter.setPosition(x, y, z);
    }
    return this;
  }

  setPitchVariation(pitchVariation: number = 1.0): ModuleSound {
    this.pitchVariation = Math.max(0, Math.min(2.0, pitchVariation));
    if(this.audioEmitter){
      this.audioEmitter.playbackRateVariation = this.pitchVariation;
    }
    return this;
  }

  setFixedVariance(fixedVariance: number = 1.0): ModuleSound {
    this.fixedVariance = Math.max(0, Math.min(2.0, fixedVariance));
    return this;
  }

  start(): ModuleSound {
    if(this.audioEmitter){
      this.audioEmitter.start();
    }
    return this;
  }

  stop(fadeTime: number = 0): ModuleSound {
    fadeTime = Math.max(0, fadeTime);

    if(this.audioEmitter){
      this.audioEmitter.stop(fadeTime);
    }
    return this;
  }

  initProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
      
      GameState.ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.hasField('LocName'))
      this.name = this.template.getFieldByLabel('LocName').getCExoLocString().getValue();

    if(this.template.RootNode.hasField('Active'))
      this.active = !!this.template.getFieldByLabel('Active').getValue()

    if(this.template.RootNode.hasField('Priority'))
      this.priority = this.template.getFieldByLabel('Priority').getValue()

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = !!this.template.getFieldByLabel('Commandable').getValue()

    if(this.template.RootNode.hasField('FixedVariance'))
      this.fixedVariance = this.template.getFieldByLabel('FixedVariance').getValue()

    if(this.template.RootNode.hasField('GeneratedType'))
      this.generatedType = this.template.getFieldByLabel('GeneratedType').getValue()

    if(this.template.RootNode.hasField('Hours'))
      this.hours = this.template.getFieldByLabel('Hours').getValue()

    if(this.template.RootNode.hasField('Interval'))
      this.interval = this.template.getFieldByLabel('Interval').getValue();

    if(this.template.RootNode.hasField('IntervalVrtn'))
      this.intervalVariation = this.template.getFieldByLabel('IntervalVrtn').getValue();

    if(this.template.RootNode.hasField('Looping'))
      this.looping = this.template.getFieldByLabel('Looping').getValue();

    if(this.template.RootNode.hasField('MaxDistance'))
      this.maxDistance = this.template.getFieldByLabel('MaxDistance').getValue();
      
    if(this.template.RootNode.hasField('MinDistance'))
      this.minDistance = this.template.getFieldByLabel('MinDistance').getValue();

    if(this.template.RootNode.hasField('PitchVariation'))
      this.pitchVariation = this.template.getFieldByLabel('PitchVariation').getValue();

    if(this.template.RootNode.hasField('Positional'))
      this.positional = !!this.template.getFieldByLabel('Positional').getValue();

    if(this.template.RootNode.hasField('Random'))
      this.random = this.template.getFieldByLabel('Random').getValue();

    if(this.template.RootNode.hasField('RandomPosition'))
      this.randomPosition = !!this.template.getFieldByLabel('RandomPosition').getValue();

    if(this.template.RootNode.hasField('RandomRangeX'))
      this.randomRangeX = this.template.getFieldByLabel('RandomRangeX').getValue();

    if(this.template.RootNode.hasField('RandomRangeY'))
      this.randomRangeY = this.template.getFieldByLabel('RandomRangeY').getValue();

    if(this.template.RootNode.hasField('Sounds')){
      const sounds = this.template.getFieldByLabel('Sounds').getChildStructs();
      for(let i = 0; i < sounds.length; i++){
        this.soundResRefs.push(sounds[i].getFieldByLabel('Sound').getValue());
      }
    }

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

    if(this.template.RootNode.hasField('Times'))
      this.times = this.template.getFieldByLabel('Times').getValue();

    if(this.template.RootNode.hasField('Volume'))
      this.volume = this.template.getFieldByLabel('Volume').getValue();

    if(this.template.RootNode.hasField('VolumeVrtn'))
      this.volumeVariation = this.template.getFieldByLabel('VolumeVrtn').getValue();

    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

    if(this.template.RootNode.hasField('Elevation'))
      this.elevation = this.template.RootNode.getFieldByLabel('Elevation').getValue();

    if(this.template.RootNode.hasField('SWVarTable')){
      let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    this.soundType = AudioEmitterType.GLOBAL;
    if(this.positional){
      this.soundType = AudioEmitterType.POSITIONAL;
    }else if(this.positional &&this.randomPosition){
      this.soundType = AudioEmitterType.RANDOM;
    }
    
    this.initialized = true;

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTS ';
    gff.RootNode.type = 6;

    gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Active') ).setValue(this.active ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.commandable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Continuous') ).setValue(this.continuous ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'FixedVariance') ).setValue(this.fixedVariance);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'GeneratedType') ).setValue(this.generatedType);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Hours') ).setValue(this.hours);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Interval') ).setValue(this.interval);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'IntervalVrtn') ).setValue(this.intervalVariation);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Looping') ).setValue(this.looping ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'MaxDistance') ).setValue(this.maxDistance);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'MinDistance') ).setValue(this.minDistance);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'PitchVariation') ).setValue(this.pitchVariation);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Positional') ).setValue(this.positional ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Random') ).setValue(this.random ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'RandomPosition') ).setValue(this.randomPosition ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'RandomRangeX') ).setValue(this.randomRangeX);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'RandomRangeY') ).setValue(this.randomRangeY);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Priority') ).setValue(this.priority);
    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Sounds
    let sounds = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Sounds') );
    for(let i = 0; i < this.soundResRefs.length; i++){
      let soundStruct = new GFFStruct();
      soundStruct.addField( new GFFField(GFFDataType.RESREF, 'Sound', this.soundResRefs[i]) );
      sounds.addChildStruct(soundStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Times') ).setValue(this.times);
    gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Volume') ).setValue(Math.max(0, Math.min(127, this.volume)));
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'VolumeVrtn') ).setValue(Math.max(0, Math.min(127, this.volumeVariation)));
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Elevation') ).setValue(this.elevation);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  destroy(): void {
    super.destroy();
  }

}
