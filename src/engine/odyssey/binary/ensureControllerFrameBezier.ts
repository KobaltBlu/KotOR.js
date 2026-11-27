import * as THREE from "three";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";

type Vec3Like = { x: number; y: number; z: number };

/**
 * Lazily allocate THREE Vector3 / QuadraticBezierCurve3 for a bezier keyframe.
 * Binary parse stores plain `{x,y,z}` control points; animation consumers call this first.
 */
export function ensureControllerFrameBezier(frame: IOdysseyControllerFrameGeneric): void {
  if (!frame?.isBezier || frame.bezier) {
    return;
  }

  const a = frame.a as Vec3Like;
  const b = frame.b as Vec3Like;
  const c = frame.c as Vec3Like;
  if (!a || !b || !c) {
    return;
  }

  const ax = a.x || 0;
  const ay = a.y || 0;
  const az = a.z || 0;
  const bx = b.x || 0;
  const by = b.y || 0;
  const bz = b.z || 0;
  const cx = c.x || 0;
  const cy = c.y || 0;
  const cz = c.z || 0;

  // Keep a/b/c as Vector3 for ASCII export / callers that expect .x/.y/.z on Vector3.
  frame.a = new THREE.Vector3(ax, ay, az);
  frame.b = new THREE.Vector3(bx, by, bz);
  frame.c = new THREE.Vector3(cx, cy, cz);

  const v0 = new THREE.Vector3(ax, ay, az);
  const v1 = frame.bezierMidEqualsStart
    ? v0.clone()
    : new THREE.Vector3(ax + bx, ay + by, az + bz);
  const v2 = new THREE.Vector3(ax + cx, ay + cy, az + cz);
  frame.bezier = new THREE.QuadraticBezierCurve3(v0, v1, v2);
}
