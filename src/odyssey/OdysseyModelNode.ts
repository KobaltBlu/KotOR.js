import * as THREE from "three";
import { OdysseyModelControllerType } from "../enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import { OdysseyModel } from "./OdysseyModel";
import { OdysseyModelAnimationNode } from "./OdysseyModelAnimationNode";
import { type OdysseyController } from "./controllers/OdysseyController";
import { OdysseyControllerFactory } from "./controllers/OdysseyControllerFactory";
import { IOdysseyArrayDefinition } from "../interface/odyssey/IOdysseyArrayDefinition";
import { OdysseyModelUtility } from "./OdysseyModelUtility";

/**
 * OdysseyModelNode class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNode {
  uuid: string = crypto.randomUUID();
  parent: OdysseyModelNode;
  type: OdysseyModelNodeType;
  nodeType: OdysseyModelNodeType;
  odysseyModel: OdysseyModel;
  children: OdysseyModelNode[] = [];
  childOffsets: number[] = [];
  controllers: Map<OdysseyModelControllerType, OdysseyController> = new Map();

  roomStatic: boolean = true;
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  quaternion: THREE.Quaternion = new THREE.Quaternion(0, 0, 0, 1);
  supernode: number;
  nodePosition: number;
  name: string;
  padding: number;
  offsetToRoot: number;
  offsetToParent: number;
  childArrayDefinition: IOdysseyArrayDefinition;
  controllerArrayDefinition: IOdysseyArrayDefinition;
  controllerDataArrayDefinition: IOdysseyArrayDefinition;

  constructor(parent: OdysseyModelNode){
    this.parent = parent;
    this.type = OdysseyModelNodeType.Header;
  }

  setParent(parent: OdysseyModelNode){
    this.parent = parent;
  }

  setType(type: OdysseyModelNodeType){
    this.nodeType = type;
    this.type = type;
  }

  add(node: OdysseyModelNode){
    this.children.push(node);
  }

  addController(controller: OdysseyController){

  }

  getControllerByType(type = -1){
    return this.controllers.get(type);
  }

  readBinary(odysseyModel: OdysseyModel){
    this.odysseyModel = odysseyModel;

    this.nodeType = this.odysseyModel.mdlReader.readUInt16();  

    this.supernode = this.odysseyModel.mdlReader.readUInt16();
    this.nodePosition = this.odysseyModel.mdlReader.readUInt16();
    this.padding = this.odysseyModel.mdlReader.readUInt16();
    this.offsetToRoot = this.odysseyModel.mdlReader.readUInt32();
    this.offsetToParent = this.odysseyModel.mdlReader.readUInt32();

    if (this.nodePosition < this.odysseyModel.names.length){
      this.name = this.odysseyModel.names[this.nodePosition].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }else{
      this.name = '';
    }

    if(!this.odysseyModel.nodes.has(this.name))
      this.odysseyModel.nodes.set(this.name, this);

    //Non static objects in room meshes are children of the node that is the name of the model plus a
    //like: MODELNAMEa or m02ac_02ba

    if(this.parent){
      if(this.name == (this.odysseyModel.geometryHeader.modelName.trim()+'a').toLowerCase()){
        this.roomStatic = false;
      }else{
        this.roomStatic = this.parent.roomStatic;
      }
    }

    //Node Position
    this.position.x = this.odysseyModel.mdlReader.readSingle();
    this.position.y = this.odysseyModel.mdlReader.readSingle();
    this.position.z = this.odysseyModel.mdlReader.readSingle();

    //Node Quaternion
    this.quaternion.w = this.odysseyModel.mdlReader.readSingle();
    this.quaternion.x = this.odysseyModel.mdlReader.readSingle();
    this.quaternion.y = this.odysseyModel.mdlReader.readSingle();
    this.quaternion.z = this.odysseyModel.mdlReader.readSingle();

    //Node Children
    this.childArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.childOffsets = OdysseyModelUtility.ReadArray(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.childArrayDefinition.offset, this.childArrayDefinition.count);

    //Node Controllers
    this.controllerArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.controllerDataArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    let controllerData = OdysseyModelUtility.ReadArrayFloats(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.controllerDataArrayDefinition.offset, this.controllerDataArrayDefinition.count);
    let controllerData2 = OdysseyModelUtility.ReadArray(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.controllerDataArrayDefinition.offset, this.controllerDataArrayDefinition.count);

    this.controllers = this.readBinaryNodeControllers(this.odysseyModel.fileHeader.modelDataOffset + this.controllerArrayDefinition.offset, this.controllerArrayDefinition.count, controllerData, controllerData2);
  }

  readBinaryNodeControllers(offset: number, count: number, data: any[], data2: any[]){
    let pos = this.odysseyModel.mdlReader.position;
    this.odysseyModel.mdlReader.seek(offset);

    let controllers = new Map();
    for(let i = 0; i < count; i++){

      let controller: any = {
        data: []
      };

      controller.type = this.odysseyModel.mdlReader.readInt32();
      this.odysseyModel.mdlReader.skip(2); //controller.unk_keyflag = this.odysseyModel.mdlReader.readInt16();
      controller.frameCount = this.odysseyModel.mdlReader.readUInt16();
      controller.timeKeyIndex = this.odysseyModel.mdlReader.readUInt16(); //Index into the float array of the first time key
      controller.dataValueIndex = this.odysseyModel.mdlReader.readUInt16(); //Index into the float array of the first controller data value
      controller.columnCount = this.odysseyModel.mdlReader.readByte();//Number of columns excluding the time key column
      this.odysseyModel.mdlReader.skip(3); //Skip unused padding
      
      let tmpQuat = new THREE.Quaternion();

      if(this.odysseyModel.nodes.has(this.name)){
        controller.nodeType = this.nodeType = this.odysseyModel.nodes.get(this.name).nodeType;
      }
    
      if(controller.frameCount != -1){

        if(this instanceof OdysseyModelAnimationNode || this instanceof OdysseyModelNode){

          //Default Controllers
          switch(controller.type){
            case OdysseyModelControllerType.Position:
              for (let r = 0; r < controller.frameCount; r++) {
                let frame: any = {
                  isBezier: false,
                  time: data[controller.timeKeyIndex + r]
                };

                let vec3 = {x: 0, y: 0, z: 0};

                if(controller.columnCount == 1){
                  vec3.x = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                  vec3.y = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                  vec3.z = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                }else if(controller.columnCount == 3){
                  vec3.x = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                  vec3.y = data[controller.dataValueIndex + (r * controller.columnCount) + 1] || 0.0;
                  vec3.z = data[controller.dataValueIndex + (r * controller.columnCount) + 2] || 0.0;
                }else{
                  //This is a bezier curve this controller contains 3 vector3's packed end to end:
                  //pointA: x1,y1,z1 | pointB: x2,y2,z2 | pointC: x3,y3,z3
                  //pointB and pointC are relative to pointA
                  //console.log('bezier', this.name, controller);
                  let rowOffset = controller.dataValueIndex + (r * 9);

                  frame.a = new THREE.Vector3(
                    data[rowOffset + 0] || 0.0,
                    data[rowOffset + 1] || 0.0,
                    data[rowOffset + 2] || 0.0
                  );

                  frame.b = new THREE.Vector3(
                    data[rowOffset + 3] || 0.0,
                    data[rowOffset + 4] || 0.0,
                    data[rowOffset + 5] || 0.0
                  );

                  frame.c = new THREE.Vector3(
                    data[rowOffset + 6] || 0.0,
                    data[rowOffset + 7] || 0.0,
                    data[rowOffset + 8] || 0.0
                  );

                  frame.isBezier = true;
                  frame.bezier = new THREE.QuadraticBezierCurve3(
                    //POINT A
                    new THREE.Vector3(
                      data[rowOffset + 0] || 0.0,
                      data[rowOffset + 1] || 0.0,
                      data[rowOffset + 2] || 0.0
                    ),
                    //POINT B
                    new THREE.Vector3(
                      (data[rowOffset + 0] + data[rowOffset + 3]) || 0.0,
                      (data[rowOffset + 1] + data[rowOffset + 4]) || 0.0,
                      (data[rowOffset + 2] + data[rowOffset + 5]) || 0.0
                    ),
                    //POINT C
                    new THREE.Vector3(
                      (data[rowOffset + 0] + data[rowOffset + 6]) || 0.0,
                      (data[rowOffset + 1] + data[rowOffset + 7]) || 0.0,
                      (data[rowOffset + 2] + data[rowOffset + 8]) || 0.0
                    )
                  );
                  
                  //If this is the first frame ignore the control point at v1 by copying the values from v0
                  //This appears to fix the problem I was having with the camera going off the rails at times
                  //This also appears to make all the isLinearBezier checks I was doing before unnecessary
                  //Further testing is needed before I can be sure isLinearBezier can be removed from the AnimationManager as well
                  if(!r){
                    frame.bezier.v1.copy(frame.bezier.v0);
                  }

                  /*frame.isLinearBezier = (frame.bezier.v0.x.toFixed(6) == frame.bezier.v2.x.toFixed(6) && frame.bezier.v0.y.toFixed(6) == frame.bezier.v2.y.toFixed(6));

                  if(frame.isLinearBezier){
                    frame.bezier.v1.copy(frame.bezier.v0).add(frame.bezier.v2).multiplyScalar(0.5);
                  }else if(frame.bezier.v0.length() - frame.bezier.v1.length() < 0.01){
                    frame.isLinearBezier = true;
                    frame.bezier.v1.copy(frame.bezier.v0).add(frame.bezier.v2).multiplyScalar(0.5);
                  }*/

                  vec3.x = data[rowOffset + 0] || 0.0;
                  vec3.y = data[rowOffset + 1] || 0.0;
                  vec3.z = data[rowOffset + 2] || 0.0;

                }
    
                frame.x = vec3.x;
                frame.y = vec3.y;
                frame.z = vec3.z;
    
                controller.data[r] = (frame);
              }
            break;
            case OdysseyModelControllerType.Orientation:
              for (let r = 0; r < controller.frameCount; r++) {
                let frame: any = {};
                frame.time = data[controller.timeKeyIndex + r];

                if(controller.columnCount == 2){
                  let temp = data2[controller.dataValueIndex + r];
                  let original = data[controller.dataValueIndex + r];
                  
                  let x, y, z, w = 0;

                  if(isNaN(temp)){
                    temp = 0;
                  }

                  //@ts-expect-error
                  x = (parseInt(temp & 0x07ff) / 1023.0) - 1.0;
                  //@ts-expect-error
                  y = (parseInt((temp >> 11) & 0x07ff) / 1023.0) - 1.0;
                  //@ts-expect-error
                  z = (parseInt((temp >> 22) & 0x3FF) / 511.0) - 1.0;

                  let fSquares =  (Math.pow(x, 2.0) + Math.pow(y, 2.0) + Math.pow(z, 2.0));

                  if(fSquares < 1.0){
                    w = Math.sqrt(1.0 - fSquares);
                    tmpQuat.set(x, y, z, w);
                  } else {
                    tmpQuat.set(x, y, z, 0);
                  }

                }else{
                  tmpQuat.set(
                    data[controller.dataValueIndex + (r * controller.columnCount) + 0],
                    data[controller.dataValueIndex + (r * controller.columnCount) + 1],
                    data[controller.dataValueIndex + (r * controller.columnCount) + 2],
                    data[controller.dataValueIndex + (r * controller.columnCount) + 3]
                  );

                }

                tmpQuat.normalize();
    
                frame.x = tmpQuat.x;
                frame.y = tmpQuat.y;
                frame.z = tmpQuat.z;
                frame.w = tmpQuat.w;
    
                controller.data[r] = frame;
              }
            break;
            case OdysseyModelControllerType.Scale:
              for (let r = 0; r < controller.frameCount; r++) {
                let frame: any = {};
                frame.time = data[controller.timeKeyIndex + r];
                frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                controller.data[r] = frame;
              }
            break;
          }

          //Mesh Controllers
          if ((this.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
            switch(controller.type){
              case OdysseyModelControllerType.Alpha:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame: any = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                  controller.data[r] = frame;
                }
              break;
              case OdysseyModelControllerType.SelfIllumColor:
                for (let r = 0; r < controller.frameCount; r++) {
      
                  let frame: any = {};
      
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.x = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                  frame.y = data[controller.dataValueIndex + (r * controller.columnCount) + 1] || 0.0;
                  frame.z = data[controller.dataValueIndex + (r * controller.columnCount) + 2] || 0.0;
      
                  controller.data[r] = frame;
                }
              break;
            }
          }

          //Light Controllers
          if ((this.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
            switch(controller.type){
              case OdysseyModelControllerType.Color:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame: any = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.x = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  frame.y = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
                  frame.z = data[controller.dataValueIndex + (r * controller.columnCount) + 2];

                  if(frame.x < 0) frame.x = 1.0 + frame.x;
                  if(frame.y < 0) frame.y = 1.0 + frame.y;
                  if(frame.z < 0) frame.z = 1.0 + frame.z;

                  controller.data[r] = frame
                }
              break;
              case OdysseyModelControllerType.ShadowRadius:
              case OdysseyModelControllerType.Radius:
              case OdysseyModelControllerType.VerticalDisplacement:
              case OdysseyModelControllerType.Multiplier:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame: any = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  controller.data[r] = frame
                }
              break;
            }
          }

          //Emitter Controllers
          if ((this.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
            switch(controller.type){
              //case OdysseyModelControllerType.P2P_Bezier3:
              case OdysseyModelControllerType.ColorStart:
              case OdysseyModelControllerType.ColorMid:
              case OdysseyModelControllerType.ColorEnd:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame: any = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.x = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  frame.y = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
                  frame.z = data[controller.dataValueIndex + (r * controller.columnCount) + 2];
                  controller.data[r] = frame
                }
              break;
              case OdysseyModelControllerType.LifeExp:
              case OdysseyModelControllerType.BirthRate:
              case OdysseyModelControllerType.RandomBirthRate:
              case OdysseyModelControllerType.Bounce_Co:
              case OdysseyModelControllerType.Drag:
              case OdysseyModelControllerType.Gravity:
              case OdysseyModelControllerType.FPS:
              case OdysseyModelControllerType.Detonate:
              case OdysseyModelControllerType.CombineTime:
              case OdysseyModelControllerType.Spread:
              case OdysseyModelControllerType.Velocity:
              case OdysseyModelControllerType.RandomVelocity:
              case OdysseyModelControllerType.Mass:
              case OdysseyModelControllerType.ParticleRot:
              case OdysseyModelControllerType.SizeStart:
              case OdysseyModelControllerType.SizeMid:
              case OdysseyModelControllerType.SizeEnd:
              case OdysseyModelControllerType.SizeStart_Y:
              case OdysseyModelControllerType.SizeMid_Y:
              case OdysseyModelControllerType.SizeEnd_Y:
              case OdysseyModelControllerType.LightningDelay:
              case OdysseyModelControllerType.LightningRadius:
              case OdysseyModelControllerType.LightningScale:
              case OdysseyModelControllerType.LightningZigZag:
              case OdysseyModelControllerType.LightningSubDiv:
              case OdysseyModelControllerType.P2P_Bezier2:
              case OdysseyModelControllerType.P2P_Bezier3:
              case OdysseyModelControllerType.AlphaStart:
              case OdysseyModelControllerType.AlphaMid:
              case OdysseyModelControllerType.AlphaEnd:
              case OdysseyModelControllerType.PercentStart:
              case OdysseyModelControllerType.PercentMid:
              case OdysseyModelControllerType.PercentEnd:
              case OdysseyModelControllerType.Threshold:
              case OdysseyModelControllerType.XSize:
              case OdysseyModelControllerType.YSize:
              case OdysseyModelControllerType.FrameStart:
              case OdysseyModelControllerType.FrameEnd:
              case OdysseyModelControllerType.BlurLength:
                // --------------------- //
              case OdysseyModelControllerType.TargetSize:
              case OdysseyModelControllerType.ControlPTCount:
              case OdysseyModelControllerType.ControlPTRadius:
              case OdysseyModelControllerType.ControlPTDelay:
              case OdysseyModelControllerType.TangentSpread:
              case OdysseyModelControllerType.TangentLength:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame: any = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  controller.data[r] = frame
                }
              break;
            }
          }

        }

        if(controller.data.length)
          controller.data[controller.data.length-1].lastFrame = true;

        // controller = OdysseyController.From(controller);
        controller =OdysseyControllerFactory.From(controller);
        controllers.set(controller.type, controller as OdysseyController);
        
      }

    }

    this.odysseyModel.mdlReader.seek(pos);
    return controllers;
  }

}
