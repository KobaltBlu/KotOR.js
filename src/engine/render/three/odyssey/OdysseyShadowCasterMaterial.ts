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

/** Shared skinned depth material for Three.js shadow-map casting. */
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

/** Assign custom depth materials for alpha-tested rigid shadow casters. */
export function applyOdysseyShadowCasterDepthMaterials(mesh: THREE.Mesh | THREE.SkinnedMesh): void {
  if(shouldExcludeOdysseyShadowCasterMesh(mesh)){
    mesh.castShadow = false;
    mesh.customDepthMaterial = undefined;
    mesh.customDistanceMaterial = undefined;
    return;
  }
  const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
  if(skinned){
    // Let Three.js pick a skinned MeshDepthMaterial variant from the mesh object.
    mesh.customDepthMaterial = undefined;
    mesh.customDistanceMaterial = undefined;
    return;
  }
  let depthMat = mesh.userData.odysseyShadowDepthMat as THREE.MeshDepthMaterial | undefined;
  if(!depthMat){
    depthMat = getOdysseyRigidShadowDepthMaterial().clone();
    mesh.userData.odysseyShadowDepthMat = depthMat;
  }
  syncShadowCasterDepthMaterialFromSource(depthMat, mesh.material);
  mesh.customDepthMaterial = depthMat;
  mesh.customDistanceMaterial = depthMat;
}
