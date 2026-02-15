import * as THREE from 'three';

import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { ILIPKeyFrame } from "@/interface/resource/ILIPKeyFrame";
import { ResourceLoader } from "@/loaders";
import { OdysseyModelAnimation } from "@/odyssey";
import type { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { OdysseyModel3D } from "@/three/odyssey";
import type { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Resource);

/**
 * LIPObject class.
 *
 * Class representing a Lip Sync file in memory.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file LIPObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LIPObject {
  static FILE_TYPE  = 'LIP ';
  static FILE_VER   = 'V1.0';

  file: string|Uint8Array;
  HeaderSize: number;
  keyframes: ILIPKeyFrame[];
  time: number;
  lastTime: number;
  duration: number;
  elapsed: number;
  anim: OdysseyModelAnimation;
  lipDataOffset: number;

  static readonly MAX_LIP_SHAPES = 16;

  constructor(file: string|Uint8Array, onComplete?: (lip: LIPObject) => void){
    this.file = file;
    this.HeaderSize = 16;

    this.duration = 1;

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

  readFile(onComplete?: (lip: LIPObject) => void){

    try{

      if(this.file instanceof Uint8Array){

        if(!this.file.length){

          this.duration = 1;

          this.keyframes.push({
            uuid: crypto.randomUUID(),
            time: 0.5,
            shape: 6
          });

          if(typeof onComplete == 'function')
            onComplete(this);
          return;
        }

        this.readBinary(this.file, onComplete);

      }else{
        GameFileSystem.readFile(this.file as string).then( (buffer) => {
          this.readBinary(buffer, onComplete);
        }).catch( (err) => {
          log.error('LIPObject', 'LIP Header Read', err);
        });
      }
    }catch(e){
      log.error('LIPObject', 'LIP Open Error', e);
      if(typeof onComplete == 'function')
        onComplete(this);
    }
  }

  readBinary(buffer: Uint8Array, onComplete?: (lip: LIPObject) => void){
    if(buffer instanceof Uint8Array){

      const reader = new BinaryReader(buffer);

      const _fileType = reader.readChars(4);
      const _fileVersion = reader.readChars(4);
      this.duration = reader.readSingle();
      const entryCount = reader.readUInt32();

      this.lipDataOffset = 16;
      reader.seek(this.lipDataOffset);

      for (let i = 0; i < entryCount; i++) {
        this.addKeyFrame(
          reader.readSingle(),
          reader.readByte(),
        );
      }

      reader.dispose();

      if(typeof onComplete == 'function')
        onComplete(this);

    }
  }

  addKeyFrame(time: number = 0, shape: number = 0){
    const keyframe: ILIPKeyFrame = {
      uuid: crypto.randomUUID(),
      time: time,
      shape: shape,
    } as ILIPKeyFrame;
    this.keyframes.push(keyframe);
    this.reIndexKeyframes();
    return keyframe;
  }

  update(delta = 0, model: OdysseyModel3D){
    if(model){

      let lastFrame = 0;
      const framesLen = this.keyframes.length;
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
          uuid: '',
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
        this.anim = model.odysseyAnimationMap.get('talk');
      }

      if(this.anim){

        for(let i = 0; i < this.anim.nodes.length; i++){

          const node = this.anim.nodes[i];
          const modelNode = model.nodes.get(node.name);

          if(typeof modelNode != 'undefined'){

            this.anim._position.x = this.anim._position.y = this.anim._position.z = 0;
            this.anim._quaternion.x = this.anim._quaternion.y = this.anim._quaternion.z = 0;
            this.anim._quaternion.w = 1;
            //log.info(fl);
            node.controllers.forEach((controller: OdysseyController) => {
              modelNode.lipping = true;
              let last_frame = controller.data[last.shape];
              let next_frame = controller.data[next.shape];
              if (!last_frame) {
                last_frame = controller.data[0];
              }
              if (!next_frame) {
                next_frame = controller.data[0];
              }

              //Only interpolate keyframes if there is a previos frame and it isn't the same shape as the current
              if (last_frame) {
                switch (controller.type) {
                  case OdysseyModelControllerType.Position: {
                    const posController = modelNode.controllers.get(OdysseyModelControllerType.Position);
                    if (posController?.data[0]) {
                      this.anim._position.copy(posController.data[0] as unknown as THREE.Vector3);
                    }
                    modelNode.position.copy(last_frame as unknown as THREE.Vector3).add(this.anim._position);
                    modelNode.position.lerp(this.anim._position.clone().add(next_frame as unknown as THREE.Vector3), fl);
                    break;
                  }
                  case OdysseyModelControllerType.Orientation:
                    modelNode.quaternion.copy(last_frame as unknown as THREE.Quaternion);
                    modelNode.quaternion.slerp(this.anim._quaternion.copy(next_frame as unknown as THREE.Quaternion), fl);
                  break;
                }
                modelNode.updateMatrix();
              }

            });

          }

        }

      }

      if(this.elapsed >= this.duration){
        const mo = model.userData.moduleObject as { lipObject?: LIPObject } | undefined;
        if (mo) mo.lipObject = undefined;

        if(this.anim){
          for(let i = 0; i < this.anim.nodes.length; i++){

            const modelNode: OdysseyObject3D | undefined = model.animNodeCache[this.anim.nodes[i].name];
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
  }

  toExportBuffer(): Uint8Array {
    const writer = new BinaryWriter();

    //Write the header to the buffer
    writer.writeChars(LIPObject.FILE_TYPE);
    writer.writeChars(LIPObject.FILE_VER);
    writer.writeSingle(this.duration);
    writer.writeUInt32(this.keyframes.length);

    //Write the keyframe data to the buffer
    for (let i = 0; i < this.keyframes.length; i++) {
      const keyframe = this.keyframes[i];
      writer.writeSingle(keyframe.time);
      writer.writeByte(keyframe.shape);
    }
    return writer.buffer;
  }

  export( onComplete?: (err?: unknown) => void ){

    //this.reIndexKeyframes();

    log.info('Exporting LIP file to ', this.file);

    if(typeof this.file == 'string'){
      GameFileSystem.writeFile(this.file, this.toExportBuffer()).then( () => {
        log.info('LIP file exported to ', this.file);
        if(typeof onComplete === 'function')
          onComplete();
      }).catch( (err) => {
        log.error(err);
        if(typeof onComplete === 'function')
          onComplete(err);
      });
    }
  }

  async exportAs( _onComplete?: (err?: unknown) => void ){

    // let payload = await dialog.showSaveDialog({
    //   title: 'Export LIP',
    //   defaultPath: this.file,
    //   properties: ['createDirectory'],
    //   filters: [
    //     {name: 'LIP', extensions: ['lip']}
    //   ]
    // });

    // if(!payload.canceled && typeof payload.filePath != 'undefined'){
    //   this.file = payload.filePath;
    //   this.export(onComplete);
    // }else{
    //   log.warn('LIP export aborted');
    //   if(typeof onComplete === 'function')
    //     onComplete();
    // }

  }

  static async Load(resref: string = ''): Promise<LIPObject | undefined> {
    return new Promise<LIPObject | undefined>((resolve) => {
      ResourceLoader.loadResource(ResourceTypes['lip'] as number, resref)
        .then((buffer: Uint8Array) => resolve(new LIPObject(buffer)))
        .catch((e: unknown) => {
          log.error(e);
          resolve(undefined);
        });
    });
  }

  static GetLIPShapeLabels(): string[] {
    return [
      "ee (teeth) ",
      "eh (bet, red) ",
      "schwa (a in sofa) ",
      "ah (bat, cat) ",
      "oh (or, boat) ",
      "oo (blue) wh in wheel ",
      "y (you) ",
      "s, ts ",
      "f, v ",
      "n, ng ",
      "th ",
      "m, p, b ",
      "t, d ",
      "j, sh ",
      "l, r ",
      "k, g ",
    ];
  }

}
