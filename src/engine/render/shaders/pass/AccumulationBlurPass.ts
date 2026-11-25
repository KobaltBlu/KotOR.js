import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import {
  AccumulationBlurShader,
  ODYSSEY_ACCUMULATION_SIZE,
} from '@engine/render/shaders/pass/AccumulationBlurShader';

/**
 * AccumulationBlurPass — FrameBufferModifications bit 0x10
 * (RenderAccumulationBlur + RenderFrameToTexture).
 *
 * Previous frame is stored in a fixed 128x128 buffer (pbuffer). Upsampling
 * that soft buffer while mixing with the current full-res frame is what gives
 * Force Speed / swoop their characteristic smear.
 *
 * First enabled frame (or after reset) copies through and seeds the buffer
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
  /** Full-res color-only mix target; copied back so readBuffer keeps its stencil. */
  private mixRT: THREE.WebGLRenderTarget | null = null;
  /** previousFrameWasSpeed — skip mix until one frame has been saved. */
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

    // In-place like the single retail framebuffer: readBuffer keeps the scene
    // stencil (emitter force-distortion mask) for ForceDistortionPass.
    this.needsSwap = false;
    this.clear = false;
  }

  get ratio(): number {
    return this.uniforms.ratio.value as number;
  }

  set ratio(value: number) {
    this.uniforms.ratio.value = value;
  }

  /** Disable speed blur / first-frame reset — drop accumulated history. */
  resetAccumulation() {
    this.hasPreviousFrame = false;
  }

  private ensureAccum() {
    if(this.accumRT){ return; }
    this.accumRT = new THREE.WebGLRenderTarget(
      ODYSSEY_ACCUMULATION_SIZE,
      ODYSSEY_ACCUMULATION_SIZE,
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

  private ensureMix(source: THREE.WebGLRenderTarget) {
    if(this.mixRT && this.mixRT.width === source.width && this.mixRT.height === source.height){
      return;
    }
    this.mixRT?.dispose();
    this.mixRT = new THREE.WebGLRenderTarget(source.width, source.height, {
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
    this.ensureAccum();
    const accum = this.accumRT!;

    if(this.renderToScreen){
      if(this.hasPreviousFrame){
        this.uniforms.tPrev.value = accum.texture;
        this.uniforms.tCurrent.value = readBuffer.texture;
        this.fsQuad.material = this.material;
        renderer.setRenderTarget(null);
        this.fsQuad.render(renderer);
      }else{
        this.blitCopy(renderer, readBuffer.texture, null);
      }
      this.blitCopy(renderer, readBuffer.texture, accum);
      this.hasPreviousFrame = true;
      return;
    }

    // RenderAccumulationBlur in place: mix into a scratch target, then copy the
    // color back into readBuffer (no clear, so its depth/stencil survive).
    if(this.hasPreviousFrame){
      this.ensureMix(readBuffer);
      this.uniforms.tPrev.value = accum.texture;
      this.uniforms.tCurrent.value = readBuffer.texture;
      this.fsQuad.material = this.material;
      renderer.setRenderTarget(this.mixRT);
      this.fsQuad.render(renderer);
      this.blitCopy(renderer, this.mixRT!.texture, readBuffer);
    }
    // First frame: readBuffer already holds the scene — just seed the history.

    // RenderFrameToTexture — downsample the post-mix framebuffer into 128^2.
    this.blitCopy(renderer, readBuffer.texture, accum);
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
    if(this.mixRT){
      this.mixRT.dispose();
      this.mixRT = null;
    }
  }
}