import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTSEditor } from "../../components/tabs/TabUTSEditor";

export class TabUTSEditorState extends TabState {
  tabName: string = `UTS`;
  moduleSound: KotOR.ModuleSound;
  blueprint: KotOR.GFFObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabUTSEditor tab={this}></TabUTSEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Sound Object Blueprint',
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
          this.moduleSound = new KotOR.ModuleSound(this.blueprint);
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

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }

  animate(delta: number = 0){
    //todo
  }

}
