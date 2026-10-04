import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import type { IOdysseyModelLoaderOptions } from "@engine/interface/odyssey/IOdysseyModelLoaderOptions";

/**
 * Controllers that mutate per-mesh material uniforms at runtime.
 * Sharing a ShaderMaterial across those nodes makes every consumer blink/fade together.
 */
export const MATERIAL_PROPERTY_ANIM_CONTROLLER_TYPES: readonly OdysseyModelControllerType[] = [
  OdysseyModelControllerType.SelfIllumColor,
  OdysseyModelControllerType.Alpha,
];

/** True when the mesh node itself carries multi-frame SelfIllum / Alpha keys. */
export function nodeHasAnimatedMaterialControllers(odysseyNode: OdysseyModelNodeMesh): boolean {
  const controllers = odysseyNode.controllers;
  if(!controllers){ return false; }
  for(let i = 0; i < MATERIAL_PROPERTY_ANIM_CONTROLLER_TYPES.length; i++){
    const c = controllers.get(MATERIAL_PROPERTY_ANIM_CONTROLLER_TYPES[i]);
    if(c?.data && c.data.length > 1){ return true; }
  }
  return false;
}

/**
 * Names of nodes with SelfIllumColor / Alpha controllers in any clip.
 * Those meshes need unique materials (and must stay out of mergeStatic).
 */
export function collectMaterialUniqueAnimatedNodeNames(
  animations: OdysseyModelAnimation[] | undefined,
): Set<string> {
  const names = new Set<string>();
  if(!animations?.length) return names;
  for(let i = 0; i < animations.length; i++){
    const nodes = animations[i]?.nodes;
    if(!nodes?.length) continue;
    for(let j = 0; j < nodes.length; j++){
      const animNode = nodes[j];
      const controllers = animNode?.controllers;
      if(!controllers || !animNode.name) continue;
      for(let k = 0; k < MATERIAL_PROPERTY_ANIM_CONTROLLER_TYPES.length; k++){
        if(controllers.has(MATERIAL_PROPERTY_ANIM_CONTROLLER_TYPES[k])){
          names.add(animNode.name.toLowerCase());
          break;
        }
      }
    }
  }
  return names;
}

/**
 * Materials with per-instance animated state must not share.
 * Anim-dummy leaves without lightmaps may share (same T1/defines) so hangar
 * ships and props stop minting one ShaderMaterial per mesh.
 *
 * @param uniqueMaterialNodeNames lowercase node names with SelfIllum/Alpha keys in any clip
 */
export function nodeMaterialCacheShareable(
  odysseyNode: OdysseyModelNodeMesh,
  options?: IOdysseyModelLoaderOptions,
  uniqueMaterialNodeNames?: Set<string>
): boolean {
  if(odysseyNode.nAnimateUV){ return false; }
  if(nodeHasAnimatedMaterialControllers(odysseyNode)){ return false; }
  const nodeName = odysseyNode.name?.toLowerCase?.();
  if(nodeName && uniqueMaterialNodeNames?.has(nodeName)){ return false; }
  // Skinned materials must stay unique: USE_SKINNING is applied after cache
  // lookup and must not leak onto rigid meshes (or be missing on skins).
  if((odysseyNode.nodeType & OdysseyModelNodeType.Skin) === OdysseyModelNodeType.Skin){ return false; }
  if((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) === OdysseyModelNodeType.Dangly){ return false; }
  if((odysseyNode.nodeType & OdysseyModelNodeType.Saber) === OdysseyModelNodeType.Saber){ return false; }
  if(odysseyNode.beaming){ return false; }
  if(odysseyNode.dirtEnabled){ return false; }
  if(options?.isHologram){ return false; }
  if(options?.isForceShield){ return false; }
  if(odysseyNode.isAnimDummyNode){
    const tMap2 = (odysseyNode.textureMap2 || '') + '';
    if(odysseyNode.hasLightmap && tMap2.length){ return false; }
  }
  return true;
}
