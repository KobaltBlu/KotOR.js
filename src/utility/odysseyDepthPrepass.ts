import * as THREE from 'three';
import {
  getOdysseyDepthPrepassMaterial,
} from '@/three/odyssey/OdysseyDepthPrepassMaterial';
import { RenderPerfStats } from '@/utility/RenderPerfStats';

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

function isSoftDepthEmitter(obj: THREE.Object3D): boolean {
  if((obj as any).type !== 'OdysseyEmitter') return false;
  const mesh = obj as THREE.Mesh;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
    if(mat instanceof THREE.ShaderMaterial && mat.defines && 'DEPTH_TEXTURE' in mat.defines){
      return true;
    }
  }
  return false;
}

function isDrawableMesh(obj: THREE.Object3D): boolean {
  const mesh = obj as THREE.Mesh;
  return (
    (obj as any).type === 'OdysseyEmitter' ||
    mesh.isMesh ||
    (mesh as THREE.SkinnedMesh).isSkinnedMesh
  );
}

/** Soft emitters + other visible drawables collected in one scene walk. */
export interface SoftDepthSplitLists {
  softEmitters: THREE.Object3D[];
  otherDrawables: THREE.Object3D[];
}

/**
 * Single traverse for the soft-depth split: collect soft DEPTH_TEXTURE emitters
 * and every other visible drawable (to hide during the soft-only overlay).
 */
export function collectSoftDepthSplitLists(root: THREE.Object3D): SoftDepthSplitLists {
  const softEmitters: THREE.Object3D[] = [];
  const otherDrawables: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if(!obj.visible) return;
    if(!isDrawableMesh(obj)) return;
    if(isSoftDepthEmitter(obj)){
      softEmitters.push(obj);
    }else{
      otherDrawables.push(obj);
    }
  });
  return { softEmitters, otherDrawables };
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

/** Hide only soft DEPTH_TEXTURE emitters for the opaque color+depth draw. */
export function hideSoftDepthEmitters(root: THREE.Object3D): THREE.Object3D[] {
  const hidden: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if(obj.visible && isSoftDepthEmitter(obj)){
      obj.visible = false;
      hidden.push(obj);
    }
  });
  return hidden;
}

/**
 * Hide everything except soft DEPTH_TEXTURE emitters (for the soft-only overlay pass).
 */
export function isolateSoftDepthEmitters(root: THREE.Object3D): THREE.Object3D[] {
  const hidden: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if(!obj.visible) return;
    if(!isDrawableMesh(obj)) return;
    if(isSoftDepthEmitter(obj)) return;
    obj.visible = false;
    hidden.push(obj);
  });
  return hidden;
}

export function restoreDepthPrepassHidden(hidden: THREE.Object3D[]): void {
  for(let i = 0; i < hidden.length; i++){
    hidden[i].visible = true;
  }
}

function setVisibleFalse(objects: THREE.Object3D[]): void {
  for(let i = 0; i < objects.length; i++){
    objects[i].visible = false;
  }
}

/** Point soft emitters at a depth texture for tDepth sampling. */
export function bindSoftEmitterDepthTexture(
  root: THREE.Object3D,
  depthTex: THREE.DepthTexture | null,
  softEmitters?: THREE.Object3D[]
): void {
  if(!depthTex) return;
  const list = softEmitters ?? (() => {
    const found: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if(isSoftDepthEmitter(obj)) found.push(obj);
    });
    return found;
  })();
  for(let i = 0; i < list.length; i++){
    const mesh = list[i] as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for(let j = 0; j < mats.length; j++){
      const mat = mats[j];
      if(!(mat instanceof THREE.ShaderMaterial) || !mat.uniforms?.tDepth) continue;
      mat.uniforms.tDepth.value = depthTex;
    }
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
 * Kept as WebGL1 / blit-failure fallback.
 */
export function runOdysseyDepthPrepass(options: IOdysseyDepthPrepassOptions): void {
  const { scene, renderer, camera, depthTarget } = options;
  const hidden = hideDepthPrepassNonCasters(scene);

  const depthMat = getOdysseyDepthPrepassMaterial();
  const prevOverride = (scene as THREE.Scene).overrideMaterial;
  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;

  (scene as THREE.Scene).overrideMaterial = depthMat;
  renderer.setRenderTarget(depthTarget);
  renderer.autoClear = false;
  renderer.clear(true, true, true);
  renderer.render(scene as THREE.Scene, camera);

  (scene as THREE.Scene).overrideMaterial = prevOverride ?? null;
  renderer.setRenderTarget(prevTarget);
  renderer.autoClear = prevAutoClear;
  restoreDepthPrepassHidden(hidden);
}

export interface IOdysseySoftDepthSplitOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  /** Composer color target that receives the world draw (usually readBuffer). */
  colorTarget: THREE.WebGLRenderTarget;
  /** Separate RT whose depthTexture soft emitters sample (avoids FBO feedback). */
  depthSampleTarget: THREE.WebGLRenderTarget;
}

/**
 * Draw soft DEPTH_TEXTURE emitters only into colorTarget (opaque already present).
 */
function drawSoftEmittersOverlay(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  colorTarget: THREE.WebGLRenderTarget,
  depthSampleTarget: THREE.WebGLRenderTarget,
  lists: SoftDepthSplitLists
): void {
  bindSoftEmitterDepthTexture(scene, depthSampleTarget.depthTexture, lists.softEmitters);
  setVisibleFalse(lists.otherDrawables);
  renderer.setRenderTarget(colorTarget);
  renderer.clear(false, false, false);
  renderer.render(scene, camera);
  restoreDepthPrepassHidden(lists.otherDrawables);
}

/**
 * One opaque color+depth draw into colorTarget, blit depth to depthSampleTarget,
 * then soft DEPTH_TEXTURE emitters only. Returns true when colorTarget already
 * holds the world (caller should disable RenderPass). On blit failure the opaque
 * color is kept, depth is filled via MeshDepthMaterial prepass, and soft emitters
 * are still overlaid — still returns true to avoid a second full world draw.
 */
export function runOdysseySoftDepthSplit(options: IOdysseySoftDepthSplitOptions): boolean {
  const { scene, renderer, camera, colorTarget, depthSampleTarget } = options;
  const gl = renderer.getContext();
  const isWebGL2 =
    typeof WebGL2RenderingContext !== 'undefined' &&
    gl instanceof WebGL2RenderingContext;

  // One traverse for hide / isolate / bind instead of three full walks.
  const lists = collectSoftDepthSplitLists(scene);
  if(lists.softEmitters.length === 0){
    // Flag was stale — let RenderPass draw the frame normally.
    return false;
  }

  ensureDepthTexture(colorTarget, renderer);
  ensureDepthTexture(depthSampleTarget, renderer);

  setVisibleFalse(lists.softEmitters);
  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;

  renderer.setRenderTarget(colorTarget);
  renderer.autoClear = false;
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  let blitOk = false;
  if(isWebGL2){
    blitOk = blitFramebufferDepth(renderer, colorTarget, depthSampleTarget);
  }

  restoreDepthPrepassHidden(lists.softEmitters);

  if(!blitOk){
    RenderPerfStats.noteSoftDepthBlitFail();
    // Opaque color already in colorTarget — only refill depth, then soft overlay.
    runOdysseyDepthPrepass({
      scene,
      renderer,
      camera,
      depthTarget: depthSampleTarget,
    });
    drawSoftEmittersOverlay(scene, renderer, camera, colorTarget, depthSampleTarget, lists);
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    return true;
  }

  drawSoftEmittersOverlay(scene, renderer, camera, colorTarget, depthSampleTarget, lists);

  renderer.setRenderTarget(prevTarget);
  renderer.autoClear = prevAutoClear;
  return true;
}

function ensureDepthTexture(
  rt: THREE.WebGLRenderTarget,
  renderer: THREE.WebGLRenderer
): void {
  if(rt.depthTexture) {
    if(!rt.depthTexture.image){
      rt.depthTexture.image = { width: rt.width, height: rt.height } as any;
    }else{
      rt.depthTexture.image.width = rt.width;
      rt.depthTexture.image.height = rt.height;
    }
    return;
  }
  const dt = new THREE.DepthTexture(rt.width, rt.height);
  dt.type = THREE.UnsignedShortType;
  rt.depthTexture = dt;
  rt.depthBuffer = true;
  // Force Three to rebuild the FBO with the depth texture.
  renderer.setRenderTarget(rt);
  renderer.setRenderTarget(null);
}

function blitFramebufferDepth(
  renderer: THREE.WebGLRenderer,
  src: THREE.WebGLRenderTarget,
  dst: THREE.WebGLRenderTarget
): boolean {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  // Ensure both FBOs exist.
  renderer.setRenderTarget(src);
  renderer.setRenderTarget(dst);
  const srcProps = (renderer as any).properties.get(src);
  const dstProps = (renderer as any).properties.get(dst);
  const srcFb = srcProps?.__webglFramebuffer;
  const dstFb = dstProps?.__webglFramebuffer;
  if(!srcFb || !dstFb) return false;

  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, srcFb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstFb);
  gl.blitFramebuffer(
    0, 0, src.width, src.height,
    0, 0, dst.width, dst.height,
    gl.DEPTH_BUFFER_BIT,
    gl.NEAREST
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return true;
}
