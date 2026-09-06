import * as THREE from "three";

const _skinIndex = /*@__PURE__*/ new THREE.Vector4();
const _skinWeight = /*@__PURE__*/ new THREE.Vector4();
const _vector = /*@__PURE__*/ new THREE.Vector3();
const _matrix = /*@__PURE__*/ new THREE.Matrix4();
const _basePosition = /*@__PURE__*/ new THREE.Vector3();

/**
 * Retail GatherBones space: bone matrices are skin-local (inv(skinWorld) * boneWorld)
 * then multiplied by MDL qbone/tbone inverses already stored on the skeleton.
 *
 * Three.js default Skeleton.update uses bone.matrixWorld * boneInverse. When
 * boneInverse comes from calculateInverses() at a world translation, bone rotation
 * produces (I-R)*T_world blowup — spaghetti on long-span weights (pelvis↔foot).
 *
 * r149 SkinnedMesh.boneTransform also multiplies matrixWorld*boneInverse directly
 * (ignores boneMatrices). Patch it to use the skin-local boneMatrices from update().
 */
export function installOdysseySkeletonUpdate(
  skeleton: THREE.Skeleton,
  skinNode: THREE.SkinnedMesh,
): void {
  const offsetMatrix = new THREE.Matrix4();
  const boneLocal = new THREE.Matrix4();
  const skinInverse = new THREE.Matrix4();

  skeleton.update = function odysseySkeletonUpdate(this: THREE.Skeleton){
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

    if(this.boneTexture !== null){
      this.boneTexture.needsUpdate = true;
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

/** Identity bindMatrix passed to SkinnedMesh.bind to skip calculateInverses(). */
export const ODYSSEY_IDENTITY_BIND_MATRIX = new THREE.Matrix4();

export interface IOdysseyGatherBonesDfs {
  /** Nodes in retail GatherBones / hierarchy DFS order. */
  dfsNodes: THREE.Object3D[];
  /** nameIndex → index into dfsNodes / qbone_ref_inv. */
  dfsIndexByNameIndex: number[];
}

/**
 * Build GatherBones DFS order for a model's geometry nodes.
 * Only includes Object3Ds whose odysseyModelNode.nameIndex maps to names[nameIndex]
 * (keeps head/weapon attaches out of another model's table).
 *
 * Retail bone_parts[slot] and QBone/TBone are parallel to this DFS order
 * (PartSkin::PostProcess / FindPartIndexDFS / ExecuteSkinTransforms).
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
      // with body names[] (e.g. cutscenedummy). Do not overwrite body DFS slots.
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
