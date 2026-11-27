import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyControllerFrameGeneric } from "@core/interface";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import type { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import { OdysseyControllerFactory } from "@engine/odyssey/controllers/OdysseyControllerFactory";
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import type { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { parseEmitterColorFrames } from "@engine/odyssey/parseEmitterColorFrames";

// Compressed orientation keys: packed uint32 as 11-bit X, 11-bit Y, 10-bit Z.
const QUAT_X_MASK = 0x07ff;
const QUAT_Y_MASK = 0x07ff;
const QUAT_Z_MASK = 0x03ff;
const QUAT_X_SCALE = Math.fround(1.0 / 1023.0);
const QUAT_Z_SCALE = Math.fround(1.0 / 511.0);
const QUAT_Y_SHIFT = 11;
const QUAT_Z_SHIFT = 22;

type Vec3Like = { x: number; y: number; z: number };

/**
 * Decodes binary controller arrays into {@link OdysseyController} maps.
 * Bezier control points are stored as plain floats; THREE curve objects are
 * allocated lazily via {@link ensureControllerFrameBezier}.
 */
export class OdysseyModelControllerDecoder {

  static readNodeControllers(
    node: OdysseyModelNode,
    odysseyModel: OdysseyModel,
    offset: number,
    count: number,
    data: Float32Array,
    data2: Uint32Array,
  ): Map<OdysseyModelControllerType, OdysseyController> {
    const pos = odysseyModel.mdlReader.position;
    odysseyModel.mdlReader.seek(offset);

    const controllers = new Map<OdysseyModelControllerType, OdysseyController>();
    for(let i = 0; i < count; i++){
      const controller: IOdysseyControllerGeneric = {
        data: []
      } as any;

      controller.type = odysseyModel.mdlReader.readInt32();
      controller.supermodelLink = odysseyModel.mdlReader.readInt16();
      controller.frameCount = odysseyModel.mdlReader.readUInt16();
      controller.timeKeyIndex = odysseyModel.mdlReader.readUInt16();
      controller.dataValueIndex = odysseyModel.mdlReader.readUInt16();
      controller.columnCount = odysseyModel.mdlReader.readByte();
      odysseyModel.mdlReader.skip(3);

      let tmpQuatX = 0;
      let tmpQuatY = 0;
      let tmpQuatZ = 0;
      let tmpQuatW = 1;

      // Animation nodes reuse geometry names; prefer the geometry node's type so
      // controller column layouts match the mesh. Do NOT copy onto geometry nodes —
      // duplicate names (e.g. c_jawa skin "lhand" then hook "lhand") would corrupt
      // the later node's type into Skin/Mesh and break hooks / ASCII export.
      controller.nodeType = node.nodeType;
      if(node.isAnimationControllerNode && odysseyModel.nodes.has(node.name)){
        const geo = odysseyModel.nodes.get(node.name);
        if(geo){
          controller.nodeType = node.nodeType = geo.nodeType;
        }
      }

      if(controller.frameCount != -1){

        //Default Controllers
        switch(controller.type){
          case OdysseyModelControllerType.Position:
            for (let r = 0; r < controller.frameCount; r++) {
              const frame: IOdysseyControllerFrameGeneric = {
                isBezier: false,
                time: data[controller.timeKeyIndex + r]
              } as any;

              const vec3: Vec3Like = {x: 0, y: 0, z: 0};

              if(controller.columnCount == 1){
                vec3.x = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                vec3.y = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                vec3.z = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
              }else if(controller.columnCount == 3){
                vec3.x = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                vec3.y = data[controller.dataValueIndex + (r * controller.columnCount) + 1] || 0.0;
                vec3.z = data[controller.dataValueIndex + (r * controller.columnCount) + 2] || 0.0;
              }else{
                // Bezier: 3×vec3 packed end-to-end; B/C relative to A.
                const rowOffset = controller.dataValueIndex + (r * 9);
                const ax = data[rowOffset + 0] || 0.0;
                const ay = data[rowOffset + 1] || 0.0;
                const az = data[rowOffset + 2] || 0.0;
                const bx = data[rowOffset + 3] || 0.0;
                const by = data[rowOffset + 4] || 0.0;
                const bz = data[rowOffset + 5] || 0.0;
                const cx = data[rowOffset + 6] || 0.0;
                const cy = data[rowOffset + 7] || 0.0;
                const cz = data[rowOffset + 8] || 0.0;

                frame.a = { x: ax, y: ay, z: az } as any;
                frame.b = { x: bx, y: by, z: bz } as any;
                frame.c = { x: cx, y: cy, z: cz } as any;
                frame.isBezier = true;
                // First keyframe: mid control matches start (stable camera paths).
                frame.bezierMidEqualsStart = !r;

                vec3.x = ax;
                vec3.y = ay;
                vec3.z = az;
              }

              frame.x = vec3.x;
              frame.y = vec3.y;
              frame.z = vec3.z;

              controller.data[r] = frame;
            }
          break;
          case OdysseyModelControllerType.Orientation:
            for (let r = 0; r < controller.frameCount; r++) {
              const frame: IOdysseyControllerFrameGeneric = {} as any;
              frame.time = data[controller.timeKeyIndex + r];

              if(controller.columnCount == 2){
                const temp = data2[controller.dataValueIndex + r] >>> 0;

                const x = ((temp & QUAT_X_MASK) * QUAT_X_SCALE) - 1.0;
                const y = (((temp >> QUAT_Y_SHIFT) & QUAT_Y_MASK) * QUAT_X_SCALE) - 1.0;
                const z = (((temp >> QUAT_Z_SHIFT) & QUAT_Z_MASK) * QUAT_Z_SCALE) - 1.0;
                const fSquares = x * x + y * y + z * z;

                if(fSquares <= 1.0){
                  tmpQuatX = x;
                  tmpQuatY = y;
                  tmpQuatZ = z;
                  tmpQuatW = Math.sqrt(1.0 - fSquares);
                }else{
                  const invLength = 1.0 / Math.sqrt(fSquares);
                  tmpQuatX = x * invLength;
                  tmpQuatY = y * invLength;
                  tmpQuatZ = z * invLength;
                  tmpQuatW = 0;
                }
              }else{
                tmpQuatX = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                tmpQuatY = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
                tmpQuatZ = data[controller.dataValueIndex + (r * controller.columnCount) + 2];
                tmpQuatW = data[controller.dataValueIndex + (r * controller.columnCount) + 3];
              }

              frame.x = tmpQuatX;
              frame.y = tmpQuatY;
              frame.z = tmpQuatZ;
              frame.w = tmpQuatW;

              controller.data[r] = frame;
            }
          break;
          case OdysseyModelControllerType.Scale:
            for (let r = 0; r < controller.frameCount; r++) {
              const frame: IOdysseyControllerFrameGeneric = {} as any;
              frame.time = data[controller.timeKeyIndex + r];
              frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
              controller.data[r] = frame;
            }
          break;
        }

        //Mesh Controllers
        if ((node.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
          switch(controller.type){
            case OdysseyModelControllerType.Alpha:
              for (let r = 0; r < controller.frameCount; r++) {
                const frame: IOdysseyControllerFrameGeneric = {} as any;
                frame.time = data[controller.timeKeyIndex + r];
                frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                controller.data[r] = frame;
              }
            break;
            case OdysseyModelControllerType.SelfIllumColor:
              for (let r = 0; r < controller.frameCount; r++) {
                const frame: IOdysseyControllerFrameGeneric = {} as any;

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
        if ((node.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
          switch(controller.type){
            case OdysseyModelControllerType.Color:
              for (let r = 0; r < controller.frameCount; r++) {
                const frame: IOdysseyControllerFrameGeneric = {} as any;
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
                const frame: IOdysseyControllerFrameGeneric = {} as any;
                frame.time = data[controller.timeKeyIndex + r];
                frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                controller.data[r] = frame
              }
            break;
          }
        }

        //Emitter Controllers
        if ((node.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
          switch(controller.type){
            case OdysseyModelControllerType.ColorStart:
            case OdysseyModelControllerType.ColorMid:
            case OdysseyModelControllerType.ColorEnd:
              controller.data = parseEmitterColorFrames(
                controller.frameCount,
                controller.columnCount,
                controller.timeKeyIndex,
                controller.dataValueIndex,
                data
              );
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
            case OdysseyModelControllerType.TargetSize:
            case OdysseyModelControllerType.ControlPTCount:
            case OdysseyModelControllerType.ControlPTRadius:
            case OdysseyModelControllerType.ControlPTDelay:
            case OdysseyModelControllerType.TangentSpread:
            case OdysseyModelControllerType.TangentLength:
              for (let r = 0; r < controller.frameCount; r++) {
                const frame: IOdysseyControllerFrameGeneric = {} as any;
                frame.time = data[controller.timeKeyIndex + r];
                frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                controller.data[r] = frame
              }
            break;
          }
        }

        if(controller.data.length)
          controller.data[controller.data.length-1].lastFrame = true;

        controllers.set(controller.type, OdysseyControllerFactory.From(controller));
      }
    }

    odysseyModel.mdlReader.seek(pos);
    return controllers;
  }

}
