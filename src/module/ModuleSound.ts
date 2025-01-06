import { ModuleObject } from "./ModuleObject";
import { AudioEmitter } from "../audio/AudioEmitter";
import { AudioEngine } from "../audio/AudioEngine";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
// import { ModuleObjectManager } from "../managers";
import { AudioEmitterType } from "../enums/audio/AudioEmitterType";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { GameState } from "../GameState";

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
  active: number;
  continuous: number;
  fixedVariance: number;
  generatedType: number;
  hours: number;
  interval: number;
  intervalVariation: number;
  looping: number;
  maxDistance: number;
  minDistance: number;
  pitchVariation: number;
  positional: number;
  random: number;
  randomPosition: number;
  randomRangeX: number;
  randomRangeY: number;
  sounds: any[];
  times: number;
  volume: number;
  volumeVariation: number;
  emitter: AudioEmitter;
  micRange: any;

  constructor ( gff: GFFObject, audioEngine?: AudioEngine ) {

    super(gff);
    this.objectType |= ModuleObjectType.ModuleSound;

    this.template = gff;
    this.audioEngine = audioEngine;

    this.active = 0;
    this.commandable = 1;
    this.continuous = 0;
    this.fixedVariance = 0;
    this.generatedType = 0;
    this.hours = 0;
    this.interval = 0;
    this.intervalVariation = 0;
    this.looping = 0;
    this.maxDistance = 0;
    this.minDistance = 0;
    this.pitchVariation = 0;
    this.positional = 0;
    this.random = 0;
    this.randomPosition = 0;
    this.randomRangeX = 0;
    this.randomRangeY = 0;
    this.sounds = [];
    this.times = 3;
    this.volume = 0;
    this.volumeVariation = 0;

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

  loadModel ( onLoad?: Function ) {
    if(typeof onLoad === 'function')
      onLoad(this.mesh);

    // let mdlLoader = new THREE.MDLLoader();

    // if(this.getRandom()){
    //   mdlLoader.load({
    //     file: 'gi_sound_rndm',
    //     onLoad: (mesh) => {
    //       this.mesh = mesh;
    //       if(onLoad != null)
    //         onLoad(this.mesh);
    //     }
    //   });
    // }else{
    //   if(this.getPositional()){
    //     mdlLoader.load({
    //       file: 'gi_sound_pos',
    //       onLoad: (mesh) => {
    //         this.mesh = mesh;
    //         if(onLoad != null)
    //           onLoad(this.mesh);
    //       }
    //     });
    //   }else{
    //     mdlLoader.load({
    //       file: 'gi_sound_area',
    //       onLoad: (mesh) => {
    //         this.mesh = mesh;
    //         if(onLoad != null)
    //           onLoad(this.mesh);
    //       }
    //     });
    //   }
    // }

  }

  getActive(){
    return this.active ? true : false;
  }

  getLooping(){
    return this.looping ? true : false;
  }

  getRandom(){
    return this.random ? true : false;
  }

  getRandomPosition(){
    return this.randomPosition ? true : false;
  }

  getInterval(){
    return this.interval;
  }

  getInternalVrtn(){
    return this.intervalVariation;
  }

  getMaxDistance(){
    return this.maxDistance;
  }

  getVolume(){
    return this.volume;
  }

  getPositional(){
    return this.positional ? true : false;
  }

  getSounds(){
    return this.sounds;
  }


  loadSound(onLoad?: Function){

    let template: any = {
      sounds: [],
      isActive: this.getActive(),
      isLooping: this.getLooping(),
      isRandom: this.getRandom(),
      isRandomPosition: this.getRandomPosition(),
      interval: this.getInterval(),
      intervalVariation: this.getInternalVrtn(),
      maxDistance: this.getMaxDistance(),
      volume: this.getVolume(),
      positional: this.getPositional()
    };

    let snds = this.getSounds();
    for(let i = 0; i < snds.length; i++){
      template.sounds.push(snds[i].getFieldByLabel('Sound').getValue());
    }

    const type = !!this.getPositional() ? AudioEmitterType.POSITIONAL : AudioEmitterType.GLOBAL;
    
    this.emitter = new AudioEmitter(this.audioEngine, AudioEngineChannel.SFX);
    this.emitter.isActive = this.getActive();
    this.emitter.isLooping = this.getLooping();
    this.emitter.isRandom = this.getRandom();
    this.emitter.isRandomPosition = this.getRandomPosition();
    this.emitter.interval = this.getInterval();
    this.emitter.intervalVariation = this.getInternalVrtn();
    this.emitter.maxDistance = this.getMaxDistance();
    this.emitter.volume = this.getVolume();
    this.emitter.type = type;
    this.emitter.load().then( () => {
      if(typeof onLoad === 'function'){
        onLoad();
      }
    });

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

    if(this.template.RootNode.hasField('Active'))
      this.active = this.template.getFieldByLabel('Active').getValue()

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = this.template.getFieldByLabel('Commandable').getValue()

    if(this.template.RootNode.hasField('FixedVariance'))
      this.fixedVariance = this.template.getFieldByLabel('FixedVariance').getValue()

    if(this.template.RootNode.hasField('GeneratedType'))
      this.generatedType = this.template.getFieldByLabel('GeneratedType').getValue()

    if(this.template.RootNode.hasField('Hours'))
      this.hours = this.template.getFieldByLabel('Hours').getValue()

    if(this.template.RootNode.hasField('Interval'))
      this.interval = this.template.getFieldByLabel('Interval').getValue();

    if(this.template.RootNode.hasField('InternalVrtn'))
      this.intervalVariation = this.template.getFieldByLabel('InternalVrtn').getValue();

    if(this.template.RootNode.hasField('Looping'))
      this.looping = this.template.getFieldByLabel('Looping').getValue();

    if(this.template.RootNode.hasField('MaxDistance'))
      this.maxDistance = this.template.getFieldByLabel('MaxDistance').getValue();
      
    if(this.template.RootNode.hasField('MinDistance'))
      this.minDistance = this.template.getFieldByLabel('MinDistance').getValue();

    if(this.template.RootNode.hasField('PitchVariation'))
      this.pitchVariation = this.template.getFieldByLabel('PitchVariation').getValue();

    if(this.template.RootNode.hasField('Positional'))
      this.positional = this.template.getFieldByLabel('Positional').getValue();

    if(this.template.RootNode.hasField('Random'))
      this.random = this.template.getFieldByLabel('Random').getValue();

    if(this.template.RootNode.hasField('RandomPosition'))
      this.randomPosition = this.template.getFieldByLabel('RandomPosition').getValue();

    if(this.template.RootNode.hasField('RandomRangeX'))
      this.randomRangeX = this.template.getFieldByLabel('RandomRangeX').getValue();

    if(this.template.RootNode.hasField('RandomRangeY'))
      this.randomRangeY = this.template.getFieldByLabel('RandomRangeY').getValue();

    if(this.template.RootNode.hasField('Sounds'))
      this.sounds = this.template.getFieldByLabel('Sounds').getChildStructs();

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

    if(this.template.RootNode.hasField('SWVarTable')){
      let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }
    
    this.initialized = true;

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTS ';
    gff.RootNode.type = 6;

    gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Active') ).setValue(this.active);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Continuous') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'FixedVariance') ).setValue(this.fixedVariance);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'GeneratedType') ).setValue(this.generatedType);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Hours') ).setValue(this.hours);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Interval') ).setValue(this.interval);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'IntervalVrtn') ).setValue(this.intervalVariation);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Looping') ).setValue(this.looping);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'MaxDistance') ).setValue(this.maxDistance);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'MinDistance') ).setValue(this.minDistance);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'PitchVariation') ).setValue(this.pitchVariation);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Positional') ).setValue(this.positional);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Random') ).setValue(this.random);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'RandomPosition') ).setValue(this.randomPosition);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'RandomRangeX') ).setValue(this.randomRangeX);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'RandomRangeY') ).setValue(this.randomRangeY);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Sounds
    let sounds = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Sounds') );
    for(let i = 0; i < this.sounds.length; i++){
      sounds.addChildStruct(this.sounds[i]);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Times') ).setValue(this.times);
    gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Volume') ).setValue(this.volume);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'VolumeVrtn') ).setValue(this.volumeVariation);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }
  
  toToolsetInstance(){
    let instance = new GFFStruct(6);

    instance.addField(
      new GFFField(GFFDataType.DWORD, 'GeneratedType', 0)
    );
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );
    return instance;
  }

  destroy(): void {
    super.destroy();
    if(this.area) this.area.detachObject(this);
  }

}
