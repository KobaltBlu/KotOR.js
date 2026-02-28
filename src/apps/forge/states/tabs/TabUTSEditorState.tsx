import React from "react";
import * as THREE from 'three';

import { TabUTSEditor } from "@/apps/forge/components/tabs/tab-uts-editor/TabUTSEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeSound } from "@/apps/forge/module-editor/ForgeSound";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabUTSEditorState extends TabState {
  tabName: string = `UTS`;
  sound: ForgeSound = new ForgeSound();

  get blueprint(): KotOR.GFFObject {
    return this.sound.blueprint;
  }

  get soundResRefs(): string[] {
    return this.sound.soundResRefs;
  }

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
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.sound = new ForgeSound(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  async initializeAudioEmitter(){
    const type = !!this.sound.positional ? KotOR.AudioEmitterType.POSITIONAL : KotOR.AudioEmitterType.GLOBAL;
    if(this.audioEmitter){
      this.audioEmitter.destroy();
    }
    this.audioEmitter = new KotOR.AudioEmitter(KotOR.AudioEngine.GetAudioEngine(), KotOR.AudioEngineChannel.SFX);
    this.audioEmitter.name = this.sound.tag;
    this.audioEmitter.isActive = this.sound.active;
    this.audioEmitter.isLooping = this.sound.looping;
    this.audioEmitter.isRandom = this.sound.random;
    this.audioEmitter.isRandomPosition = this.sound.randomPosition;
    this.audioEmitter.interval = this.sound.interval;
    this.audioEmitter.intervalVariation = this.sound.intervalVariation;
    this.audioEmitter.minDistance = this.sound.minDistance || 1;
    this.audioEmitter.maxDistance = this.sound.maxDistance;
    this.audioEmitter.playbackRate = 1;
    this.audioEmitter.playbackRateVariation = this.sound.pitchVariation || 0;
    this.audioEmitter.volume = Math.max(0, Math.min(127, this.sound.volume));
    this.audioEmitter.volumeVariation = this.sound.volumeVariation || 0;
    this.audioEmitter.type = type;
    this.audioEmitter.sounds = this.sound.soundResRefs.slice(0);
    this.audioEmitter.position.x = 0;
    this.audioEmitter.position.y = 0;
    this.audioEmitter.position.z = 0;
    this.audioEmitter.randomX = this.sound.randomPosition ? this.sound.randomRangeX || 0 : 0;
    this.audioEmitter.randomY = this.sound.randomPosition ? this.sound.randomRangeY || 0 : 0;
    this.audioEmitter.randomZ = 0;
    this.audioEmitter.elevation = this.sound.elevation || 0;
    await this.audioEmitter.load();
  }

  removeSound(index: number){
    this.sound.soundResRefs.splice(index, 1);
    this.processEventListener('onSoundChange', [this]);
  }

  addSound(sound: string){
    this.sound.soundResRefs.push(sound);
    this.processEventListener('onSoundChange', [this]);
  }

  moveSoundUp(index: number){
    if(index > 0){
      const sound = this.sound.soundResRefs[index];
      this.sound.soundResRefs.splice(index, 1);
      this.sound.soundResRefs.splice(index - 1, 0, sound);
      this.processEventListener('onSoundChange', [this]);
    }
  }
  
  moveSoundDown(index: number){
    if(index < this.sound.soundResRefs.length - 1){
      const sound = this.sound.soundResRefs[index];
      this.sound.soundResRefs.splice(index, 1);
      this.sound.soundResRefs.splice(index + 1, 0, sound);
      this.processEventListener('onSoundChange', [this]);
    }
  }

  calculatePriority(){
    this.sound.calculatePriority();
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
      this.sound.templateResRef = resref;
      this.updateFile();
      return this.sound.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
  
  updateFile(){
    this.sound.exportToBlueprint();
  }

}
