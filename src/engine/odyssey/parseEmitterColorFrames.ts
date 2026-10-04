import * as THREE from "three";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";

/**
 * Parse emitter ColorStart / ColorMid / ColorEnd keyframes from the shared
 * controller float buffer.
 *
 * columnCount 1/3 → linear RGB with that stride.
 * Anything else → bezier (3×vec3 per key, stride 9), matching Position.
 * Header columnCount can be bogus (e.g. 19 on m05ab_11a animloop ColorMid);
 * never use it as the bezier row stride.
 */
export function parseEmitterColorFrames(
  frameCount: number,
  columnCount: number,
  timeKeyIndex: number,
  dataValueIndex: number,
  data: ArrayLike<number>
): IOdysseyControllerFrameGeneric[] {
  const frames: IOdysseyControllerFrameGeneric[] = [];
  for(let r = 0; r < frameCount; r++){
    const frame: IOdysseyControllerFrameGeneric = {
      isBezier: false,
      time: data[timeKeyIndex + r],
    } as any;

    if(columnCount == 1){
      const v = data[dataValueIndex + (r * columnCount)] || 0.0;
      frame.x = v;
      frame.y = v;
      frame.z = v;
    }else if(columnCount == 3){
      frame.x = data[dataValueIndex + (r * columnCount) + 0] || 0.0;
      frame.y = data[dataValueIndex + (r * columnCount) + 1] || 0.0;
      frame.z = data[dataValueIndex + (r * columnCount) + 2] || 0.0;
    }else{
      const rowOffset = dataValueIndex + (r * 9);
      const ax = data[rowOffset + 0] || 0.0;
      const ay = data[rowOffset + 1] || 0.0;
      const az = data[rowOffset + 2] || 0.0;
      const bx = data[rowOffset + 3] || 0.0;
      const by = data[rowOffset + 4] || 0.0;
      const bz = data[rowOffset + 5] || 0.0;
      const cx = data[rowOffset + 6] || 0.0;
      const cy = data[rowOffset + 7] || 0.0;
      const cz = data[rowOffset + 8] || 0.0;
      frame.a = new THREE.Vector3(ax, ay, az);
      frame.b = new THREE.Vector3(bx, by, bz);
      frame.c = new THREE.Vector3(cx, cy, cz);
      frame.isBezier = true;
      frame.bezier = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(ax, ay, az),
        new THREE.Vector3(ax + bx, ay + by, az + bz),
        new THREE.Vector3(ax + cx, ay + cy, az + cz)
      );
      if(!r){
        frame.bezier.v1.copy(frame.bezier.v0);
      }
      frame.x = ax;
      frame.y = ay;
      frame.z = az;
    }
    frames.push(frame);
  }
  return frames;
}
