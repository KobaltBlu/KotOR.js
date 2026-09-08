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

/** Mark a skeleton so the next {@link THREE.Skeleton.update} fills boneMatrices and uploads. */
export function markOdysseySkeletonDirty(skeleton: THREE.Skeleton | undefined | null): void {
  if(!skeleton){ return; }
  (skeleton as any)[ODYSSEY_SKELETON_DIRTY] = true;
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
  if(Array.isArray(model.skins)){
    for(let i = 0; i < model.skins.length; i++){
      markOdysseySkeletonDirty(model.skins[i]?.skeleton);
    }
  }
  if(Array.isArray(model.childModels)){
    for(let i = 0; i < model.childModels.length; i++){
      markOdysseySkeletonsDirtyUnder(model.childModels[i]);
    }
  }
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
    (this as any)[ODYSSEY_BONE_MATRICES_FP] = boneFp;

    // Held / single-keyframe poses refill CPU matrices but need no GPU upload —
    // unless boneTexture was created after a CPU-only fill (computeBoneTexture)
    // and has never been synced from this update path.
    if(this.boneTexture !== null){
      const texChanged = synced !== this.boneTexture;
      if(texChanged || lastBoneFp !== boneFp){
        this.boneTexture.needsUpdate = true;
        (this as any)[ODYSSEY_BONE_TEX_SYNCED] = this.boneTexture;
        RenderPerfStats.noteBoneTextureUpload();
      }
    }
  };

  // CPU path must match GPU (boneMatrices), not r149's world*inverse shortcut.
  skinNode.boneTransform = function odysseyBoneTransform(index: number, target: THREE.Vector3){
    const skel = this.skeleton;
    const geometry = this.geometry;
    _skinIndex.fromBufferAttribute(geometry.attributes.skinIndex, index);
    _skinWeight.fromBufferAttribute(geometry.attributes.skinWeight, index);
    _basePosition.copy(target).applyMatrix4(this.bindMatrix);
    target.set(0, 0, 0);
    for(let i = 0; i < 4; i++){
      const weight = _skinWeight.getComponent(i);
      if(weight === 0) continue;
      const boneIndex = Math.round(_skinIndex.getComponent(i));
      _matrix.fromArray(skel.boneMatrices, boneIndex * 16);
      target.addScaledVector(_vector.copy(_basePosition).applyMatrix4(_matrix), weight);
    }
    return target.applyMatrix4(this.bindMatrixInverse);
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
