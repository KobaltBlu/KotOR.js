import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import {
  BrightExtractShader,
  DownsampleShader,
  BloomKernel5x5Shader,
  AdditiveCompositeShader,
  createBrightExtractLutTexture,
} from '@/shaders/pass/ConvolutionBloomShader';

/**
 * ConvolutionBloomPass — FrameBufferModifications bit 0x02
 * (RenderOverlayConvolution, GOG K1).
 *
 * cascade: bright-extract @ 512 → MipmapFilter 256 →
 * BloomFilter 5×5 (bloomFiltersATI) with glColor alpha 0.35 burn-in →
 * final SRC_ALPHA/ONE composite at glColor alpha 1. We apply the single
 * ×0.35 at composite (bloom LUT alpha) for the same net intensity.
 * (128/64 mips were never sampled by BloomFilter — not allocated.)
 *
 * Default: composite into writeBuffer + needsSwap (lighter ping-pong FBO,
 * no DepthTexture). When preserveStencil is set (force distortion active),
 * composite additively in-place onto readBuffer so world stencil survives.
 *
 * @file ConvolutionBloomPass.ts
 */
export class ConvolutionBloomPass extends Pass {
  private lut: THREE.DataTexture;
  private extractMaterial: THREE.ShaderMaterial;
  private downsampleMaterial: THREE.ShaderMaterial;
  private bloomMaterial: THREE.ShaderMaterial;
  /** Opaque scene+bloom composite into writeBuffer (common path). */
  private compositeMaterial: THREE.ShaderMaterial;
  /** Additive bloom-only for in-place stencil-preserving path. */
  private inplaceCompositeMaterial: THREE.ShaderMaterial;
  private fsQuad: FullScreenQuad;

  private rt512: THREE.WebGLRenderTarget | null = null;
  private rt256: THREE.WebGLRenderTarget | null = null;
  private rtBloom: THREE.WebGLRenderTarget | null = null;

  /** When true, composite in-place on readBuffer (needsSwap = false). */
  private preserveStencil = false;

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

    this.downsampleMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DownsampleShader.uniforms),
      vertexShader: DownsampleShader.vertexShader,
      fragmentShader: DownsampleShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.bloomMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(BloomKernel5x5Shader.uniforms),
      vertexShader: BloomKernel5x5Shader.vertexShader,
      fragmentShader: BloomKernel5x5Shader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    // UniformsUtils.clone can drop typed-array contents; restore kernel.
    this.bloomMaterial.uniforms.kernel.value = Float32Array.from(
      BloomKernel5x5Shader.uniforms.kernel.value as ArrayLike<number>
    );

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AdditiveCompositeShader.uniforms),
      vertexShader: AdditiveCompositeShader.vertexShader,
      fragmentShader: AdditiveCompositeShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    // In-place additive: emit bloom only with SRC_ALPHA/ONE (no FBO feedback).
    this.inplaceCompositeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AdditiveCompositeShader.uniforms),
      vertexShader: AdditiveCompositeShader.vertexShader,
      fragmentShader: /* glsl */ `
        uniform sampler2D tBloom;
        uniform float bloomStrength;
        varying vec2 vUv;
        void main() {
          vec4 bloom = texture2D( tBloom, vUv );
          float a = bloom.a > 0.0 ? bloom.a : bloomStrength;
          gl_FragColor = vec4( bloom.rgb, a );
        }`,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
      blendEquationAlpha: THREE.AddEquation,
    });

    this.fsQuad = new FullScreenQuad(this.extractMaterial);
    this.needsSwap = true;
    this.clear = false;
  }

  /**
   * Force-distortion frames need world stencil on readBuffer — composite
   * in-place. Otherwise swap into the DepthTexture-free writeBuffer.
   */
  setPreserveStencil(preserve: boolean): void {
    this.preserveStencil = preserve;
    this.needsSwap = !preserve;
  }

  private makeRT(size: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  private ensureTargets() {
    if(this.rt512){ return; }
    // fixed pbuffer cascade sizes (128/64 mips unused by BloomFilter — skipped)
    this.rt512 = this.makeRT(512);
    this.rt256 = this.makeRT(256);
    this.rtBloom = this.makeRT(256);
  }

  private disposeTargets() {
    this.rt512?.dispose();
    this.rt256?.dispose();
    this.rtBloom?.dispose();
    this.rt512 = null;
    this.rt256 = null;
    this.rtBloom = null;
  }

  private blit(
    renderer: THREE.WebGLRenderer,
    material: THREE.ShaderMaterial,
    src: THREE.Texture,
    dst: THREE.WebGLRenderTarget
  ) {
    material.uniforms.tDiffuse.value = src;
    this.fsQuad.material = material;
    renderer.setRenderTarget(dst);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    this.ensureTargets();
    const rt512 = this.rt512!;
    const rt256 = this.rt256!;
    const rtBloom = this.rtBloom!;

    // 1) Bright extract into 512² (convolutionHDCBuffer[3])
    this.blit(renderer, this.extractMaterial, readBuffer.texture, rt512);

    // 2) MipmapFilter: 512 → 256 (128/64 unused by bloom kernel)
    this.blit(renderer, this.downsampleMaterial, rt512.texture, rt256);

    // 3) BloomFilter 5×5 on 256² using the 256 mip (BloomFilter target)
    this.bloomMaterial.uniforms.tDiffuse.value = rt256.texture;
    this.bloomMaterial.uniforms.texelSize.value.set(1 / 256, 1 / 256);
    this.fsQuad.material = this.bloomMaterial;
    renderer.setRenderTarget(rtBloom);
    renderer.clear();
    this.fsQuad.render(renderer);

    // 4) Composite — light writeBuffer (swap) or in-place for stencil
    if(this.preserveStencil){
      this.inplaceCompositeMaterial.uniforms.tBloom.value = rtBloom.texture;
      this.fsQuad.material = this.inplaceCompositeMaterial;
      if(this.renderToScreen){
        renderer.setRenderTarget(null);
      }else{
        renderer.setRenderTarget(readBuffer);
        if(this.clear) renderer.clear();
      }
      this.fsQuad.render(renderer);
      return;
    }

    this.compositeMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.compositeMaterial.uniforms.tBloom.value = rtBloom.texture;
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
    this.downsampleMaterial.dispose();
    this.bloomMaterial.dispose();
    this.compositeMaterial.dispose();
    this.inplaceCompositeMaterial.dispose();
    this.fsQuad.dispose();
    this.lut.dispose();
    this.disposeTargets();
  }
}
