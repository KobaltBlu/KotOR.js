/**
 * Always-on inverted-hull outlines for module-editor dynamic GIT objects.
 * Idle = subtle; selected = much stronger. Rooms are excluded.
 *
 * @file SelectionHighlightService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";
import type { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";

export const HIGHLIGHT_IDLE_COLOR = 0x44aaff;
export const HIGHLIGHT_SELECTED_COLOR = 0xffee66;
export const HIGHLIGHT_IDLE_OPACITY = 0.35;
export const HIGHLIGHT_SELECTED_OPACITY = 0.85;
export const HIGHLIGHT_IDLE_SCALE = 1.035;
export const HIGHLIGHT_SELECTED_SCALE = 1.075;

const OUTLINE_NAME = "selection-outline";

interface OutlineEntry {
  meshes: THREE.Mesh[];
  selected: boolean;
}

function isOutlineSourceMesh(node: THREE.Object3D): node is THREE.Mesh {
  const mesh = node as THREE.Mesh;
  if (!mesh.isMesh) {
    return false;
  }
  if (mesh.userData?.selectionOutline) {
    return false;
  }
  if (mesh.userData?.vertexIndex !== undefined) {
    return false;
  }
  if (mesh.userData?.wok) {
    return false;
  }
  if (mesh.userData?.vertexHandleRoot) {
    return false;
  }
  return !!mesh.geometry;
}

function makeOutlineMaterial(selected: boolean): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: selected ? HIGHLIGHT_SELECTED_COLOR : HIGHLIGHT_IDLE_COLOR,
    side: THREE.BackSide,
    transparent: true,
    opacity: selected ? HIGHLIGHT_SELECTED_OPACITY : HIGHLIGHT_IDLE_OPACITY,
    depthWrite: false,
    toneMapped: false,
  });
}

function applyStrength(mesh: THREE.Mesh, selected: boolean): void {
  const scale = selected ? HIGHLIGHT_SELECTED_SCALE : HIGHLIGHT_IDLE_SCALE;
  mesh.scale.setScalar(scale);
  const material = mesh.material as THREE.MeshBasicMaterial;
  material.color.setHex(selected ? HIGHLIGHT_SELECTED_COLOR : HIGHLIGHT_IDLE_COLOR);
  material.opacity = selected ? HIGHLIGHT_SELECTED_OPACITY : HIGHLIGHT_IDLE_OPACITY;
  material.needsUpdate = true;
}

/** True for GIT instance types that should show highlights (not rooms). */
export function isHighlightableGameObject(object: ForgeGameObject | undefined | null): boolean {
  return !!object && !(object instanceof ForgeRoom);
}

export class SelectionHighlightService {
  private entries = new Map<ForgeGameObject, OutlineEntry>();

  attach(object: ForgeGameObject): void {
    if (!isHighlightableGameObject(object)) {
      return;
    }
    this.detach(object);

    const meshes: THREE.Mesh[] = [];
    // Snapshot sources first so adding outline children does not affect traversal.
    const sources: THREE.Mesh[] = [];
    object.container.traverse((node) => {
      if (isOutlineSourceMesh(node)) {
        sources.push(node);
      }
    });

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const outline = new THREE.Mesh(source.geometry, makeOutlineMaterial(false));
      outline.name = OUTLINE_NAME;
      outline.userData.selectionOutline = true;
      outline.raycast = () => {};
      outline.renderOrder = (source.renderOrder || 0) + 1;
      outline.scale.setScalar(HIGHLIGHT_IDLE_SCALE);
      source.add(outline);
      meshes.push(outline);
    }

    this.entries.set(object, { meshes, selected: false });
  }

  refresh(object: ForgeGameObject): void {
    if (!isHighlightableGameObject(object)) {
      return;
    }
    const wasSelected = this.entries.get(object)?.selected === true;
    this.attach(object);
    if (wasSelected) {
      this.setObjectSelected(object, true);
    }
  }

  detach(object: ForgeGameObject): void {
    const entry = this.entries.get(object);
    if (!entry) {
      return;
    }
    for (const mesh of entry.meshes) {
      mesh.removeFromParent();
      const material = mesh.material;
      if (Array.isArray(material)) {
        for (let i = 0; i < material.length; i++) {
          material[i].dispose();
        }
      } else {
        material.dispose();
      }
      // Geometry is shared with the source mesh — do not dispose.
    }
    this.entries.delete(object);
  }

  clear(): void {
    const objects = Array.from(this.entries.keys());
    for (const object of objects) {
      this.detach(object);
    }
  }

  setSelected(objects: readonly ForgeGameObject[]): void {
    const selected = new Set(objects.filter(isHighlightableGameObject));
    for (const [object, entry] of this.entries) {
      const next = selected.has(object);
      if (entry.selected === next) {
        continue;
      }
      entry.selected = next;
      for (const mesh of entry.meshes) {
        applyStrength(mesh, next);
      }
    }
  }

  setObjectSelected(object: ForgeGameObject, selected: boolean): void {
    const entry = this.entries.get(object);
    if (!entry || entry.selected === selected) {
      return;
    }
    entry.selected = selected;
    for (const mesh of entry.meshes) {
      applyStrength(mesh, selected);
    }
  }

  has(object: ForgeGameObject): boolean {
    return this.entries.has(object);
  }

  getMeshCount(object: ForgeGameObject): number {
    return this.entries.get(object)?.meshes.length ?? 0;
  }

  /** Attach outlines for every highlightable instance currently on the area. */
  attachAllFromArea(area: {
    creatures?: ForgeGameObject[];
    doors?: ForgeGameObject[];
    placeables?: ForgeGameObject[];
    items?: ForgeGameObject[];
    triggers?: ForgeGameObject[];
    encounters?: ForgeGameObject[];
    waypoints?: ForgeGameObject[];
    sounds?: ForgeGameObject[];
    stores?: ForgeGameObject[];
    cameras?: ForgeGameObject[];
  } | undefined | null): void {
    if (!area) {
      return;
    }
    const lists = [
      area.creatures,
      area.doors,
      area.placeables,
      area.items,
      area.triggers,
      area.encounters,
      area.waypoints,
      area.sounds,
      area.stores,
      area.cameras,
    ];
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      if (!list) {
        continue;
      }
      for (let j = 0; j < list.length; j++) {
        this.attach(list[j]);
      }
    }
  }
}
