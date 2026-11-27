import * as THREE from "three";

/**
 * Explicit world-matrix flush for GameState.scene when
 * matrixWorldAutoUpdate is disabled (GUI-style). Dirty roots are
 * refreshed once before frustum / render instead of a full scene walk.
 *
 * @file worldMatrix.ts
 */

const _dirty = new Set<THREE.Object3D>();

/**
 * Freeze a gameplay container after placement: stop per-frame local
 * matrix recomposes. Call {@link commitWorldTransform} when it moves.
 */
export function freezeWorldContainer(obj: THREE.Object3D | undefined | null): void {
  if(!obj) return;
  obj.matrixAutoUpdate = false;
  obj.updateMatrix();
  markWorldMatrixDirty(obj);
}

/**
 * Mark a node so the next {@link flushWorldMatrices} refreshes its world
 * matrix (and descendants).
 */
export function markWorldMatrixDirty(obj: THREE.Object3D | undefined | null): void {
  if(obj){
    _dirty.add(obj);
  }
}

/**
 * Recompute local matrix from position/quaternion/scale, refresh world matrix
 * immediately, and queue a descendant flush (animated leaves).
 */
export function commitWorldTransform(obj: THREE.Object3D | undefined | null): void {
  if(!obj) return;
  obj.updateMatrix();
  // Immediate world compose so locomotion Z is visible before the next
  // render-time flush (scene.matrixWorldAutoUpdate is false).
  obj.updateWorldMatrix(true, true, true);
  markWorldMatrixDirty(obj);
}

/**
 * Apply pending world-matrix updates for dirty gameplay roots.
 * Call before frustum cull and before the world composer render.
 */
export function flushWorldMatrices(): void {
  if(_dirty.size === 0) return;
  for(const obj of _dirty){
    // Ensure local matrix matches position before the world compose —
    // frozen containers skip matrixAutoUpdate inside updateWorldMatrix.
    obj.updateMatrix();
    // Force self + descendants (Three r186 third arg) so animated leaves
    // with matrixWorldNeedsUpdate pick up parent motion.
    obj.updateWorldMatrix(true, true, true);
  }
  _dirty.clear();
}

/** Test helper — number of nodes waiting for a world flush. */
export function getWorldMatrixDirtyCount(): number {
  return _dirty.size;
}

/** Test helper — clear the dirty set without flushing. */
export function clearWorldMatrixDirty(): void {
  _dirty.clear();
}
