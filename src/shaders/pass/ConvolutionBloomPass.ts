import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import {
  BrightExtractShader,
  KawaseBlurShader,
  AdditiveCompositeShader,
  createBrightExtractLutTexture,
} from '@/shaders/pass/ConvolutionBloomShader';

/**
 * ConvolutionBloomPass — retail FrameBufferModifications bit 0x02
 * (RenderOverlayConvolution @ 0042c6e0).
 *
 * Downsample → bright-extract LUT → blur cascade → additive composite.
 *
 * @file ConvolutionBloomPass.ts
 */
export class ConvolutionBloomPass extends Pass {
  private lut: THREE.DataTexture;
  private extractMaterial: THREE.ShaderMaterial;
  private blurMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;
  private fsQuad: FullScreenQuad;

  private brightRT: THREE.WebGLRenderTarget | null = null;
  private blurRT0: THREE.WebGLRenderTarget | null = null;
  private blurRT1: THREE.WebGLRenderTarget | null = null;

  constructor() {
    super();

    this.lut = createBrightExtractLutTexture();

    this.extractMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(BrightExtractShader.uniforms),
      vertexShader: BrightExtractShader.vertexShader,
      fragmentShader: BrightExtractShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.extractMaterial.uniforms.tLut.value = this.lut;

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(KawaseBlurShader.uniforms),
      vertexShader: KawaseBlurShader.vertexShader,
      fragmentShader: KawaseBlurShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AdditiveCompositeShader.uniforms),
      vertexShader: AdditiveCompositeShader.vertexShader,
      fragmentShader: AdditiveCompositeShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.fsQuad = new FullScreenQuad(this.extractMaterial);
    this.needsSwap = true;
    this.clear = false;
  }

  private ensureTargets(w: number, h: number) {
    const bw = Math.max(1, Math.floor(w / 2));
    const bh = Math.max(1, Math.floor(h / 2));
    if(
      this.brightRT &&
      this.brightRT.width === bw &&
      this.brightRT.height === bh
    ){
      return;
    }
    this.disposeTargets();
    const opts: THREE.WebGLRenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.brightRT = new THREE.WebGLRenderTarget(bw, bh, opts);
    this.blurRT0 = new THREE.WebGLRenderTarget(bw, bh, opts);
    this.blurRT1 = new THREE.WebGLRenderTarget(bw, bh, opts);
  }

  private disposeTargets() {
    this.brightRT?.dispose();
    this.blurRT0?.dispose();
    this.blurRT1?.dispose();
    this.brightRT = null;
    this.blurRT0 = null;
    this.blurRT1 = null;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    this.ensureTargets(readBuffer.width, readBuffer.height);
    const bright = this.brightRT!;
    const blur0 = this.blurRT0!;
    const blur1 = this.blurRT1!;

    // 1) Bright extract into half-res
    this.extractMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.fsQuad.material = this.extractMaterial;
    renderer.setRenderTarget(bright);
    this.fsQuad.render(renderer);

    // 2) Kawase-style blur passes (MipmapFilter / BloomFilter stand-in)
    const ping = [blur0, blur1];
    let readIdx = 0;
    let writeSrc: THREE.WebGLRenderTarget = bright;
    const offsets = [1.0, 2.0, 3.0, 2.0];
    for(const o of offsets){
      const dst = ping[readIdx];
      this.blurMaterial.uniforms.tDiffuse.value = writeSrc.texture;
      this.blurMaterial.uniforms.offset.value.set(
        o / writeSrc.width,
        o / writeSrc.height
      );
      this.fsQuad.material = this.blurMaterial;
      renderer.setRenderTarget(dst);
      this.fsQuad.render(renderer);
      writeSrc = dst;
      readIdx = 1 - readIdx;
    }

    // 3) Additive composite onto full-res scene
    this.compositeMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.compositeMaterial.uniforms.tBloom.value = writeSrc.texture;
    this.fsQuad.material = this.compositeMaterial;

    if(this.renderToScreen){
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    }else{
      renderer.setRenderTarget(writeBuffer);
      if(this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }

  dispose() {
    this.extractMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.fsQuad.dispose();
    this.lut.dispose();
    this.disposeTargets();
  }
}
