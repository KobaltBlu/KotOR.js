/**
 * Unified picking helpers for selection, placement, and marquee.
 *
 * @file PickService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";
import type { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

export interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface PlacementHit {
  point: WorldPoint;
  object?: ForgeGameObject | THREE.Object3D;
  walkmesh: boolean;
}

/**
 * Pure helpers used by TabModuleEditorState / UI3DRenderer.
 * Keeps dual pick paths from diverging further.
 */
export class PickService {
  static normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): ScreenRect {
    return {
      left: Math.min(a.x, b.x),
      top: Math.min(a.y, b.y),
      right: Math.max(a.x, b.x),
      bottom: Math.max(a.y, b.y),
    };
  }

  static rectContains(rect: ScreenRect, x: number, y: number): boolean {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  /**
   * Project object world positions into NDC then screen pixels and collect
   * objects whose projected center falls inside the marquee.
   */
  static marqueeSelect(
    objects: ForgeGameObject[],
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
    rect: ScreenRect,
  ): ForgeGameObject[] {
    if (!camera || !canvas || !objects.length) {
      return [];
    }
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const vector = new THREE.Vector3();
    const hits: ForgeGameObject[] = [];
    for (const object of objects) {
      const container = (object as any).container as THREE.Object3D | undefined;
      if (!container) {
        continue;
      }
      vector.setFromMatrixPosition(container.matrixWorld);
      vector.project(camera);
      const sx = (vector.x * 0.5 + 0.5) * width;
      const sy = (-vector.y * 0.5 + 0.5) * height;
      if (vector.z < 1 && PickService.rectContains(rect, sx, sy)) {
        hits.push(object);
      }
    }
    return hits;
  }

  static resolveForgeObject(target: any): ForgeGameObject | undefined {
    if (!target) {
      return undefined;
    }
    if (target.userData?.forgeGameObject) {
      return target.userData.forgeGameObject as ForgeGameObject;
    }
    let current = target.parent;
    while (current) {
      if (current.userData?.forgeGameObject) {
        return current.userData.forgeGameObject as ForgeGameObject;
      }
      current = current.parent;
    }
    return undefined;
  }

  static isEntryMarker(target: any): boolean {
    let current = target;
    while (current) {
      if (current.userData?.moduleEntry) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}
