import * as THREE from 'three';

/** Shared depth-only material for SSCS / soft-particle depth prepass. */
let _sharedDepthMaterial: THREE.MeshDepthMaterial | undefined;

export function getOdysseyDepthPrepassMaterial(): THREE.MeshDepthMaterial {
  if(!_sharedDepthMaterial){
    _sharedDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.BasicDepthPacking,
      alphaTest: 0.5,
    });
    _sharedDepthMaterial.name = 'OdysseyDepthPrepass';
  }
  return _sharedDepthMaterial;
}

/** Copy alpha map / cutout from source material for weapon cutouts during prepass. */
export function syncDepthPrepassMaterialFromSource(
  depthMat: THREE.MeshDepthMaterial,
  source: THREE.Material | THREE.Material[]
): void {
  const mats = Array.isArray(source) ? source : [source];
  let map: THREE.Texture | null = null;
  let alphaTest = 0.5;
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
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
  depthMat.alphaTest = alphaTest;
  depthMat.needsUpdate = true;
}
