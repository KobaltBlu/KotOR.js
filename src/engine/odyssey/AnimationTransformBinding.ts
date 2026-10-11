import * as THREE from "three";
import type { OdysseyModel3D, OdysseyObject3D } from "@engine/render/three/odyssey";

/**
 * Model-local map from transform nodes (bones) to skeletons they affect.
 * Built once from skins[].skeleton.bones + ancestor walk.
 *
 * Ownership note: animation manager flush uses this for selective skeleton
 * invalidation; falls back to whole-model dirty when missing.
 */
export interface AnimationTransformBinding {
  /** node.uuid → skeletons that include this bone or a descendant bone. */
  nodeSkeletons: Map<string, THREE.Skeleton[]>;
}

/**
 * Build node→skeleton dependencies for selective boneTexture invalidation.
 * Body skins often share bone Object3Ds but own separate Skeleton instances;
 * force-shield shells may share one skeleton across meshes.
 */
export function buildAnimationTransformBinding(
  model: OdysseyModel3D | undefined | null
): AnimationTransformBinding | undefined {
  if(!model || !Array.isArray(model.skins) || model.skins.length === 0){
    return undefined;
  }

  const nodeSkeletons = new Map<string, THREE.Skeleton[]>();

  const add = (node: THREE.Object3D | undefined | null, skeleton: THREE.Skeleton) => {
    if(!node) return;
    let list = nodeSkeletons.get(node.uuid);
    if(!list){
      list = [];
      nodeSkeletons.set(node.uuid, list);
    }
    if(list.indexOf(skeleton) < 0){
      list.push(skeleton);
    }
  };

  for(let s = 0; s < model.skins.length; s++){
    const skin = model.skins[s];
    const skeleton = skin?.skeleton;
    if(!skeleton?.bones?.length) continue;
    for(let b = 0; b < skeleton.bones.length; b++){
      let obj: THREE.Object3D | null = skeleton.bones[b];
      // Ancestor bones affect descendant skinning transforms.
      while(obj && obj !== model){
        add(obj, skeleton);
        obj = obj.parent;
      }
      // Model root movement can also affect skin-local gathers.
      add(model, skeleton);
    }
  }

  return { nodeSkeletons };
}

/** Collect unique skeletons affected by a list of dirty transform nodes. */
export function collectAffectedSkeletons(
  binding: AnimationTransformBinding | undefined,
  nodes: Array<OdysseyObject3D | THREE.Object3D>,
  out: THREE.Skeleton[]
): number {
  out.length = 0;
  if(!binding || !nodes.length) return 0;
  for(let i = 0; i < nodes.length; i++){
    const node = nodes[i];
    if(!node) continue;
    const list = binding.nodeSkeletons.get(node.uuid);
    if(!list) continue;
    for(let j = 0; j < list.length; j++){
      const sk = list[j];
      if(out.indexOf(sk) < 0) out.push(sk);
    }
  }
  return out.length;
}
