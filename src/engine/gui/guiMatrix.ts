import * as THREE from "three";

const _frozen = new WeakSet<THREE.Object3D>();
const _dirty = new Set<THREE.Object3D>();
let _auditCompose: THREE.Matrix4 | undefined;

function getAuditCompose(): THREE.Matrix4 {
  if (!_auditCompose) {
    _auditCompose = new THREE.Matrix4();
  }
  return _auditCompose;
}

function onChildAdded(this: THREE.Object3D, event: { child?: THREE.Object3D }): void {
  const child = event.child;
  if (child) {
    freezeGuiTree(child);
  }
}

function onAdded(this: THREE.Object3D): void {
  markGuiWorldDirty(this);
}

/**
 * Freeze a single GUI Object3D: stop auto local-matrix updates and install
 * attach hooks so newly added children freeze too.
 */
export function freezeGuiObject(obj: THREE.Object3D): void {
  if (!obj || _frozen.has(obj)) {
    return;
  }
  _frozen.add(obj);
  obj.matrixAutoUpdate = false;
  obj.updateMatrix();
  obj.addEventListener("childadded", onChildAdded);
  obj.addEventListener("added", onAdded);
}

/**
 * Freeze an entire GUI subtree (depth-first).
 */
export function freezeGuiTree(root: THREE.Object3D): void {
  if (!root) {
    return;
  }
  root.traverse((node) => {
    freezeGuiObject(node);
  });
}

/**
 * Mark a node so the next {@link flushGuiMatrices} refreshes its world matrix
 * (and descendants).
 */
export function markGuiWorldDirty(obj: THREE.Object3D): void {
  if (obj) {
    _dirty.add(obj);
  }
}

/**
 * Recompute local matrix from position/quaternion/scale and queue a world flush.
 * Call after any write to position, scale, or rotation on a frozen GUI node.
 */
export function commitGuiTransform(obj: THREE.Object3D): void {
  if (!obj) {
    return;
  }
  obj.updateMatrix();
  markGuiWorldDirty(obj);
}

/**
 * Apply pending world-matrix updates for dirty GUI roots.
 * Safe to call every frame and before RTT / movie renders.
 */
export function flushGuiMatrices(): void {
  if (_dirty.size === 0) {
    return;
  }
  for (const obj of _dirty) {
    // Force self + descendants so children that only moved via a parent
    // pick up the new world matrix. Parents are walked when their own
    // matrixWorldNeedsUpdate was set by an earlier commit.
    obj.updateWorldMatrix(true, true, true);
  }
  _dirty.clear();
}

/**
 * Debug: warn when a node's stored local matrix no longer matches its
 * position / quaternion / scale (missed {@link commitGuiTransform}).
 */
export function auditGuiMatrices(root: THREE.Object3D): void {
  if (!root) {
    return;
  }
  const compose = getAuditCompose();
  root.traverse((node) => {
    if (node.matrixAutoUpdate) {
      return;
    }
    compose.compose(node.position, node.quaternion, node.scale);
    if (!compose.equals(node.matrix)) {
      const controlName =
        (node.userData?.control as { name?: string } | undefined)?.name ??
        (node.parent?.userData?.control as { name?: string } | undefined)?.name ??
        "";
      console.warn(
        `[guiMatrix] uncommitted transform: ${node.name || node.type}` +
          (controlName ? ` (control=${controlName})` : ""),
      );
    }
  });
}

/** Test helper — number of nodes waiting for a world flush. */
export function getGuiMatrixDirtyCount(): number {
  return _dirty.size;
}

/** Test helper — clear the dirty set without flushing. */
export function clearGuiMatrixDirty(): void {
  _dirty.clear();
}
