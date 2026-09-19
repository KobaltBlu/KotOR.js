import * as THREE from "three";
import type { WindManager } from "@/managers/WindManager";
import type { OdysseyModelNodeDangly } from "@/odyssey/OdysseyModelNodeDangly";
import type { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";

export interface DanglyGroupParams {
  vertexStart: number;
  vertexCount: number;
  displacement: number;
  tightness: number;
  period: number;
}

export interface DanglySimState {
  rest: Float32Array;
  pos: Float32Array;
  vel: Float32Array;
  constraints: Float32Array;
  displacement: Float32Array;
  tightness: Float32Array;
  period: Float32Array;
  lastWorldPos: THREE.Vector3;
  lastWorldQuat: THREE.Quaternion;
  initialized: boolean;
}

const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _worldWind = new THREE.Vector3();
const _localWind = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();
const _deltaQuat = new THREE.Quaternion();
const _scratch = new THREE.Vector3();
const _parentDelta = new THREE.Vector3();

function clampToRest(rest: number, value: number, limit: number): number {
  if (value > rest + limit) return rest + limit;
  if (value < rest - limit) return rest - limit;
  return value;
}

function resetSimToRest(sim: DanglySimState): void {
  sim.pos.set(sim.rest);
  sim.vel.fill(0);
}

function writeOffsets(mesh: THREE.Mesh, sim: DanglySimState): void {
  const attr = mesh.geometry.getAttribute("danglyOffset") as THREE.BufferAttribute;
  if (!attr) return;

  const offsets = attr.array as Float32Array;
  const n = sim.constraints.length;
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    offsets[i3] = sim.pos[i3] - sim.rest[i3];
    offsets[i3 + 1] = sim.pos[i3 + 1] - sim.rest[i3 + 1];
    offsets[i3 + 2] = sim.pos[i3 + 2] - sim.rest[i3 + 2];
  }
  attr.needsUpdate = true;
}

function fillPerVertexParams(
  sim: DanglySimState,
  vertexCount: number,
  displacement: number,
  tightness: number,
  period: number,
  vertexStart = 0
): void {
  for (let i = vertexStart; i < vertexStart + vertexCount; i++) {
    sim.displacement[i] = displacement;
    sim.tightness[i] = tightness;
    sim.period[i] = period;
  }
}

function initSimFromGeometry(
  mesh: THREE.Mesh,
  vertexStart: number,
  vertexCount: number,
  displacement: number,
  tightness: number,
  period: number,
  existing?: DanglySimState
): DanglySimState {
  const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const constraintAttr = mesh.geometry.getAttribute("constraint") as THREE.BufferAttribute;
  if (!posAttr || !constraintAttr) {
    throw new Error("Dangly mesh missing position or constraint attributes");
  }

  const total = posAttr.count;
  const sim =
    existing ??
    ({
      rest: new Float32Array(total * 3),
      pos: new Float32Array(total * 3),
      vel: new Float32Array(total * 3),
      constraints: new Float32Array(total),
      displacement: new Float32Array(total),
      tightness: new Float32Array(total),
      period: new Float32Array(total),
      lastWorldPos: new THREE.Vector3(),
      lastWorldQuat: new THREE.Quaternion(),
      initialized: false,
    } as DanglySimState);

  for (let i = vertexStart; i < vertexStart + vertexCount; i++) {
    const i3 = i * 3;
    sim.rest[i3] = posAttr.getX(i);
    sim.rest[i3 + 1] = posAttr.getY(i);
    sim.rest[i3 + 2] = posAttr.getZ(i);
    sim.pos[i3] = sim.rest[i3];
    sim.pos[i3 + 1] = sim.rest[i3 + 1];
    sim.pos[i3 + 2] = sim.rest[i3 + 2];
    sim.vel[i3] = 0;
    sim.vel[i3 + 1] = 0;
    sim.vel[i3 + 2] = 0;
    sim.constraints[i] = constraintAttr.getW(i);
  }

  fillPerVertexParams(sim, vertexCount, displacement, tightness, period, vertexStart);
  return sim;
}

export function initDanglyWindMesh(mesh: THREE.Mesh, node: OdysseyModelNodeDangly): void {
  const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!posAttr) return;

  const sim = initSimFromGeometry(
    mesh,
    0,
    posAttr.count,
    node.danglyDisplacement,
    node.danglyTightness,
    node.danglyPeriod
  );

  if (!mesh.geometry.getAttribute("danglyOffset")) {
    mesh.geometry.setAttribute(
      "danglyOffset",
      new THREE.Float32BufferAttribute(new Float32Array(posAttr.count * 3), 3)
    );
  }

  mesh.userData.danglySim = sim;
}

export function initMergedDanglyWindMesh(
  mesh: THREE.Mesh,
  groups: DanglyGroupParams[]
): void {
  const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!posAttr || !groups.length) return;

  let sim = initSimFromGeometry(mesh, groups[0].vertexStart, groups[0].vertexCount, groups[0].displacement, groups[0].tightness, groups[0].period);

  for (let g = 1; g < groups.length; g++) {
    const group = groups[g];
    sim = initSimFromGeometry(
      mesh,
      group.vertexStart,
      group.vertexCount,
      group.displacement,
      group.tightness,
      group.period,
      sim
    );
  }

  if (!mesh.geometry.getAttribute("danglyOffset")) {
    mesh.geometry.setAttribute(
      "danglyOffset",
      new THREE.Float32BufferAttribute(new Float32Array(posAttr.count * 3), 3)
    );
  }

  mesh.userData.danglySim = sim;
}

export function updateDanglyWindMesh(mesh: THREE.Mesh, wm: WindManager, _delta: number): void {
  const sim = mesh.userData.danglySim as DanglySimState | undefined;
  if (!sim) return;

  // Clamp dt to [0.0125, 0.035]; use WindManager elapsed (set before model updates).
  const dt = Math.max(0.0125, Math.min(wm.uniformValues.windDanglyElapsed.value || 0.025, 0.035));
  // Ancestors only — world pose for this mesh; children not needed for pos/quat.
  mesh.updateWorldMatrix(true, false);
  mesh.getWorldPosition(_worldPos);
  mesh.getWorldQuaternion(_worldQuat);

  let movedFar = false;
  if (sim.initialized) {
    movedFar = sim.lastWorldPos.distanceTo(_worldPos) > 5.0;
  }

  if (!sim.initialized) {
    sim.initialized = true;
    sim.lastWorldPos.copy(_worldPos);
    sim.lastWorldQuat.copy(_worldQuat);
    writeOffsets(mesh, sim);
    return;
  }

  // Part moved >5 units — reset to rest and skip sim this frame.
  if (movedFar) {
    resetSimToRest(sim);
    sim.lastWorldPos.copy(_worldPos);
    sim.lastWorldQuat.copy(_worldQuat);
    writeOffsets(mesh, sim);
    return;
  }

  _invQuat.copy(_worldQuat).invert();
  _deltaQuat.copy(sim.lastWorldQuat).invert().multiply(_worldQuat);
  // Wind sample uses elapsed dt as scale (not 1.0).
  _worldWind.copy(wm.getGlobalWind(_worldPos, dt));
  _localWind.copy(_worldWind).applyQuaternion(_invQuat).multiplyScalar(20);

  _parentDelta.copy(sim.lastWorldPos).sub(_worldPos).applyQuaternion(_invQuat);

  const n = sim.constraints.length;
  for (let i = 0; i < n; i++) {
    const w = sim.constraints[i];
    const i3 = i * 3;
    const rx = sim.rest[i3];
    const ry = sim.rest[i3 + 1];
    const rz = sim.rest[i3 + 2];

    // weight == 0 skips simulation (pinned at rest).
    if (w <= 0) {
      sim.pos[i3] = rx;
      sim.pos[i3 + 1] = ry;
      sim.pos[i3 + 2] = rz;
      sim.vel[i3] = 0;
      sim.vel[i3 + 1] = 0;
      sim.vel[i3 + 2] = 0;
      continue;
    }

    let px = sim.pos[i3];
    let py = sim.pos[i3 + 1];
    let pz = sim.pos[i3 + 2];
    let vx = sim.vel[i3];
    let vy = sim.vel[i3 + 1];
    let vz = sim.vel[i3 + 2];

    _scratch.set(px, py, pz).applyQuaternion(_deltaQuat);
    px = _scratch.x;
    py = _scratch.y;
    pz = _scratch.z;
    _scratch.set(vx, vy, vz).applyQuaternion(_deltaQuat);
    vx = _scratch.x;
    vy = _scratch.y;
    vz = _scratch.z;

    px += _parentDelta.x;
    py += _parentDelta.y;
    pz += _parentDelta.z;

    const limit = (1.0 - w * (1.0 / 255.0)) * sim.displacement[i];
    if (limit < 1e-7) {
      sim.pos[i3] = rx;
      sim.pos[i3 + 1] = ry;
      sim.pos[i3 + 2] = rz;
      sim.vel[i3] = 0;
      sim.vel[i3 + 1] = 0;
      sim.vel[i3 + 2] = 0;
      continue;
    }

    const k = sim.tightness[i] * 0.5 * dt * w;
    const damp = sim.period[i] * 1.5 * dt;

    vx += (rx - px) * k - vx * damp;
    vy += (ry - py) * k - vy * damp;
    vz += (rz - pz) * k - vz * damp;

    let nx = px + vx * dt + _localWind.x * limit;
    let ny = py + vy * dt + _localWind.y * limit;
    let nz = pz + vz * dt + _localWind.z * limit;

    nx = clampToRest(rx, nx, limit);
    ny = clampToRest(ry, ny, limit);
    nz = clampToRest(rz, nz, limit);

    sim.pos[i3] = nx;
    sim.pos[i3 + 1] = ny;
    sim.pos[i3 + 2] = nz;
    sim.vel[i3] = vx;
    sim.vel[i3 + 1] = vy;
    sim.vel[i3 + 2] = vz;
  }

  sim.lastWorldPos.copy(_worldPos);
  sim.lastWorldQuat.copy(_worldQuat);
  writeOffsets(mesh, sim);
}

export function updateModelDanglyWind(model: OdysseyModel3D, wm: WindManager | null | undefined, delta: number): void {
  if (!wm) return;

  for (let i = 0; i < model.danglyMeshes.length; i++) {
    const mesh = model.danglyMeshes[i];
    if (mesh instanceof THREE.Mesh) {
      updateDanglyWindMesh(mesh, wm, delta);
    }
  }

  if (model.mergedDanglyMesh instanceof THREE.Mesh) {
    updateDanglyWindMesh(model.mergedDanglyMesh, wm, delta);
  }
}
