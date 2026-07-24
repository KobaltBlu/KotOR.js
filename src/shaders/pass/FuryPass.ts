import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import { FuryShader } from '@/shaders/pass/FuryShader';

/**
 * FuryPass — K2 force fury overlay (fx_Fury01/02/03).
 *
 * @file FuryPass.ts
 */
export class FuryPass extends Pass {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  constructor() {
    super();

    this.uniforms = THREE.UniformsUtils.clone(FuryShader.uniforms);

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: FuryShader.vertexShader,
      fragmentShader: FuryShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.fsQuad = new FullScreenQuad(this.material);
    this.needsSwap = true;
    this.clear = false;
    this.enabled = false;
  }

  setFuryTexture(texture: THREE.Texture | null) {
    this.uniforms.tFury.value = texture;
  }

  setDistortionTexture(texture: THREE.Texture | null) {
    this.uniforms.tDistortion.value = texture;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ) {
    if(!this.uniforms.tFury.value) return;

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
