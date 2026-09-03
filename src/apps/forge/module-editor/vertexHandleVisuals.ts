/**
 * High-contrast vertex handles for trigger/encounter geometry editing.
 * Dual-mesh silhouette stays readable on dark and light floors; always draws on top.
 *
 * @file vertexHandleVisuals.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";

export const VERTEX_HANDLE_FILL = 0xffcc33;
export const VERTEX_HANDLE_FILL_SELECTED = 0xffffff;
export const VERTEX_HANDLE_OUTLINE = 0x111111;
export const VERTEX_HANDLE_OUTLINE_SCALE = 1.35;

const FILL_NAME = "vertex-handle-fill";
const OUTLINE_NAME = "vertex-handle-outline";

function makeHandleMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * Create an always-on-top vertex handle (dark outline + bright fill).
 * Geometry is shared and not owned by the handle — do not dispose it here.
 */
export function createVertexHandle(
  geometry: THREE.BufferGeometry,
  size: number,
  meta?: { vertexIndex?: number; forgeGameObject?: unknown },
): THREE.Group {
  const group = new THREE.Group();
  group.name = "vertex-handle";
  group.scale.setScalar(size);

  const outline = new THREE.Mesh(geometry, makeHandleMaterial(VERTEX_HANDLE_OUTLINE));
  outline.name = OUTLINE_NAME;
  outline.scale.setScalar(VERTEX_HANDLE_OUTLINE_SCALE);
  outline.renderOrder = 998;

  const fill = new THREE.Mesh(geometry, makeHandleMaterial(VERTEX_HANDLE_FILL));
  fill.name = FILL_NAME;
  fill.renderOrder = 999;

  if (meta) {
    group.userData.vertexIndex = meta.vertexIndex;
    group.userData.forgeGameObject = meta.forgeGameObject;
    group.userData.vertexHandleRoot = group;
    for (const mesh of [outline, fill]) {
      mesh.userData.vertexIndex = meta.vertexIndex;
      mesh.userData.forgeGameObject = meta.forgeGameObject;
      mesh.userData.vertexHandleRoot = group;
    }
  }

  group.add(outline);
  group.add(fill);
  return group;
}

export function getVertexHandleFillMaterial(
  handle: THREE.Object3D,
): THREE.MeshBasicMaterial | undefined {
  const fill = handle.getObjectByName(FILL_NAME) as THREE.Mesh | undefined;
  return fill?.material as THREE.MeshBasicMaterial | undefined;
}

export function getVertexHandleOutlineMaterial(
  handle: THREE.Object3D,
): THREE.MeshBasicMaterial | undefined {
  const outline = handle.getObjectByName(OUTLINE_NAME) as THREE.Mesh | undefined;
  return outline?.material as THREE.MeshBasicMaterial | undefined;
}

/** Resolve a picked mesh/group to the handle root used for gizmo attach. */
export function resolveVertexHandleRoot(object: THREE.Object3D): THREE.Object3D {
  return (object.userData?.vertexHandleRoot as THREE.Object3D | undefined) || object;
}

export function setVertexHandleSelected(handle: THREE.Object3D, selected: boolean): void {
  const fill = getVertexHandleFillMaterial(handle);
  if (fill) {
    fill.color.setHex(selected ? VERTEX_HANDLE_FILL_SELECTED : VERTEX_HANDLE_FILL);
  }
}

/** Dispose per-handle materials only; shared geometry is owned by the caller. */
export function disposeVertexHandle(handle: THREE.Object3D): void {
  handle.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const material = mesh.material;
    if (Array.isArray(material)) {
      for (let i = 0; i < material.length; i++) {
        material[i].dispose();
      }
    } else if (material) {
      material.dispose();
    }
  });
  handle.removeFromParent();
}
