import * as THREE from "three";

export interface IAnimDummyInstanceBatch {
  instanced: THREE.InstancedMesh;
  /** Nodes whose matrixWorld drives each instance (same order as setMatrixAt). */
  sources: THREE.Object3D[];
  /** Per-source matrixWorld fingerprints from the last upload. */
  sourceFps?: Int32Array;
}

const _mat = /*@__PURE__*/ new THREE.Matrix4();
const _invRoot = /*@__PURE__*/ new THREE.Matrix4();

function matrixWorldFingerprint(obj: THREE.Object3D): number {
  const e = obj.matrixWorld.elements;
  const basis = [0, 1, 2, 4, 5, 6, 8, 9, 10];
  let h = 0x811c9dc5;
  for(let i = 0; i < basis.length; i++){
    h = Math.imul(h ^ (Math.round(e[basis[i]] * 1e4) | 0), 16777619);
  }
  h = Math.imul(h ^ (Math.round(e[12] * 1e3) | 0), 16777619);
  h = Math.imul(h ^ (Math.round(e[13] * 1e3) | 0), 16777619);
  h = Math.imul(h ^ (Math.round(e[14] * 1e3) | 0), 16777619);
  return h | 0;
}
function geometryFingerprint(geometry: THREE.BufferGeometry): string {
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const idx = geometry.getIndex();
  const p0 = pos?.array?.[0];
  const p1 = pos?.array?.[1];
  const p2 = pos?.array?.[2];
  return [
    pos?.count | 0,
    idx?.count | 0,
    typeof p0 === "number" ? Math.round(p0 * 100) : 0,
    typeof p1 === "number" ? Math.round(p1 * 100) : 0,
    typeof p2 === "number" ? Math.round(p2 * 100) : 0,
  ].join(":");
}

function materialKey(material: THREE.Material): string {
  const ud = (material as any).userData;
  if(ud?.odysseyMaterialCacheId){ return String(ud.odysseyMaterialCacheId); }
  if(ud?.map){ return `map:${ud.map}`; }
  return material.uuid;
}

/**
 * Collapse anim-dummy leaf meshes that share material + geometry into
 * InstancedMesh batches (e.g. Upper City hangar ships: 200 → ~16 draws).
 * Call after mergeStatic on room models. Updates instance matrices from the
 * original node transforms each frame via {@link updateAnimDummyInstances}.
 */
export function buildAnimDummyInstanceBatches(
  root: THREE.Object3D,
  opts?: { minGroupSize?: number }
): IAnimDummyInstanceBatch[] {
  const minGroup = opts?.minGroupSize ?? 2;
  const groups = new Map<string, { mesh: THREE.Mesh; parent: THREE.Object3D }[]>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if(!mesh.isMesh || !mesh.geometry || !mesh.material){ return; }
    if((mesh as THREE.SkinnedMesh).isSkinnedMesh){ return; }
    if((mesh as any).isInstancedMesh){ return; }
    if(mesh.userData?.odysseyMergedStatic){ return; }
    if(mesh.userData?.skipAnimDummyInstance){ return; }

    // Prefer leaves under anim-dummy hierarchy (odysseyNode flag on mesh or ancestors).
    let animDummy = false;
    let walk: THREE.Object3D | null = mesh;
    while(walk){
      const on = (walk as any).odysseyNode || walk.userData?.odysseyModelNode;
      if(on?.isAnimDummyNode){ animDummy = true; break; }
      walk = walk.parent;
    }
    if(!animDummy){ return; }

    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if(!mat || Array.isArray(mesh.material)){ return; }
    const key = `${materialKey(mat)}|${geometryFingerprint(mesh.geometry)}`;
    let list = groups.get(key);
    if(!list){
      list = [];
      groups.set(key, list);
    }
    list.push({ mesh, parent: mesh.parent! });
  });

  const batches: IAnimDummyInstanceBatch[] = [];
  const batchRoot = new THREE.Group();
  batchRoot.name = "animDummyInstances";
  (batchRoot as any).matrixAutoUpdate = true;

  for(const [, list] of groups){
    if(list.length < minGroup){ continue; }
    const template = list[0].mesh;
    const mat = template.material as THREE.Material;
    const geo = template.geometry;
    const instanced = new THREE.InstancedMesh(geo, mat, list.length);
    instanced.name = `animDummyBatch_${batches.length}`;
    instanced.frustumCulled = false;
    instanced.castShadow = !!template.castShadow;
    instanced.receiveShadow = !!template.receiveShadow;
    instanced.userData.odysseyAnimDummyBatch = true;
    if(template.customDepthMaterial){
      instanced.customDepthMaterial = template.customDepthMaterial;
    }
    if(template.customDistanceMaterial){
      instanced.customDistanceMaterial = template.customDistanceMaterial;
    }

    const sources: THREE.Object3D[] = [];
    for(let i = 0; i < list.length; i++){
      const { mesh } = list[i];
      // Keep mesh in graph (hidden) so matrixWorld tracks animated parents.
      // Freeze leaf auto-update — parents still dirty via animation batch +
      // root.updateWorldMatrix before instance fingerprints are sampled.
      sources.push(mesh);
      mesh.visible = false;
      mesh.matrixAutoUpdate = false;
      mesh.userData.skipAnimDummyInstance = true;
      mesh.castShadow = false;
    }

    batchRoot.add(instanced);
    batches.push({
      instanced,
      sources,
      sourceFps: new Int32Array(sources.length),
    });
  }

  if(batches.length){
    root.add(batchRoot);
    (root as any).animDummyInstanceBatches = batches;
  }
  return batches;
}

/** Write instance matrices after animation updates bone/node transforms. */
export function updateAnimDummyInstances(
  root: THREE.Object3D & { animDummyInstanceBatches?: IAnimDummyInstanceBatch[] },
): void {
  const batches = root.animDummyInstanceBatches;
  if(!batches?.length){ return; }

  root.updateWorldMatrix(true, false);
  _invRoot.copy(root.matrixWorld).invert();

  for(let b = 0; b < batches.length; b++){
    const batch = batches[b];
    const { instanced, sources } = batch;
    if(!batch.sourceFps || batch.sourceFps.length !== sources.length){
      batch.sourceFps = new Int32Array(sources.length);
    }
    const fps = batch.sourceFps;
    let changed = false;
    for(let i = 0; i < sources.length; i++){
      const src = sources[i];
      if(!src){ continue; }
      const fp = matrixWorldFingerprint(src);
      if(fps[i] === fp){ continue; }
      fps[i] = fp;
      // Mesh was child of animated node — use that node's world matrix.
      _mat.multiplyMatrices(_invRoot, src.matrixWorld);
      instanced.setMatrixAt(i, _mat);
      changed = true;
    }
    if(changed){
      instanced.instanceMatrix.needsUpdate = true;
    }
  }
}
