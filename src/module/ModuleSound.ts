/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import { AudioEmitter } from "../audio/AudioEmitter";
import { AudioEngine } from "../audio/AudioEngine";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectManager } from "../managers";

/* @file
 * The ModuleSound class.
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
        this.template.Merge(gff);
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
      sounds: [],//this.gff.GetFieldByLabel('Sounds').GetChildStructs(),
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
      template.sounds.push(snds[i].GetFieldByLabel('Sound').GetValue());
    }

    //console.log('UTSObject', template);

    this.emitter = new AudioEmitter({
      engine: this.audioEngine,
      props: this,
      template: template,
      onLoad: () => {
        if(onLoad != null)
          onLoad();
      },
      onError: () => {
        if(onLoad != null)
          onLoad();
      }
    });

  }

  initProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.HasField('ObjectId')){
        this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
      }else if(this.template.RootNode.HasField('ID')){
        this.id = this.template.GetFieldByLabel('ID').GetValue();
      }
      
      ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.HasField('Active'))
      this.active = this.template.GetFieldByLabel('Active').GetValue()

    if(this.template.RootNode.HasField('Commandable'))
      this.commandable = this.template.GetFieldByLabel('Commandable').GetValue()

    if(this.template.RootNode.HasField('FixedVariance'))
      this.fixedVariance = this.template.GetFieldByLabel('FixedVariance').GetValue()

    if(this.template.RootNode.HasField('GeneratedType'))
      this.generatedType = this.template.GetFieldByLabel('GeneratedType').GetValue()

    if(this.template.RootNode.HasField('Hours'))
      this.hours = this.template.GetFieldByLabel('Hours').GetValue()

    if(this.template.RootNode.HasField('Interval'))
      this.interval = this.template.GetFieldByLabel('Interval').GetValue();

    if(this.template.RootNode.HasField('InternalVrtn'))
      this.intervalVariation = this.template.GetFieldByLabel('InternalVrtn').GetValue();

    if(this.template.RootNode.HasField('Looping'))
      this.looping = this.template.GetFieldByLabel('Looping').GetValue();

    if(this.template.RootNode.HasField('MaxDistance'))
      this.maxDistance = this.template.GetFieldByLabel('MaxDistance').GetValue();
      
    if(this.template.RootNode.HasField('MinDistance'))
      this.minDistance = this.template.GetFieldByLabel('MinDistance').GetValue();

    if(this.template.RootNode.HasField('PitchVariation'))
      this.pitchVariation = this.template.GetFieldByLabel('PitchVariation').GetValue();

    if(this.template.RootNode.HasField('Positional'))
      this.positional = this.template.GetFieldByLabel('Positional').GetValue();

    if(this.template.RootNode.HasField('Random'))
      this.random = this.template.GetFieldByLabel('Random').GetValue();

    if(this.template.RootNode.HasField('RandomPosition'))
      this.randomPosition = this.template.GetFieldByLabel('RandomPosition').GetValue();

    if(this.template.RootNode.HasField('RandomRangeX'))
      this.randomRangeX = this.template.GetFieldByLabel('RandomRangeX').GetValue();

    if(this.template.RootNode.HasField('RandomRangeY'))
      this.randomRangeY = this.template.GetFieldByLabel('RandomRangeY').GetValue();

    if(this.template.RootNode.HasField('Sounds'))
      this.sounds = this.template.GetFieldByLabel('Sounds').GetChildStructs();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('Times'))
      this.times = this.template.GetFieldByLabel('Times').GetValue();

    if(this.template.RootNode.HasField('Volume'))
      this.volume = this.template.GetFieldByLabel('Volume').GetValue();

    if(this.template.RootNode.HasField('VolumeVrtn'))
      this.volumeVariation = this.template.GetFieldByLabel('VolumeVrtn').GetValue();

    if(this.template.RootNode.HasField('XPosition'))
      this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

    if(this.template.RootNode.HasField('SWVarTable')){
      let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
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
    gff.RootNode.Type = 6;

    gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Active') ).SetValue(this.active);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Continuous') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'FixedVariance') ).SetValue(this.fixedVariance);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'GeneratedType') ).SetValue(this.generatedType);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Hours') ).SetValue(this.hours);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Interval') ).SetValue(this.interval);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'IntervalVrtn') ).SetValue(this.intervalVariation);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Looping') ).SetValue(this.looping);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'MaxDistance') ).SetValue(this.maxDistance);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'MinDistance') ).SetValue(this.minDistance);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'PitchVariation') ).SetValue(this.pitchVariation);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Positional') ).SetValue(this.positional);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Random') ).SetValue(this.random);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'RandomPosition') ).SetValue(this.randomPosition);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'RandomRangeX') ).SetValue(this.randomRangeX);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'RandomRangeY') ).SetValue(this.randomRangeY);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    //Sounds
    let sounds = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Sounds') );
    for(let i = 0; i < this.sounds.length; i++){
      sounds.AddChildStruct(this.sounds[i]);
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Times') ).SetValue(this.times);
    gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Volume') ).SetValue(this.volume);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'VolumeVrtn') ).SetValue(this.volumeVariation);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.position.x);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.position.y);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }
  
  toToolsetInstance(){
    let instance = new GFFStruct(6);

    instance.AddField(
      new GFFField(GFFDataType.DWORD, 'GeneratedType', 0)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );
    return instance;
  }

  destroy(): void {
    super.destroy();
    if(this.area) this.area.detachObject(this);
  }

}
