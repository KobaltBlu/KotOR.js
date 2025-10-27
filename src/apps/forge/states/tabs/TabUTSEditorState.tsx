import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTSEditor } from "../../components/tabs/tab-uts-editor/TabUTSEditor";

const PRIORITY_LOOPING_AREAWIDE_AMBIENTS = 4;
const PRIORITY_POSITIONAL_AMBIENTS = 5;
const PRIORITY_SINGLE_SHOT_GLOBAL = 21;
const PRIORITY_SINGLE_SHOT_POSITIONAL = 22;

export class TabUTSEditorState extends TabState {
  tabName: string = `UTS`;
  blueprint: KotOR.GFFObject;
  comment: string = '';
  paletteID: number = 0;
  templateResRef: string = '';
  active: boolean = false;
  continuous: boolean = false;
  elevation: number = 0;
  hours: number = 0;
  interval: number = 0;
  intervalVariation: number = 0;
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
  looping: boolean = false;
  maxDistance: number = 0;
  minDistance: number = 0;
  pitchVariation: number = 0;
  positional: boolean = false;
  priority: number = 0;
  random: boolean = false;
  randomPosition: boolean = false;
  randomRangeX: number = 0;
  randomRangeY: number = 0;
  soundResRefs: string[] = [];
  tag: string = '';
  times: number = 0;
  volume: number = 0;
  volumeVariation: number = 0;
  audioEmitter: KotOR.AudioEmitter;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabUTSEditor tab={this}></TabUTSEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Sound Blueprint',
        accept: {
          'application/octet-stream': ['.uts']
        }
      }
    ];

    this.addEventListener('onTabRemoved', (tab: TabState) => {
      this.stopEmitter();
    });
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.blueprint = new KotOR.GFFObject(response.buffer);
          this.setPropsFromBlueprint();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  setPropsFromBlueprint(){
    if(!this.blueprint) return;
    const root = this.blueprint.RootNode;
    if(!root) return;

    if(root.hasField('Active'))
      this.active = !!this.blueprint.getFieldByLabel('Active').getValue();

    if(root.hasField('Comment'))
      this.comment = this.blueprint.getFieldByLabel('Comment').getValue();

    if(root.hasField('Continuous'))
      this.continuous = !!this.blueprint.getFieldByLabel('Continuous').getValue();

    if(root.hasField('Elevation'))
      this.elevation = root.getFieldByLabel('Elevation').getValue();

    if(root.hasField('Hours'))
      this.hours = this.blueprint.getFieldByLabel('Hours').getValue()

    if(root.hasField('Interval'))
      this.interval = this.blueprint.getFieldByLabel('Interval').getValue();

    if(root.hasField('InternalVrtn'))
      this.intervalVariation = root.getFieldByLabel('IntervalVrtn').getValue();

    if(root.hasField('LocName'))
      this.locName = this.blueprint.getFieldByLabel('LocName').getCExoLocString();

    if(root.hasField('Looping'))
      this.looping = this.blueprint.getFieldByLabel('Looping').getValue();

    if(root.hasField('MaxDistance'))
      this.maxDistance = root.getFieldByLabel('MaxDistance').getValue();
      
    if(root.hasField('MinDistance'))
      this.minDistance = root.getFieldByLabel('MinDistance').getValue();

    if(root.hasField('PaletteID'))
      this.paletteID = root.getFieldByLabel('PaletteID').getValue();

    if(root.hasField('PitchVariation'))
      this.pitchVariation = root.getFieldByLabel('PitchVariation').getValue();

    if(root.hasField('Positional'))
      this.positional = !!root.getFieldByLabel('Positional').getValue();

    if(root.hasField('Priority'))
      this.priority = root.getFieldByLabel('Priority').getValue();

    if(root.hasField('Random'))
      this.random = root.getFieldByLabel('Random').getValue();

    if(root.hasField('RandomPosition'))
      this.randomPosition = !!root.getFieldByLabel('RandomPosition').getValue();

    if(root.hasField('RandomRangeX'))
      this.randomRangeX = root.getFieldByLabel('RandomRangeX').getValue();

    if(root.hasField('RandomRangeY'))
      this.randomRangeY = root.getFieldByLabel('RandomRangeY').getValue();

    if(root.hasField('Sounds')){
      const sounds = root.getFieldByLabel('Sounds').getChildStructs();
      for(let i = 0; i < sounds.length; i++){
        this.soundResRefs.push(sounds[i].getFieldByLabel('Sound').getValue());
      }
    }

    if(root.hasField('Tag'))
      this.tag = root.getFieldByLabel('Tag').getValue();

    if(root.hasField('TemplateResRef'))
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue();

    if(root.hasField('Times'))
      this.times = root.getFieldByLabel('Times').getValue();

    if(root.hasField('Volume'))
      this.volume = root.getFieldByLabel('Volume').getValue();

    if(root.hasField('VolumeVrtn'))
      this.volumeVariation = root.getFieldByLabel('VolumeVrtn').getValue();
  }

  async initializeAudioEmitter(){
    const type = !!this.positional ? KotOR.AudioEmitterType.POSITIONAL : KotOR.AudioEmitterType.GLOBAL;
    if(this.audioEmitter){
      this.audioEmitter.destroy();
    }
    this.audioEmitter = new KotOR.AudioEmitter(KotOR.AudioEngine.GetAudioEngine(), KotOR.AudioEngineChannel.SFX);
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
    this.audioEmitter.position.x = 0;
    this.audioEmitter.position.y = 0;
    this.audioEmitter.position.z = 0;
    this.audioEmitter.randomX = this.randomPosition ? this.randomRangeX || 0 : 0;
    this.audioEmitter.randomY = this.randomPosition ? this.randomRangeY || 0 : 0;
    this.audioEmitter.randomZ = 0;
    this.audioEmitter.elevation = this.elevation || 0;
    await this.audioEmitter.load();
  }

  removeSound(index: number){
    this.soundResRefs.splice(index, 1);
    this.processEventListener('onSoundChange', [this]);
  }

  addSound(sound: string){
    this.soundResRefs.push(sound);
    this.processEventListener('onSoundChange', [this]);
  }

  moveSoundUp(index: number){
    if(index > 0){
      const sound = this.soundResRefs[index];
      this.soundResRefs.splice(index, 1);
      this.soundResRefs.splice(index - 1, 0, sound);
      this.processEventListener('onSoundChange', [this]);
    }
  }
  
  moveSoundDown(index: number){
    if(index < this.soundResRefs.length - 1){
      const sound = this.soundResRefs[index];
      this.soundResRefs.splice(index, 1);
      this.soundResRefs.splice(index + 1, 0, sound);
      this.processEventListener('onSoundChange', [this]);
    }
  }

  /**
   * Calculate the priority based on Toolset Sound Priorities table.
   * 
   * @param isLooping - Whether the sound is looping (1) or single-shot (0)
   * @param isPositional - Whether the sound is positional (1) or global (0)
   * @returns The priority row number based on the toolset sound priorities
   */
  calculatePriority(){
    const isLooping = this.looping ? 1 : 0;
    const isPositional = this.positional ? 1 : 0;
    
    // Row 4: Looping area-wide ambients (looping=1, positional=0)
    if (isLooping === 1 && isPositional === 0) {
      this.priority = PRIORITY_LOOPING_AREAWIDE_AMBIENTS;
    }
    // Row 5: Looping positional ambients (looping=1, positional=1)
    else if (isLooping === 1 && isPositional === 1) {
      this.priority = PRIORITY_POSITIONAL_AMBIENTS;
    }
    // Row 21: Single-shot global (looping=0, positional=0)
    else if (isLooping === 0 && isPositional === 0) {
      this.priority = PRIORITY_SINGLE_SHOT_GLOBAL;
    }
    // Row 22: Single-shot positional (looping=0, positional=1)
    else if (isLooping === 0 && isPositional === 1) {
      this.priority = PRIORITY_SINGLE_SHOT_POSITIONAL;
    }
    // Default fallback - should not happen with valid inputs
    else {
      this.priority = PRIORITY_SINGLE_SHOT_GLOBAL;
    }
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }

  animate(delta: number = 0){
    //todo
  }

  startEmitter(){
    if(this.audioEmitter){
      this.audioEmitter.stop();
    }
    this.initializeAudioEmitter();
  }

  stopEmitter(){
    if(this.audioEmitter){
      this.audioEmitter.stop();
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'uts'){
      this.templateResRef = resref;
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    this.calculatePriority();
    const uts = new KotOR.GFFObject();
    uts.FileType = 'UTS ';
    uts.RootNode.type = -1;
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Active', this.active ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment ) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Continuous', this.continuous ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Elevation', this.elevation) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Hours', this.hours) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Interval', this.interval) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'IntervalVrtn', this.intervalVariation) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.locName ) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Looping', this.looping ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MaxDistance', this.maxDistance) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MinDistance', this.minDistance) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PitchVariation', this.pitchVariation) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Positional', this.positional ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Priority', this.priority) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Random', this.random ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'RandomPosition', this.randomPosition ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'RandomRangeX', this.randomRangeX) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'RandomRangeY', this.randomRangeY) );

    const soundsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Sounds', );
    for(let i = 0; i < this.soundResRefs.length; i++){
      const soundStruct = new KotOR.GFFStruct();
      soundStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Sound', this.soundResRefs[i]) );
      soundsField.addChildStruct(soundStruct);
    }
    uts.RootNode.addField( soundsField );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Times', this.times) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Volume', this.volume) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'VolumeVrtn', this.volumeVariation) );

    this.file.buffer = uts.getExportBuffer();
    this.processEventListener('onEditorFileChange', [this]);
  }

}
