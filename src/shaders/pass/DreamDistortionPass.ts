import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import { DreamDistortionShader } from '@/shaders/pass/DreamDistortionShader';

/**
 * DreamDistortionPass — K2 clairvoyance / dream fullscreen warp.
 *
 * @file DreamDistortionPass.ts
 */
export class DreamDistortionPass extends Pass {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  constructor(distortionTexture: THREE.Texture | null = null) {
    super();

    this.uniforms = THREE.UniformsUtils.clone(DreamDistortionShader.uniforms);
    this.uniforms.tDistortion.value = distortionTexture;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: DreamDistortionShader.vertexShader,
      fragmentShader: DreamDistortionShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.fsQuad = new FullScreenQuad(this.material);
    this.needsSwap = true;
    this.clear = false;
    this.enabled = false;
  }

  setDistortionTexture(texture: THREE.Texture | null) {
    this.uniforms.tDistortion.value = texture;
  }

  setFullMode(full: boolean) {
    this.uniforms.fullMode.value = full ? 1 : 0;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    if(!this.uniforms.tDistortion.value) return;

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
  }
}
