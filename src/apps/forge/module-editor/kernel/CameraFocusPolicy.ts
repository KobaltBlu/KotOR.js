/**
 * Pure helpers for framing cameras on module-editor / UI3DRenderer scenes.
 * Excludes skyboxes, backgroundGeometry, hidden objects, and editor helpers.
 *
 * @file CameraFocusPolicy.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";

/** Default radius when an object has no mesh bounds (e.g. empty ForgeCamera container). */
export const FOCUS_FALLBACK_RADIUS = 0.75;

/** Minimum camera distance when framing a tiny selection. */
export const FOCUS_MIN_DISTANCE = 2;

export interface FocusDistanceParams {
  boxSize: THREE.Vector3;
  fovDeg: number;
  aspect: number;
  offset?: number;
  minDistance?: number;
}

export interface FocusNearFar {
  near: number;
  far: number;
}

/**
 * True when this object (and its entire subtree) should be ignored for camera framing.
 * Covers retail skyboxes (`affectedByFog === false` on OdysseyModel3D), MDL
 * `m_bIsBackgroundGeometry`, hidden subtrees, and editor helpers marked via userData.
 */
export function isExcludedFromCameraFocus(object: THREE.Object3D): boolean {
  if (!object.visible) {
    return true;
  }
  if (object.userData?.excludeFromCameraFocus === true) {
    return true;
  }

  const odysseyModel = object as THREE.Object3D & {
    affectedByFog?: boolean;
    modelHeader?: unknown;
  };
  if (
    typeof odysseyModel.affectedByFog === "boolean" &&
    odysseyModel.modelHeader != null &&
    !odysseyModel.affectedByFog
  ) {
    return true;
  }

  const meshNode = object.userData?.odysseyModelNode as
    | { backgroundGeometry?: boolean }
    | undefined;
  if (meshNode?.backgroundGeometry) {
    return true;
  }

  const mesh = object as THREE.Mesh;
  if (mesh.isMesh) {
    const material = mesh.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    if (
      materials.length > 0 &&
      materials.every((m) => {
        if (!m) return false;
        const fog = (m as THREE.Material & { fog?: boolean }).fog;
        return fog === false;
      })
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively union mesh world bounds into `box`, pruning excluded subtrees.
 */
export function expandFocusBounds(
  object: THREE.Object3D,
  box: THREE.Box3,
  scratch: THREE.Box3,
): void {
  if (isExcludedFromCameraFocus(object)) {
    return;
  }

  const mesh = object as THREE.Mesh;
  if (mesh.isMesh && mesh.geometry) {
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    if (geometry.boundingBox && !geometry.boundingBox.isEmpty()) {
      scratch.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      box.union(scratch);
    }
  }

  const children = object.children;
  for (let i = 0; i < children.length; i++) {
    expandFocusBounds(children[i], box, scratch);
  }
}

/**
 * Distance from box center so the AABB fits in the frustum, with a floor so
 * framing a single creature does not push the camera inside it.
 */
export function computeFocusDistance(params: FocusDistanceParams): number {
  const offset = params.offset ?? 1.5;
  const minDistance = params.minDistance ?? FOCUS_MIN_DISTANCE;
  const maxSize = Math.max(params.boxSize.x, params.boxSize.y, params.boxSize.z);
  if (maxSize <= 0) {
    return minDistance;
  }
  const fov = THREE.MathUtils.degToRad(params.fovDeg);
  const aspect = params.aspect > 0 ? params.aspect : 1;
  const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
  const fitWidthDistance = fitHeightDistance / aspect;
  return Math.max(minDistance, offset * Math.max(fitHeightDistance, fitWidthDistance));
}

/**
 * Clamped near/far so a tight creature frame does not clip surrounding room geometry.
 * Far floor matches UI3DRenderer.buildCamera default (1500).
 */
export function focusNearFar(distance: number): FocusNearFar {
  const near = THREE.MathUtils.clamp(distance / 100, 0.01, 1);
  const far = Math.max(distance * 100, 1500);
  return { near, far };
}
