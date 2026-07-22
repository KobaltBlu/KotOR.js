import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import { ForceDistortionShader } from '@/shaders/pass/ForceDistortionShader';

/**
 * Stencil bit for force-distortion masks. Retail uses bit 0 (mask 1) after
 * DoEmitterBucket clears stencil. KotOR.js shadow disks keep bits 0–7 during
 * the scene pass, so emitters write bit 7 (0x80) instead — avoids clobbering
 * shadow Equal refs for lights 0–6.
 */
export const FORCE_DISTORTION_STENCIL_BIT = 0x80;

/**
 * ForceDistortionPass — retail RenderForceDistortion fullscreen warp.
 *
 * Emitters write stencil during the scene (colorWrite off). This pass copies
 * scene color then warps in-place with glStencilFunc(NOTEQUAL, 0, bit)
 * (needsSwap = false so stencil stays on readBuffer).
 *
 * @file ForceDistortionPass.ts
 */
export class ForceDistortionPass extends Pass {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  private copyMaterial: THREE.ShaderMaterial;
  private copyQuad: FullScreenQuad;
  private colorCopy: THREE.WebGLRenderTarget | null = null;

  constructor(distortionTexture: THREE.Texture | null = null) {
    super();

    this.uniforms = THREE.UniformsUtils.clone(ForceDistortionShader.uniforms);
    this.uniforms.tDistortion.value = distortionTexture;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: ForceDistortionShader.vertexShader,
      fragmentShader: ForceDistortionShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      // Enable stencil *test* (three.js gates on stencilWrite)
      stencilWrite: true,
      stencilWriteMask: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilRef: 0,
      stencilFuncMask: FORCE_DISTORTION_STENCIL_BIT,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
    });

    this.fsQuad = new FullScreenQuad(this.material);

    const copyUniforms = THREE.UniformsUtils.clone(CopyShader.uniforms);
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: copyUniforms,
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    this.copyQuad = new FullScreenQuad(this.copyMaterial);

    this.needsSwap = false;
    this.clear = false;
  }

  setDistortionTexture(texture: THREE.Texture | null) {
    this.uniforms.tDistortion.value = texture;
  }

  private ensureColorCopy(source: THREE.WebGLRenderTarget) {
    const w = source.width;
    const h = source.height;
    if(
      this.colorCopy &&
      this.colorCopy.width === w &&
      this.colorCopy.height === h
    ){
      return;
    }
    if(this.colorCopy){
      this.colorCopy.dispose();
    }
    this.colorCopy = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    if(!this.uniforms.tDistortion.value) return;

    this.ensureColorCopy(readBuffer);

    // Copy scene color (retail glCopyTexSubImage2D) — leave stencil intact
    this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.colorCopy);
    this.copyQuad.render(renderer);

    // Warp into readBuffer; stencil test uses emitter mask bit
    this.uniforms.tDiffuse.value = this.colorCopy!.texture;
    this.fsQuad.material = this.material;

    if(this.renderToScreen){
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    }else{
      renderer.setRenderTarget(readBuffer);
      this.fsQuad.render(renderer);
    }
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
    this.copyMaterial.dispose();
    this.copyQuad.dispose();
    if(this.colorCopy){
      this.colorCopy.dispose();
      this.colorCopy = null;
    }
  }
}
