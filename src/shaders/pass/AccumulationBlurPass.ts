import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import {
  AccumulationBlurShader,
  RETAIL_ACCUMULATION_SIZE,
} from '@/shaders/pass/AccumulationBlurShader';

/**
 * AccumulationBlurPass — retail FrameBufferModifications bit 0x10
 * (RenderAccumulationBlur + RenderFrameToTexture @ 004337a0).
 *
 * Previous frame is stored in a fixed 128x128 buffer (retail pbuffer). Upsampling
 * that soft buffer while mixing with the current full-res frame is what gives
 * Force Speed / swoop their characteristic smear.
 *
 * First enabled frame (or after reset) copies through and seeds the buffer —
 * matches previousFrameWasSpeed / firstFrameBufferFrame gating.
 *
 * @file AccumulationBlurPass.ts
 */
export class AccumulationBlurPass extends Pass {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  private copyMaterial: THREE.ShaderMaterial;
  private copyQuad: FullScreenQuad;
  private accumRT: THREE.WebGLRenderTarget | null = null;
  /** Retail previousFrameWasSpeed — skip mix until one frame has been saved. */
  private hasPreviousFrame = false;

  constructor(ratio: number = 0.75) {
    super();

    this.uniforms = THREE.UniformsUtils.clone(AccumulationBlurShader.uniforms);
    this.uniforms.ratio.value = ratio;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: AccumulationBlurShader.vertexShader,
      fragmentShader: AccumulationBlurShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
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

    this.needsSwap = true;
    this.clear = false;
  }

  get ratio(): number {
    return this.uniforms.ratio.value as number;
  }

  set ratio(value: number) {
    this.uniforms.ratio.value = value;
  }

  /** AurDisableSpeedBlur / first-frame reset — drop accumulated history. */
  resetAccumulation() {
    this.hasPreviousFrame = false;
  }

  private ensureAccum() {
    if(this.accumRT){ return; }
    this.accumRT = new THREE.WebGLRenderTarget(
      RETAIL_ACCUMULATION_SIZE,
      RETAIL_ACCUMULATION_SIZE,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
      }
    );
  }

  private blitCopy(
    renderer: THREE.WebGLRenderer,
    src: THREE.Texture,
    dst: THREE.WebGLRenderTarget | null
  ) {
    this.copyMaterial.uniforms.tDiffuse.value = src;
    this.copyQuad.material = this.copyMaterial;
    renderer.setRenderTarget(dst);
    this.copyQuad.render(renderer);
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    this.ensureAccum();
    const accum = this.accumRT!;
    const outTarget = this.renderToScreen ? null : writeBuffer;

    if(this.hasPreviousFrame){
      this.uniforms.tPrev.value = accum.texture;
      this.uniforms.tCurrent.value = readBuffer.texture;
      this.fsQuad.material = this.material;
      renderer.setRenderTarget(outTarget);
      if(this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }else{
      // First frame: passthrough current scene, then seed accumulation.
      this.blitCopy(renderer, readBuffer.texture, outTarget);
    }

    // RenderFrameToTexture — downsample the post-mix framebuffer into 128^2.
    if(this.renderToScreen){
      this.blitCopy(renderer, readBuffer.texture, accum);
    }else{
      this.blitCopy(renderer, writeBuffer.texture, accum);
    }
    this.hasPreviousFrame = true;
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
    this.copyMaterial.dispose();
    this.copyQuad.dispose();
    if(this.accumRT){
      this.accumRT.dispose();
      this.accumRT = null;
    }
  }
}