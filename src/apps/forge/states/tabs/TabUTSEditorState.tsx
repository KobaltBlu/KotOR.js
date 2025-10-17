import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTSEditor } from "../../components/tabs/TabUTSEditor";

const PRIORITY_LOOPING_AREAWIDE_AMBIENTS = 4;
const PRIORITY_POSITIONAL_AMBIENTS = 5;
const PRIORITY_SINGLE_SHOT_GLOBAL = 21;
const PRIORITY_SINGLE_SHOT_POSITIONAL = 22;

export class TabUTSEditorState extends TabState {
  tabName: string = `UTS`;
  moduleSound: KotOR.ModuleSound;
  blueprint: KotOR.GFFObject;
  comment: string = '';
  paletteID: number = 0;

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
          this.moduleSound = new KotOR.ModuleSound(this.blueprint, KotOR.AudioEngine.GetAudioEngine());
          this.moduleSound.initProperties();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  removeSound(index: number){
    this.moduleSound.soundResRefs.splice(index, 1);
    this.processEventListener('onSoundChange', [this]);
  }

  addSound(sound: string){
    this.moduleSound.soundResRefs.push(sound);
    this.processEventListener('onSoundChange', [this]);
  }

  moveSoundUp(index: number){
    if(index > 0){
      const sound = this.moduleSound.soundResRefs[index];
      this.moduleSound.soundResRefs.splice(index, 1);
      this.moduleSound.soundResRefs.splice(index - 1, 0, sound);
      this.processEventListener('onSoundChange', [this]);
    }
  }
  
  moveSoundDown(index: number){
    if(index < this.moduleSound.soundResRefs.length - 1){
      const sound = this.moduleSound.soundResRefs[index];
      this.moduleSound.soundResRefs.splice(index, 1);
      this.moduleSound.soundResRefs.splice(index + 1, 0, sound);
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
    const isLooping = this.moduleSound.looping ? 1 : 0;
    const isPositional = this.moduleSound.positional ? 1 : 0;
    
    // Row 4: Looping area-wide ambients (looping=1, positional=0)
    if (isLooping === 1 && isPositional === 0) {
      this.moduleSound.priority = PRIORITY_LOOPING_AREAWIDE_AMBIENTS;
    }
    // Row 5: Looping positional ambients (looping=1, positional=1)
    else if (isLooping === 1 && isPositional === 1) {
      this.moduleSound.priority = PRIORITY_POSITIONAL_AMBIENTS;
    }
    // Row 21: Single-shot global (looping=0, positional=0)
    else if (isLooping === 0 && isPositional === 0) {
      this.moduleSound.priority = PRIORITY_SINGLE_SHOT_GLOBAL;
    }
    // Row 22: Single-shot positional (looping=0, positional=1)
    else if (isLooping === 0 && isPositional === 1) {
      this.moduleSound.priority = PRIORITY_SINGLE_SHOT_POSITIONAL;
    }
    // Default fallback - should not happen with valid inputs
    else {
      this.moduleSound.priority = PRIORITY_SINGLE_SHOT_GLOBAL;
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
    if(this.moduleSound){
      this.moduleSound.loadSound();
    }
  }

  stopEmitter(){
    if(this.moduleSound){
      this.moduleSound.audioEmitter.stop();
    }
  }

  updateFile(){
    this.calculatePriority();
    const uts = new KotOR.GFFObject();
    uts.FileType = 'UTS ';
    uts.RootNode.type = -1;
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Active', this.moduleSound.active ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment ) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Continuous', this.moduleSound.continuous ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Elevation', this.moduleSound.elevation) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Hours', this.moduleSound.hours) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Interval', this.moduleSound.interval) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'IntervalVrtn', this.moduleSound.intervalVariation) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.moduleSound.name ) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Looping', this.moduleSound.looping ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MaxDistance', this.moduleSound.maxDistance) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MinDistance', this.moduleSound.minDistance) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PitchVariation', this.moduleSound.pitchVariation) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Positional', this.moduleSound.positional ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Priority', this.moduleSound.priority) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Random', this.moduleSound.random ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'RandomPosition', this.moduleSound.randomPosition ? 1 : 0) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'RandomRangeX', this.moduleSound.randomRangeX) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'RandomRangeY', this.moduleSound.randomRangeY) );

    const soundsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Sounds', );
    for(let i = 0; i < this.moduleSound.soundResRefs.length; i++){
      const soundStruct = new KotOR.GFFStruct();
      soundStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Sound', this.moduleSound.soundResRefs[i]) );
      soundsField.addChildStruct(soundStruct);
    }
    uts.RootNode.addField( soundsField );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.moduleSound.tag) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'TemplateResRef', this.moduleSound.templateResRef) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Times', this.moduleSound.times) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Volume', this.moduleSound.volume) );
    uts.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'VolumeVrtn', this.moduleSound.volumeVariation) );

    this.file.buffer = uts.getExportBuffer();
    this.processEventListener('onEditorFileChange', [this]);
  }

}
