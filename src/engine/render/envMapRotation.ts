import * as THREE from "three";

/**
 * DoEnvMapTransform — texture-matrix multiply by camera
 * orientation (translation zero). Eye-space reflection × this matrix → world
 * cubemap direction (same as FFP GL_REFLECTION_MAP + camera quaternion matrix).
 */
export function envMapRotationFromCamera(
  camera: THREE.Camera | undefined,
  target: THREE.Matrix3
): THREE.Matrix3 {
  if(!camera){
    return target.identity();
  }
  camera.updateMatrixWorld();
  // Upper 3×3 of matrixWorld: camera local → world (rotation + scale; cameras are unscaled).
  return target.setFromMatrix4(camera.matrixWorld);
}

const _scratch = new THREE.Matrix3();
/** Not a userData flag: clone() copies userData but not onBeforeRender. */
const _hooked = new WeakSet<THREE.Material>();

/**
 * Upload the render camera's rotation to a USE_ENVMAP material. Only requests a
 * uniform upload when the value changed. No-op until USE_ENVMAP is defined.
 * Expects `camera.matrixWorld` to be current (true inside onBeforeRender).
 */
export function applyEnvMapRotation(
  material: THREE.ShaderMaterial,
  camera: THREE.Camera | undefined
): void {
  const uniforms = material.uniforms;
  if(!uniforms){ return; }
  if(!Object.prototype.hasOwnProperty.call(material.defines || {}, 'USE_ENVMAP')){
    return;
  }
  // Own the Matrix3 — ShaderLib clone aliases the same identity across materials.
  if(!uniforms.envMapRotation || material.userData.odysseyEnvMapRotOwned !== true){
    uniforms.envMapRotation = { value: new THREE.Matrix3() };
    material.userData.odysseyEnvMapRotOwned = true;
  }
  if(camera){
    _scratch.setFromMatrix4(camera.matrixWorld);
  }else{
    _scratch.identity();
  }
  const target = uniforms.envMapRotation.value as THREE.Matrix3;
  if(target.equals(_scratch)){ return; }
  target.copy(_scratch);
  // Same material drawn back-to-back skips the uniform refresh without this.
  material.uniformsNeedUpdate = true;
}

/**
 * Track the render camera on every draw. Lighting binds are throttled and
 * cached, so uploading only at bind time left reflections lagging the camera
 * and snapping whenever a bind got through. Safe to call more than once, and
 * before USE_ENVMAP is defined (the cubemap may load later).
 */
export function installEnvMapRotationHook(material: THREE.ShaderMaterial): void {
  if(_hooked.has(material)){ return; }
  _hooked.add(material);
  const previous = material.onBeforeRender;
  material.onBeforeRender = function onOdysseyEnvMapBeforeRender(renderer, scene, camera, geometry, object, group){
    if(typeof previous === 'function'){
      previous.call(this, renderer, scene, camera, geometry, object, group);
    }
    applyEnvMapRotation(this as THREE.ShaderMaterial, camera);
  };
}

