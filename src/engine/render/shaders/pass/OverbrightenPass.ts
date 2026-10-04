import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import {
  OverbrightenShader,
  createOverbrightenLutTexture,
} from '@engine/render/shaders/pass/OverbrightenShader';

/**
 * OverbrightenPass — FrameBufferModifications bit 0x01.
 *
 * @file OverbrightenPass.ts
 */
export class OverbrightenPass extends Pass {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;
  private lut: THREE.DataTexture;

  constructor() {
    super();

    this.lut = createOverbrightenLutTexture();
    this.uniforms = THREE.UniformsUtils.clone(OverbrightenShader.uniforms);
    this.uniforms.tLut.value = this.lut;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: OverbrightenShader.vertexShader,
      fragmentShader: OverbrightenShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.fsQuad = new FullScreenQuad(this.material);
    this.needsSwap = true;
    this.clear = false;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.fsQuad.material = this.material;

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
    this.material.dispose();
    this.fsQuad.dispose();
    this.lut.dispose();
  }
}
