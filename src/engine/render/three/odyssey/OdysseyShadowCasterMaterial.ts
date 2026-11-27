import * as THREE from 'three';

let _skinnedShadowDepth: THREE.MeshDepthMaterial | undefined;
let _rigidShadowDepth: THREE.MeshDepthMaterial | undefined;

function createShadowDepthMaterial(skinning: boolean): THREE.MeshDepthMaterial {
  const mat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    name: skinning ? 'OdysseySkinnedShadowDepth' : 'OdysseyRigidShadowDepth',
  });
  if(skinning){
    (mat as any).skinning = true;
  }
  return mat;
}

/** Shared depth material template for skinned shadow casters. */
export function getOdysseySkinnedShadowDepthMaterial(): THREE.MeshDepthMaterial {
  if(!_skinnedShadowDepth){
    _skinnedShadowDepth = createShadowDepthMaterial(true);
  }
  return _skinnedShadowDepth;
}

/** Shared rigid depth material for weapon/placeable shadow-map casting. */
export function getOdysseyRigidShadowDepthMaterial(): THREE.MeshDepthMaterial {
  if(!_rigidShadowDepth){
    _rigidShadowDepth = createShadowDepthMaterial(false);
  }
  return _rigidShadowDepth;
}

/** Copy alpha map / cutout from source Odyssey material for shadow casters. */
export function syncShadowCasterDepthMaterialFromSource(
  depthMat: THREE.MeshDepthMaterial | undefined,
  source: THREE.Material | THREE.Material[]
): void {
  if(!depthMat){ return; }
  const mats = Array.isArray(source) ? source : [source];
  let map: THREE.Texture | null = null;
  let alphaTest = 0.5;
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
    if(!mat){ continue; }
    if(mat instanceof THREE.ShaderMaterial){
      const defines = mat.defines || {};
      if('SABER' in defines || 'USE_ODYSSEY_BEAMING' in defines || 'FORCE_SHIELD' in defines){
        continue;
      }
      if(mat.uniforms?.map?.value instanceof THREE.Texture){
        map = mat.uniforms.map.value;
      }
      if(mat.alphaTest > 0){
        alphaTest = mat.alphaTest;
      }
      break;
    }
    if((mat as THREE.MeshStandardMaterial).map){
      map = (mat as THREE.MeshStandardMaterial).map;
      if(mat.alphaTest > 0){
        alphaTest = mat.alphaTest;
      }
      break;
    }
  }
  depthMat.map = map;
  depthMat.alphaTest = map ? alphaTest : 0;
  depthMat.side = THREE.DoubleSide;
  depthMat.needsUpdate = true;
}

/** Materials excluded from shadow-map casting. */
export function isOdysseyShadowCasterMaterial(material: THREE.Material): boolean {
  if(material instanceof THREE.ShaderMaterial){
    const defines = material.defines || {};
    if('SABER' in defines || 'FORCE_SHIELD' in defines || 'USE_ODYSSEY_BEAMING' in defines){ return false; }
    if(material.userData.beaming){ return false; }
    if(material.blending === THREE.AdditiveBlending){ return false; }
  }
  return true;
}

export function shouldExcludeOdysseyShadowCasterMesh(mesh: THREE.Mesh): boolean {
  if(mesh.userData.isForceShield || mesh.userData.beaming){ return true; }
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for(let i = 0; i < mats.length; i++){
    if(!isOdysseyShadowCasterMaterial(mats[i])){ return true; }
  }
  return false;
}

/** Assign RGBA-packed, alpha-tested depth materials to shadow casters. */
export function applyOdysseyShadowCasterDepthMaterials(mesh: THREE.Mesh | THREE.SkinnedMesh): void {
  if(shouldExcludeOdysseyShadowCasterMesh(mesh)){
    mesh.castShadow = false;
    mesh.customDepthMaterial = undefined;
    mesh.customDistanceMaterial = undefined;
    return;
  }
  // Skinned meshes need one too: Three's built-in shadow depth material uses
  // BasicDepthPacking (8-bit 1 - z), but receivers decode RGBA-packed depth.
  // Skinning is picked from the mesh, so the same material type works for both.
  const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
  let depthMat = mesh.userData.odysseyShadowDepthMat as THREE.MeshDepthMaterial | undefined;
  if(!depthMat){
    depthMat = (skinned
      ? getOdysseySkinnedShadowDepthMaterial()
      : getOdysseyRigidShadowDepthMaterial()
    ).clone();
    mesh.userData.odysseyShadowDepthMat = depthMat;
  }
  syncShadowCasterDepthMaterialFromSource(depthMat, mesh.material);
  mesh.customDepthMaterial = depthMat;
  mesh.customDistanceMaterial = depthMat;
}

let _mergedShadowDepth: THREE.MeshDepthMaterial | undefined;

/**
 * RGBA-packed depth for merged multi-material static meshes. One depth material
 * covers every group, so no per-texture alpha test (matches the old default).
 */
export function applyOdysseyMergedShadowCasterDepthMaterial(mesh: THREE.Mesh): void {
  if(!_mergedShadowDepth){
    _mergedShadowDepth = createShadowDepthMaterial(false);
    _mergedShadowDepth.alphaTest = 0;
    _mergedShadowDepth.name = 'OdysseyMergedShadowDepth';
  }
  mesh.customDepthMaterial = _mergedShadowDepth;
  mesh.customDistanceMaterial = _mergedShadowDepth;
}
