import * as THREE from 'three';
import {
  getOdysseyDepthPrepassMaterial,
} from '@/three/odyssey/OdysseyDepthPrepassMaterial';

function shouldHideFromDepthPrepass(obj: THREE.Object3D): boolean {
  if((obj as any).type === 'OdysseyEmitter'){
    return true;
  }
  const mesh = obj as THREE.Mesh;
  if(!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh){
    return false;
  }
  if(!mesh.visible){
    return false;
  }
  if(mesh.userData.isForceShield){
    return true;
  }
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
    if(!mat){ continue; }
    if(mat instanceof THREE.ShaderMaterial){
      const defines = mat.defines || {};
      if('SABER' in defines || 'USE_ODYSSEY_BEAMING' in defines || 'FORCE_SHIELD' in defines){
        return true;
      }
      if(mat.userData.beaming || !mat.visible){
        return true;
      }
    }
    if(mat.blending === THREE.AdditiveBlending){
      return true;
    }
  }
  return false;
}

/**
 * Hide emitters, beaming, sabers, and additive meshes during depth prepass.
 * Returns objects whose visibility was toggled (restore after pass).
 */
export function hideDepthPrepassNonCasters(root: THREE.Object3D): THREE.Object3D[] {
  const hidden: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if(shouldHideFromDepthPrepass(obj)){
      obj.visible = false;
      hidden.push(obj);
    }
  });
  return hidden;
}

export function restoreDepthPrepassHidden(hidden: THREE.Object3D[]): void {
  for(let i = 0; i < hidden.length; i++){
    hidden[i].visible = true;
  }
}

export interface IOdysseyDepthPrepassOptions {
  scene: THREE.Scene | THREE.Object3D;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  depthTarget: THREE.WebGLRenderTarget;
}

/**
 * Fill depthTarget with scene depth using a cheap override material for soft particles.
 */
export function runOdysseyDepthPrepass(options: IOdysseyDepthPrepassOptions): void {
  const { scene, renderer, camera, depthTarget } = options;
  const hidden = hideDepthPrepassNonCasters(scene);

  const depthMat = getOdysseyDepthPrepassMaterial();
  const prevOverride = scene.overrideMaterial;
  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;

  scene.overrideMaterial = depthMat;
  renderer.setRenderTarget(depthTarget);
  renderer.autoClear = false;
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  scene.overrideMaterial = prevOverride ?? null;
  renderer.setRenderTarget(prevTarget);
  renderer.autoClear = prevAutoClear;
  restoreDepthPrepassHidden(hidden);
}
