import * as THREE from 'three';
import type { Vec2, Vec3 } from '@core/types/vec';
import { Utility } from '@core/utility/Utility';

/**
 * THREE-aware distance / line helpers formerly on core Utility.
 */
export class UtilityThree {
  static Distance2DSquared(v0: Vec2 | Vec3 | THREE.Vector2 | THREE.Vector3, v1: Vec2 | Vec3 | THREE.Vector2 | THREE.Vector3) {
    return Utility.Distance2DSquared(v0, v1);
  }

  static Distance2D(v0: Vec2 | Vec3 | THREE.Vector2 | THREE.Vector3, v1: Vec2 | Vec3 | THREE.Vector2 | THREE.Vector3) {
    return Utility.Distance2D(v0, v1);
  }

  static THREELineLineIntersection(a: THREE.Line3, b: THREE.Line3) {
    return Utility.LineLineIntersection(
      a.start.x, a.start.y, a.end.x, a.end.y,
      b.start.x, b.start.y, b.end.x, b.end.y
    );
  }
}
