import { ILIPHeader } from "../interface/resource/ILIPHeader";
import { ILIPKeyFrame } from "../interface/resource/ILIPKeyFrame";
import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "./ResourceTypes";
import { OdysseyModelControllerType } from "../enums/odyssey/OdysseyModelControllerType";
import { GameFileSystem } from "../utility/GameFileSystem";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModelAnimation } from "../odyssey";

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

  constructor(file: string|Uint8Array, onComplete?: Function){
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

  readFile(onComplete?: Function){
    
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
          console.error('LIPObject', 'LIP Header Read', err);
        });
      }
    }catch(e){
      console.error('LIPObject', 'LIP Open Error', e);
      if(typeof onComplete == 'function')
        onComplete(this);
    }
  }

  readBinary(buffer: Uint8Array, onComplete?: Function){
    if(buffer instanceof Uint8Array){

      let reader = new BinaryReader(buffer);

      const fileType = reader.readChars(4);
      const fileVersion = reader.readChars(4);
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
    let keyframe: ILIPKeyFrame = {
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
                  case OdysseyModelControllerType.Position:
                    if(modelNode.controllers.get(OdysseyModelControllerType.Position)){
                      this.anim._position.copy(modelNode.controllers.get(OdysseyModelControllerType.Position).data[0] as any);
                    }
                    modelNode.position.copy(last_frame).add(this.anim._position);
                    modelNode.position.lerp(this.anim._position.add(next_frame), fl);
                  break;
                  case OdysseyModelControllerType.Orientation:
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

      if(this.elapsed >= this.duration){
        
        if(model.userData.moduleObject)
          model.userData.moduleObject.lipObject = undefined;

        if(this.anim){
          for(let i = 0; i < this.anim.nodes.length; i++){
  
            let modelNode: any = model.animNodeCache[this.anim.nodes[i].name];
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
    let writer = new BinaryWriter();

    //Write the header to the buffer
    writer.writeChars(LIPObject.FILE_TYPE);
    writer.writeChars(LIPObject.FILE_VER);
    writer.writeSingle(this.duration);
    writer.writeUInt32(this.keyframes.length);

    //Write the keyframe data to the buffer
    for (let i = 0; i < this.keyframes.length; i++) {
      let keyframe = this.keyframes[i];
      writer.writeSingle(keyframe.time);
      writer.writeByte(keyframe.shape);
    }
    return writer.buffer;
  }

  export( onComplete?: Function ){

    //this.reIndexKeyframes();

    console.log('Exporting LIP file to ', this.file);

    if(typeof this.file == 'string'){
      GameFileSystem.writeFile(this.file, this.toExportBuffer()).then( () => {
        console.log('LIP file exported to ', this.file);
        if(typeof onComplete === 'function')
          onComplete();
      }).catch( (err) => {
        console.error(err);
        if(typeof onComplete === 'function')
          onComplete(err);
      });
    }
  }

  async exportAs( onComplete?: Function ){

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
    //   console.warn('LIP export aborted');
    //   if(typeof onComplete === 'function')
    //     onComplete();
    // }

  }

  static async Load(resref: string = ''): Promise<LIPObject>{
    return new Promise<LIPObject|any>( (resolve, reject) => {
      ResourceLoader.loadResource(ResourceTypes['lip'], resref).then((buffer: Uint8Array) => {
        resolve(new LIPObject(buffer));
      }).catch( (e) => {
        console.error(e);
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
