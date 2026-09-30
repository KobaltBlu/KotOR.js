import * as THREE from "three";
import { RenderPerfStats } from "@/utility/RenderPerfStats";

const _skinIndex = /*@__PURE__*/ new THREE.Vector4();
const _skinWeight = /*@__PURE__*/ new THREE.Vector4();
const _vector = /*@__PURE__*/ new THREE.Vector3();
const _matrix = /*@__PURE__*/ new THREE.Matrix4();
const _basePosition = /*@__PURE__*/ new THREE.Vector3();

const ODYSSEY_SKELETON_DIRTY = 'odysseyBonesDirty';
const ODYSSEY_SKIN_MW_FP = 'odysseySkinMatrixWorldFp';
/** Last boneMatrices content hash — used to skip no-op GPU uploads + shadow dirty. */
export const ODYSSEY_BONE_MATRICES_FP = 'odysseyBoneMatricesFp';
/** Bone DataTexture identity last pushed to the GPU (computeBoneTexture replaces it). */
const ODYSSEY_BONE_TEX_SYNCED = 'odysseyBoneTexSynced';
/**
 * SkinnedMeshes that share this skeleton and need frustum boundingSphere refresh
 * when boneMatrices content changes (body skins + force-shield shells).
 */
const ODYSSEY_BOUND_SKINS = 'odysseyBoundSkins';
/**
 * Per-bone bind-space spheres (after bindMatrix) cached on the SkinnedMesh.
 * Refresh merges boneMatrices-transformed spheres instead of per-vertex CPU skin.
 */
const ODYSSEY_BONE_BIND_SPHERES = 'odysseyBoneBindSpheres';

type BoneBindSphere = {
  boneIndex: number;
  cx: number;
  cy: number;
  cz: number;
  radius: number;
};

/** Mark a skeleton so the next {@link THREE.Skeleton.update} fills boneMatrices and uploads. */
export function markOdysseySkeletonDirty(skeleton: THREE.Skeleton | undefined | null): void {
  if(!skeleton){ return; }
  (skeleton as any)[ODYSSEY_SKELETON_DIRTY] = true;
}

/**
 * Register a SkinnedMesh for dirty-gated boundingSphere refresh after bone updates.
 * Safe to call more than once for the same pair.
 */
export function registerOdysseySkinBounds(
  skeleton: THREE.Skeleton | undefined | null,
  skin: THREE.SkinnedMesh | undefined | null,
): void {
  if(!skeleton || !skin){ return; }
  let list = (skeleton as any)[ODYSSEY_BOUND_SKINS] as THREE.SkinnedMesh[] | undefined;
  if(!list){
    list = [];
    (skeleton as any)[ODYSSEY_BOUND_SKINS] = list;
  }
  if(list.indexOf(skin) < 0){
    list.push(skin);
  }
}

/** Drop a skin from the skeleton's bounds-refresh list (force-shield dispose). */
export function unregisterOdysseySkinBounds(
  skeleton: THREE.Skeleton | undefined | null,
  skin: THREE.SkinnedMesh | undefined | null,
): void {
  if(!skeleton || !skin){ return; }
  const list = (skeleton as any)[ODYSSEY_BOUND_SKINS] as THREE.SkinnedMesh[] | undefined;
  if(!list){ return; }
  const idx = list.indexOf(skin);
  if(idx >= 0){
    list.splice(idx, 1);
  }
}

function buildBoneBindSpheres(skin: THREE.SkinnedMesh): BoneBindSphere[] | null {
  const geometry = skin.geometry;
  const posAttr = geometry?.attributes?.position as THREE.BufferAttribute | undefined;
  const indexAttr = geometry?.attributes?.skinIndex as THREE.BufferAttribute | undefined;
  const weightAttr = geometry?.attributes?.skinWeight as THREE.BufferAttribute | undefined;
  if(!posAttr || !indexAttr || !weightAttr){
    return null;
  }

  const boneCount = skin.skeleton?.bones?.length ?? 0;
  if(boneCount <= 0){
    return null;
  }

  // Accumulators: sum of bind-space positions + count per bone (center of mass),
  // then a second pass for radius.
  const sums = new Float64Array(boneCount * 3);
  const counts = new Uint32Array(boneCount);
  const bindMatrix = skin.bindMatrix;
  const n = posAttr.count;

  for(let i = 0; i < n; i++){
    _basePosition.fromBufferAttribute(posAttr, i);
    _basePosition.applyMatrix4(bindMatrix);
    _skinIndex.fromBufferAttribute(indexAttr, i);
    _skinWeight.fromBufferAttribute(weightAttr, i);
    for(let k = 0; k < 4; k++){
      const w = _skinWeight.getComponent(k);
      if(w <= 0) continue;
      const bi = Math.round(_skinIndex.getComponent(k));
      if(bi < 0 || bi >= boneCount) continue;
      const o = bi * 3;
      sums[o] += _basePosition.x;
      sums[o + 1] += _basePosition.y;
      sums[o + 2] += _basePosition.z;
      counts[bi]++;
    }
  }

  const centers = new Float64Array(boneCount * 3);
  for(let bi = 0; bi < boneCount; bi++){
    if(!counts[bi]) continue;
    const o = bi * 3;
    const inv = 1 / counts[bi];
    centers[o] = sums[o] * inv;
    centers[o + 1] = sums[o + 1] * inv;
    centers[o + 2] = sums[o + 2] * inv;
  }

  const radii = new Float64Array(boneCount);
  for(let i = 0; i < n; i++){
    _basePosition.fromBufferAttribute(posAttr, i);
    _basePosition.applyMatrix4(bindMatrix);
    _skinIndex.fromBufferAttribute(indexAttr, i);
    _skinWeight.fromBufferAttribute(weightAttr, i);
    for(let k = 0; k < 4; k++){
      const w = _skinWeight.getComponent(k);
      if(w <= 0) continue;
      const bi = Math.round(_skinIndex.getComponent(k));
      if(bi < 0 || bi >= boneCount || !counts[bi]) continue;
      const o = bi * 3;
      const dx = _basePosition.x - centers[o];
      const dy = _basePosition.y - centers[o + 1];
      const dz = _basePosition.z - centers[o + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if(d > radii[bi]){
        radii[bi] = d;
      }
    }
  }

  const out: BoneBindSphere[] = [];
  for(let bi = 0; bi < boneCount; bi++){
    if(!counts[bi]) continue;
    const o = bi * 3;
    out.push({
      boneIndex: bi,
      cx: centers[o],
      cy: centers[o + 1],
      cz: centers[o + 2],
      radius: radii[bi],
    });
  }
  return out.length ? out : null;
}

function ensureBoneBindSpheres(skin: THREE.SkinnedMesh): BoneBindSphere[] | null {
  let cached = (skin as any)[ODYSSEY_BONE_BIND_SPHERES] as BoneBindSphere[] | null | undefined;
  if(cached !== undefined){
    return cached;
  }
  cached = buildBoneBindSpheres(skin);
  (skin as any)[ODYSSEY_BONE_BIND_SPHERES] = cached;
  return cached;
}

/** Max axis scale of a mat4 (column lengths) — used to inflate bone sphere radii. */
function maxAxisScaleFromMat4Array(m: Float32Array | number[], offset: number): number {
  const sx = Math.hypot(m[offset] as number, m[offset + 1] as number, m[offset + 2] as number);
  const sy = Math.hypot(m[offset + 4] as number, m[offset + 5] as number, m[offset + 6] as number);
  const sz = Math.hypot(m[offset + 8] as number, m[offset + 9] as number, m[offset + 10] as number);
  return Math.max(sx, sy, sz, 1e-8);
}

/**
 * Refresh mesh-local boundingSphere from cached per-bone bind spheres + boneMatrices.
 * Falls back to three.js per-vertex computeBoundingSphere when attributes are missing.
 */
function refreshOdysseySkinBoundingSpheres(skeleton: THREE.Skeleton): void {
  const list = (skeleton as any)[ODYSSEY_BOUND_SKINS] as THREE.SkinnedMesh[] | undefined;
  if(!list || !list.length){ return; }
  const boneMatrices = skeleton.boneMatrices;
  for(let i = 0; i < list.length; i++){
    const skin = list[i];
    if(!skin || !skin.geometry){ continue; }

    const boneSpheres = ensureBoneBindSpheres(skin);
    if(!boneSpheres){
      skin.computeBoundingSphere();
      continue;
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let any = false;

    for(let b = 0; b < boneSpheres.length; b++){
      const bs = boneSpheres[b];
      const o = bs.boneIndex * 16;
      if(o + 15 >= boneMatrices.length) continue;
      _matrix.fromArray(boneMatrices, o);
      _vector.set(bs.cx, bs.cy, bs.cz).applyMatrix4(_matrix);
      const scale = maxAxisScaleFromMat4Array(boneMatrices, o);
      const r = bs.radius * scale;
      any = true;
      if(_vector.x - r < minX) minX = _vector.x - r;
      if(_vector.y - r < minY) minY = _vector.y - r;
      if(_vector.z - r < minZ) minZ = _vector.z - r;
      if(_vector.x + r > maxX) maxX = _vector.x + r;
      if(_vector.y + r > maxY) maxY = _vector.y + r;
      if(_vector.z + r > maxZ) maxZ = _vector.z + r;
    }

    if(!any){
      skin.computeBoundingSphere();
      continue;
    }

    // Merged AABB center/radius in post-bindMatrix / pre-bindMatrixInverse space,
    // then map into mesh-local (same as applyBoneTransform output).
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const hx = (maxX - minX) * 0.5;
    const hy = (maxY - minY) * 0.5;
    const hz = (maxZ - minZ) * 0.5;
    _vector.set(cx, cy, cz).applyMatrix4(skin.bindMatrixInverse);
    const invScale = maxAxisScaleFromMat4Array(skin.bindMatrixInverse.elements, 0);
    const radius = Math.sqrt(hx * hx + hy * hy + hz * hz) * invScale;

    if(!skin.boundingSphere){
      skin.boundingSphere = new THREE.Sphere();
    }
    skin.boundingSphere.center.copy(_vector);
    skin.boundingSphere.radius = radius;
  }
}

/** Read the last boneMatrices content fingerprint (0 if never computed). */
export function getOdysseyBoneMatricesFingerprint(
  skeleton: THREE.Skeleton | undefined | null
): number {
  if(!skeleton){ return 0; }
  return ((skeleton as any)[ODYSSEY_BONE_MATRICES_FP] as number) | 0;
}

/** Cheap content hash of skinning boneMatrices (basis diagonals + translation per bone). */
export function fingerprintBoneMatrices(boneMatrices: Float32Array | number[]): number {
  let h = 0x811c9dc5;
  const n = boneMatrices.length;
  // Per mat4: diagonal (0,5,10) + translation (12,13,14). Stride-4 from 0 misses ty/tz.
  for(let o = 0; o + 15 < n; o += 16){
    h = Math.imul(h ^ (Math.round((boneMatrices[o] as number) * 1e4) | 0), 16777619);
    h = Math.imul(h ^ (Math.round((boneMatrices[o + 5] as number) * 1e4) | 0), 16777619);
    h = Math.imul(h ^ (Math.round((boneMatrices[o + 10] as number) * 1e4) | 0), 16777619);
    h = Math.imul(h ^ (Math.round((boneMatrices[o + 12] as number) * 1e3) | 0), 16777619);
    h = Math.imul(h ^ (Math.round((boneMatrices[o + 13] as number) * 1e3) | 0), 16777619);
    h = Math.imul(h ^ (Math.round((boneMatrices[o + 14] as number) * 1e3) | 0), 16777619);
  }
  return h | 0;
}

/** Mark every Skeleton under a root (pose flush / equipment attach). */
export function markOdysseySkeletonsDirtyUnder(root: THREE.Object3D | undefined | null): void {
  if(!root){ return; }
  // Prefer tracked skins — covers head-merged skins and avoids missing meshes
  // if traverse is pruned. Also walk childModels.
  const model = root as { skins?: THREE.SkinnedMesh[]; childModels?: THREE.Object3D[] };
  const hasSkins = Array.isArray(model.skins) && model.skins.length > 0;
  if(hasSkins){
    for(let i = 0; i < model.skins.length; i++){
      markOdysseySkeletonDirty(model.skins[i]?.skeleton);
    }
  }
  if(Array.isArray(model.childModels)){
    for(let i = 0; i < model.childModels.length; i++){
      markOdysseySkeletonsDirtyUnder(model.childModels[i]);
    }
  }
  // When skins[] is populated, skip full traverse — tracked list is authoritative.
  if(hasSkins){ return; }
  if(typeof (root as any).traverse !== 'function'){ return; }
  root.traverse((obj) => {
    const skin = obj as THREE.SkinnedMesh;
    if(skin.isSkinnedMesh && skin.skeleton){
      markOdysseySkeletonDirty(skin.skeleton);
    }
  });
}

function skinMatrixWorldFingerprint(skinNode: THREE.Object3D): number {
  const e = skinNode.matrixWorld.elements;
  // Full basis + translation — diagonal-only aliases opposite yaw/pitch.
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

/**
 * GatherBones space: bone matrices are skin-local (inv(skinWorld) * boneWorld)
 * then multiplied by MDL qbone/tbone inverses already stored on the skeleton.
 *
 * Three.js default Skeleton.update uses bone.matrixWorld * boneInverse. When
 * boneInverse comes from calculateInverses at a world translation, bone rotation
 * produces (I-R)*T_world blowup — spaghetti on long-span weights (pelvis↔foot).
 *
 * r149 SkinnedMesh.boneTransform also multiplies matrixWorld*boneInverse directly
 * (ignores boneMatrices). Patch it to use the skin-local boneMatrices from update.
 */
export function installOdysseySkeletonUpdate(
  skeleton: THREE.Skeleton,
  skinNode: THREE.SkinnedMesh,
): void {
  const offsetMatrix = new THREE.Matrix4();
  const boneLocal = new THREE.Matrix4();
  const skinInverse = new THREE.Matrix4();

  // First bind / LOD / attach must upload once.
  markOdysseySkeletonDirty(skeleton);
  registerOdysseySkinBounds(skeleton, skinNode);

  skeleton.update = function odysseySkeletonUpdate(this: THREE.Skeleton){
    const dirtyFlag = !!(this as any)[ODYSSEY_SKELETON_DIRTY];
    const skinFp = skinMatrixWorldFingerprint(skinNode);
    const lastSkinFp = (this as any)[ODYSSEY_SKIN_MW_FP] as number | undefined;
    // Always fill once before the first boneTexture exists (bind-time upload).
    const needsFirstUpload = this.boneTexture === null && lastSkinFp === undefined;
    const synced = (this as any)[ODYSSEY_BONE_TEX_SYNCED] as THREE.DataTexture | undefined;
    const texNeedsSync = this.boneTexture !== null && synced !== this.boneTexture;
    if(!dirtyFlag && !needsFirstUpload && !texNeedsSync && lastSkinFp === skinFp){
      return;
    }

    const bones = this.bones;
    const boneInverses = this.boneInverses;
    const boneMatrices = this.boneMatrices;
    skinInverse.copy(skinNode.matrixWorld).invert();

    for(let i = 0, il = bones.length; i < il; i++){
      const bone = bones[i];
      const boneInverse = boneInverses[i];
      if(bone && boneInverse){
        boneLocal.multiplyMatrices(skinInverse, bone.matrixWorld);
        offsetMatrix.multiplyMatrices(boneLocal, boneInverse);
      }else{
        offsetMatrix.identity();
      }
      offsetMatrix.toArray(boneMatrices, i * 16);
    }

    (this as any)[ODYSSEY_SKELETON_DIRTY] = false;
    (this as any)[ODYSSEY_SKIN_MW_FP] = skinFp;

    const boneFp = fingerprintBoneMatrices(boneMatrices);
    const lastBoneFp = (this as any)[ODYSSEY_BONE_MATRICES_FP] as number | undefined;
    const boneFpChanged = lastBoneFp === undefined || lastBoneFp !== boneFp;
    (this as any)[ODYSSEY_BONE_MATRICES_FP] = boneFp;

    // Held / single-keyframe poses refill CPU matrices but need no GPU upload —
    // unless boneTexture was created after a CPU-only fill (computeBoneTexture)
    // and has never been synced from this update path.
    if(this.boneTexture !== null){
      const texChanged = synced !== this.boneTexture;
      if(texChanged || boneFpChanged){
        this.boneTexture.needsUpdate = true;
        (this as any)[ODYSSEY_BONE_TEX_SYNCED] = this.boneTexture;
        RenderPerfStats.noteBoneTextureUpload();
      }
    }

    // r186 frustum tests SkinnedMesh.boundingSphere before skeleton.update.
    // Refresh mesh-local spheres only when the skinned shape changed so the
    // next frame's cull matches the pose (one-frame lag is expected).
    if(boneFpChanged){
      refreshOdysseySkinBoundingSpheres(this);
    }
  };

  // CPU path must match GPU (boneMatrices). r186 getVertexPosition /
  // computeBoundingSphere call applyBoneTransform (not boneTransform); the
  // default multiplies bone.matrixWorld*boneInverse → world space, then
  // Frustum applies matrixWorld again and double-transforms the cull sphere.
  skinNode.applyBoneTransform = function odysseyApplyBoneTransform(
    index: number,
    target: THREE.Vector3 | THREE.Vector4,
  ){
    const skel = this.skeleton;
    const geometry = this.geometry;
    _skinIndex.fromBufferAttribute(geometry.attributes.skinIndex, index);
    _skinWeight.fromBufferAttribute(geometry.attributes.skinWeight, index);

    const isVec4 = (target as THREE.Vector4).isVector4 === true;
    if(isVec4){
      _basePosition.set((target as THREE.Vector4).x, (target as THREE.Vector4).y, (target as THREE.Vector4).z);
      (target as THREE.Vector4).set(0, 0, 0, 0);
    }else{
      _basePosition.copy(target as THREE.Vector3);
      (target as THREE.Vector3).set(0, 0, 0);
    }
    _basePosition.applyMatrix4(this.bindMatrix);

    for(let i = 0; i < 4; i++){
      const weight = _skinWeight.getComponent(i);
      if(weight === 0) continue;
      const boneIndex = Math.round(_skinIndex.getComponent(i));
      _matrix.fromArray(skel.boneMatrices, boneIndex * 16);
      _vector.copy(_basePosition).applyMatrix4(_matrix);
      if(isVec4){
        (target as THREE.Vector4).x += _vector.x * weight;
        (target as THREE.Vector4).y += _vector.y * weight;
        (target as THREE.Vector4).z += _vector.z * weight;
      }else{
        (target as THREE.Vector3).addScaledVector(_vector, weight);
      }
    }

    if(isVec4){
      (target as THREE.Vector4).w = 1;
      (target as THREE.Vector4).applyMatrix4(this.bindMatrixInverse);
      return target;
    }
    return (target as THREE.Vector3).applyMatrix4(this.bindMatrixInverse);
  };

  // Keep boneTransform as an alias for older call sites / tests.
  skinNode.boneTransform = function odysseyBoneTransform(index: number, target: THREE.Vector3){
    return this.applyBoneTransform(index, target) as THREE.Vector3;
  };
}

/** Identity bindMatrix passed to SkinnedMesh.bind to skip calculateInverses. */
export const ODYSSEY_IDENTITY_BIND_MATRIX = new THREE.Matrix4();

export interface IOdysseyGatherBonesDfs {
  /** Nodes in GatherBones / hierarchy DFS order. */
  dfsNodes: THREE.Object3D[];
  /** nameIndex → index into dfsNodes / qbone_ref_inv. */
  dfsIndexByNameIndex: number[];
}

/**
 * Build GatherBones DFS order for a model's geometry nodes.
 * Only includes Object3Ds whose odysseyModelNode.nameIndex maps to names[nameIndex]
 * (keeps head/weapon attaches out of another model's table).
 *
 * bone_parts[slot] and QBone/TBone are parallel to this DFS order
 * (/ FindPartIndexDFS / ExecuteSkinTransforms).
 * On p_bastilabb nameIndex ≠ DFS for leg bones — bind must use DFS, not nameIndex.
 */
export function buildGatherBonesDfsOrder(
  root: THREE.Object3D,
  names: string[],
): IOdysseyGatherBonesDfs {
  const dfsNodes: THREE.Object3D[] = [];
  const dfsIndexByNameIndex: number[] = [];

  const walk = (obj: THREE.Object3D) => {
    const odysseyNode = (obj as any).odysseyModelNode;
    if(odysseyNode && typeof odysseyNode.nameIndex === 'number' && odysseyNode.nameIndex >= 0){
      const nameIndex = odysseyNode.nameIndex;
      // First-wins: head/weapon attaches can share nameIndex namespaces that collide
      // with body names (e.g. cutscenedummy). Do not overwrite body DFS slots.
      if(names[nameIndex] === obj.name && typeof dfsIndexByNameIndex[nameIndex] === 'undefined'){
        dfsIndexByNameIndex[nameIndex] = dfsNodes.length;
        dfsNodes.push(obj);
      }
    }
    const children = obj.children;
    for(let i = 0; i < children.length; i++){
      walk(children[i]);
    }
  };
  walk(root);

  return { dfsNodes, dfsIndexByNameIndex };
}

/**
 * Resolve a skin palette slot: bone_parts[slot] is a GatherBones DFS index.
 * Bone Object3D and QBone/TBone inverse both come from that DFS index.
 */
export function resolveSkinBoneSlot(
  dfsIndex: number,
  dfsNodes: (THREE.Object3D | undefined)[],
  inverseMats: THREE.Matrix4[],
  dfsNodeCount: number,
  slotIndex?: number,
): { bone: THREE.Object3D | undefined; inverse: THREE.Matrix4 } {
  if(dfsIndex === 0xFFFF || dfsIndex < 0 || dfsIndex >= dfsNodeCount){
    return { bone: undefined, inverse: new THREE.Matrix4() };
  }
  const bone = dfsNodes[dfsIndex];
  if(typeof bone === 'undefined'){
    return { bone: undefined, inverse: new THREE.Matrix4() };
  }
  if(dfsIndex < inverseMats.length){
    return { bone, inverse: inverseMats[dfsIndex] ?? new THREE.Matrix4() };
  }
  // Odd files: inverses sized to palette slots rather than DFS/node list
  if(typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < inverseMats.length){
    return { bone, inverse: inverseMats[slotIndex] ?? new THREE.Matrix4() };
  }
  return { bone, inverse: new THREE.Matrix4() };
}

/**
 * Names owned by the body along the path to headhook (inclusive).
 * Prefer-head collision rewrite must not steal these (torsoupr_g, torso_g, …).
 */
export function collectHeadhookAncestorNames(
  headhook: THREE.Object3D | undefined | null,
): Set<string> {
  const names = new Set<string>();
  let obj: THREE.Object3D | null | undefined = headhook ?? undefined;
  while(obj){
    if(obj.name){
      names.add(obj.name);
    }
    obj = obj.parent;
  }
  return names;
}

export interface IOdysseyBodyBoneTables {
  nodes: Map<string, THREE.Object3D>;
  nodesById: (THREE.Object3D | undefined)[];
  dfsNodes: THREE.Object3D[];
}

/** True if obj or any descendant is a Mesh / SkinnedMesh. */
export function odysseyObjectHasMesh(obj: THREE.Object3D): boolean {
  if((obj as THREE.Mesh).isMesh || (obj as THREE.SkinnedMesh).isSkinnedMesh){
    return true;
  }
  for(let i = 0; i < obj.children.length; i++){
    if(odysseyObjectHasMesh(obj.children[i])){
      return true;
    }
  }
  return false;
}

function retargetNodeTables(
  body: IOdysseyBodyBoneTables,
  from: THREE.Object3D,
  to: THREE.Object3D,
): void {
  if(to.name && body.nodes.get(to.name) === from){
    body.nodes.set(to.name, to);
  }
  const fromId = (from as any).odysseyModelNode?.nodeNumber;
  if(typeof fromId === 'number' && fromId >= 0 && body.nodesById[fromId] === from){
    body.nodesById[fromId] = to;
  }
  const toId = (to as any).odysseyModelNode?.nodeNumber;
  if(typeof toId === 'number' && toId >= 0){
    body.nodesById[toId] = to;
  }
}

/**
 * Move body-only attachments onto the preferred bone. When both sides share a
 * child name, recurse; if the body node carries meshes and the head placeholder
 * does not (eyera/teethu on p_bastilabb), replace the empty head node.
 * Local TRS is preserved.
 */
export function reparentBodyUniqueChildrenOntoHead(
  bodyObj: THREE.Object3D,
  headObj: THREE.Object3D,
  body: IOdysseyBodyBoneTables,
): void {
  const headChildByName = new Map<string, THREE.Object3D>();
  for(let c = 0; c < headObj.children.length; c++){
    const child = headObj.children[c];
    if(child?.name && !headChildByName.has(child.name)){
      headChildByName.set(child.name, child);
    }
  }

  const bodyChildren = bodyObj.children.slice();
  for(let c = 0; c < bodyChildren.length; c++){
    const child = bodyChildren[c];
    if(!child?.name){
      continue;
    }
    const headChild = headChildByName.get(child.name);
    if(!headChild){
      headObj.add(child);
      headChildByName.set(child.name, child);
      continue;
    }
    // Only swap empty leaf placeholders (eyera/teethu). Structural bones like
    // f_jaw_g may gain mesh via a child (teethl) — recurse into that child.
    if(
      odysseyObjectHasMesh(child) &&
      !odysseyObjectHasMesh(headChild) &&
      headChild.children.length === 0
    ){
      headObj.remove(headChild);
      headObj.add(child);
      headChildByName.set(child.name, child);
      retargetNodeTables(body, headChild, child);
      continue;
    }
    reparentBodyUniqueChildrenOntoHead(child, headChild, body);
  }
}

/**
 * Model B bodies like p_bastilabb embed the same neck/head bone names and
 * nodeNumbers as the head MDL. attachHead first-wins left anim on the body's
 * unused duplicates while head skins bound the head's bones.
 *
 * Prefer the head's Object3D for colliding names (except headhook ancestors)
 * in nodes / nodesById / body dfsNodes so collar + face share one hierarchy.
 * Reparent body-unique children (hair) and replace empty head placeholders
 * that the body fills with meshes (eyes, lids, teeth).
 */
export function preferHeadBonesForNameCollisions(
  body: IOdysseyBodyBoneTables,
  headDfsNodes: THREE.Object3D[],
  bodyOwnedNames: Set<string>,
): void {
  for(let i = 0; i < headDfsNodes.length; i++){
    const headObj = headDfsNodes[i];
    if(!headObj?.name || bodyOwnedNames.has(headObj.name)){
      continue;
    }
    const existing = body.nodes.get(headObj.name);
    if(!existing || existing === headObj){
      continue;
    }

    reparentBodyUniqueChildrenOntoHead(existing, headObj, body);

    body.nodes.set(headObj.name, headObj);
    const nodeNumber = (headObj as any).odysseyModelNode?.nodeNumber;
    if(typeof nodeNumber === 'number' && nodeNumber >= 0){
      body.nodesById[nodeNumber] = headObj;
    }
    for(let d = 0; d < body.dfsNodes.length; d++){
      if(body.dfsNodes[d] === existing){
        body.dfsNodes[d] = headObj;
      }
    }
  }
}
