import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModelNodeMesh } from "@/odyssey/OdysseyModelNodeMesh";
import type { IOdysseyModelLoaderOptions } from "@/interface/odyssey/IOdysseyModelLoaderOptions";

/**
 * Materials with per-instance animated state must not share.
 * Anim-dummy leaves without lightmaps may share (same T1/defines) so hangar
 * ships and props stop minting one ShaderMaterial per mesh.
 */
export function nodeMaterialCacheShareable(
  odysseyNode: OdysseyModelNodeMesh,
  options?: IOdysseyModelLoaderOptions
): boolean {
  if(odysseyNode.nAnimateUV){ return false; }
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
