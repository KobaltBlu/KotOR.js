/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as path from "path";
import * as fs from "fs";
import { LIPHeader } from "../interface/resource/LIPHeader";
import { LIPKeyFrame } from "../interface/resource/LIPKeyFrame";
import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { ResourceLoader } from "./ResourceLoader";
import { ResourceTypes } from "./ResourceTypes";

/* @file
 * The LIPObject class.
 */

export class LIPObject {
  file: string|Buffer;
  HeaderSize: number;
  Header: LIPHeader;
  keyframes: LIPKeyFrame[];
  time: number;
  lastTime: number;
  elapsed: number;
  anim: any;
  lipDataOffset: number;

  constructor(file: string|Buffer, onComplete?: Function){
    this.file = file;
    this.HeaderSize = 16;

    this.Header = {
      FileType: 'LIP ',
      FileVersion: 'V1.0',
      Length: 1,
      EntryCount: 0
    } as LIPHeader;

    this.keyframes = [];

    this.time = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this.anim = null;
    

    if(this.file != null){
      this.readFile( (lip: LIPObject) => {
        if(typeof onComplete == 'function')
          onComplete(lip);
      })
    }

  }

  readFile(onComplete?: Function){
    
    try{

      if(this.file instanceof Buffer){

        if(!this.file.length){

          this.Header.Length = 1;
          this.Header.EntryCount = 1;

          this.keyframes.push({
            time: 0.5,
            shape: 6
          });

          if(typeof onComplete == 'function')
            onComplete(this);
          return;
        }

        this.readBinary(Buffer.from(this.file), onComplete);

      }else{

        fs.readFile(this.file, (e, buffer) => {
          if (e) {
            console.error('LIPObject', 'LIP Header Read', e);
            return;
          }

          this.readBinary(Buffer.from(buffer), onComplete);

        });

      }
    }catch(e){
      console.error('LIPObject', 'LIP Open Error', e);
      if(typeof onComplete == 'function')
        onComplete(this);
    }
  }

  readBinary(buffer: Buffer, onComplete?: Function){

    if(buffer instanceof Buffer){

      let reader = new BinaryReader(buffer);

      this.Header = {} as LIPHeader;
      this.Header.FileType = reader.ReadChars(4);
      this.Header.FileVersion = reader.ReadChars(4);
      this.Header.Length = reader.ReadSingle();
      this.Header.EntryCount = reader.ReadUInt32();

      this.lipDataOffset = 16;
      reader.Seek(this.lipDataOffset);

      for (let i = 0; i < this.Header.EntryCount; i++) {
        let keyframe: LIPKeyFrame = {} as LIPKeyFrame;
        keyframe.time = reader.ReadSingle();
        keyframe.shape = reader.ReadByte();
        this.keyframes.push(keyframe);
      }

      buffer = reader = undefined;

      if(typeof onComplete == 'function')
        onComplete(this);

    }
  }

  update(delta = 0, model: any = null){
    if(model){

      let lastFrame = 0;
      let framesLen = this.keyframes.length;
      for(let f = 0; f < framesLen; f++){
        if(this.keyframes[f].time <= this.elapsed){
          lastFrame = f;
        }
      }

      let last = this.keyframes[lastFrame];
      let next = this.keyframes[lastFrame + 1];
      if (lastFrame + 1 >= this.keyframes.length || last.time >= this.elapsed) {
        next = this.keyframes[0];
      }

      if(!last){
        last = {
          time: 0,
          shape: 0
        };
      }

      let fl = 0;
      if(last){
        fl = Math.abs((this.elapsed - last.time) / (next.time - last.time));
      }

      if(fl == Infinity) fl = 1;
      if(isNaN(fl)) fl = 0;
      
      if(fl > 1){
        fl = 1;
      }
      
      if(this.anim == null){
        this.anim = model.getAnimationByName('talk');
      }
      
      if(this.anim){

        for(let i = 0; i < this.anim.nodes.length; i++){

          let node = this.anim.nodes[i];
          let modelNode = model.nodes.get(node.name);
      
          if(typeof modelNode != 'undefined'){
            
            this.anim._position.x = this.anim._position.y = this.anim._position.z = 0;
            this.anim._quaternion.x = this.anim._quaternion.y = this.anim._quaternion.z = 0;
            this.anim._quaternion.w = 1;
            //console.log(fl);
            node.controllers.forEach( (controller: any) => {
              modelNode.lipping = true;
              let last_frame = controller.data[last.shape];
              let next_frame = controller.data[next.shape];
              if(!last_frame){
                last_frame = controller.data[0];
              }
              if(!next_frame){
                next_frame = controller.data[0];
              }

              //Only interpolate keyframes if there is a previos frame and it isn't the same shape as the current
              if(last_frame){
                switch(controller.type){
                  case OdysseyModel.ControllerType.Position:
                    if(modelNode.controllers.get(OdysseyModel.ControllerType.Position)){
                      this.anim._position.copy(modelNode.controllers.get(OdysseyModel.ControllerType.Position).data[0]);
                    }
                    modelNode.position.copy(last_frame).add(this.anim._position);
                    modelNode.position.lerp(this.anim._position.add(next_frame), fl);
                  break;
                  case OdysseyModel.ControllerType.Orientation:
                    modelNode.quaternion.copy(last_frame);
                    modelNode.quaternion.slerp(this.anim._quaternion.copy(next_frame), fl);
                  break;
                }
                modelNode.updateMatrix();
              }

            });

          }

        }

      }

      if(this.elapsed >= this.Header.Length){
        
        if(model.moduleObject)
          model.moduleObject.lipObject = undefined;

        if(this.anim){
          for(let i = 0; i < this.anim.nodes.length; i++){
  
            let modelNode = model.animNodeCache[this.anim.nodes[i].name];
            if(typeof modelNode != 'undefined'){
              modelNode.lipping = false;
            }
            
          }
        }

      }else{
        this.elapsed += delta;
      }
      this.lastTime = this.elapsed;
    }
  }

  reIndexKeyframes(){
    this.keyframes.sort((a,b) => (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0)); 
    this.Header.EntryCount = this.keyframes.length;
  }

  export( onComplete?: Function ){

    //this.reIndexKeyframes();

    let writer = new BinaryWriter();

    //Write the header to the buffer
    writer.WriteChars(this.Header.FileType);
    writer.WriteChars(this.Header.FileVersion);
    writer.WriteSingle(this.Header.Length);
    writer.WriteUInt32(this.Header.EntryCount);

    //Write the keyframe data to the buffer
    for (let i = 0; i < this.Header.EntryCount; i++) {
      let keyframe = this.keyframes[i];
      writer.WriteSingle(keyframe.time);
      writer.WriteByte(keyframe.shape);
    }

    console.log('Exporting LIP file to ', this.file);

    fs.writeFile(this.file, writer.buffer, (err) => {

      if (err) {
        console.error(err);
      }else{
        console.log('LIP file exported to ', this.file);
      }

      if(typeof onComplete === 'function')
        onComplete(err);

    });

  }

  async exportAs( onComplete?: Function ){

    let payload = await dialog.showSaveDialog({
      title: 'Export LIP',
      defaultPath: this.file,
      properties: ['createDirectory'],
      filters: [
        {name: 'LIP', extensions: ['lip']}
      ]
    });

    if(!payload.canceled && typeof payload.filePath != 'undefined'){
      this.file = payload.filePath;
      this.export(onComplete);
    }else{
      console.warn('LIP export aborted');
      if(typeof onComplete === 'function')
        onComplete();
    }

  }

  static async Load(resref: string = ''){
    return new Promise<LIPObject>( (resolve, reject) => {
      ResourceLoader.loadResource(ResourceTypes['lip'], resref, (buffer: Buffer) => {
        resolve(new LIPObject(buffer));
      }, () => {
        resolve(undefined);
      });
    });
  }


}
