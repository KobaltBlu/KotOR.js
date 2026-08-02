import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import { MiniGameType } from '@/enums/engine/MiniGameType';
import {
  MiniGameAspectMaskShader,
  MINIGAME_SAFE_ASPECT,
} from '@/shaders/pass/MiniGameAspectMaskShader';

/**
 * MiniGameAspectMaskPass — hard 4:3 black bars for swoop / turret.
 *
 * Place after MG HUD + framebuffer FX and before GUI so menus / fade /
 * cursor stay full-bleed while the world is masked to retail framing.
 *
 * @file MiniGameAspectMaskPass.ts
 */
export class MiniGameAspectMaskPass extends Pass {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  constructor() {
    super();

    this.uniforms = THREE.UniformsUtils.clone(MiniGameAspectMaskShader.uniforms);
    this.uniforms.uSafeAspect.value = MINIGAME_SAFE_ASPECT;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: MiniGameAspectMaskShader.vertexShader,
      fragmentShader: MiniGameAspectMaskShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.fsQuad = new FullScreenQuad(this.material);
    this.needsSwap = true;
    this.clear = false;
    this.enabled = false;
  }

  /** No per-type styling — black bars for all minigames. */
  setMiniGameType(_type: MiniGameType | number | undefined) {
    // intentionally empty
  }

  setResolution(width: number, height: number) {
    (this.uniforms.uResolution.value as THREE.Vector2).set(
      Math.max(width, 1),
      Math.max(height, 1)
    );
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime: number = 0
  ) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.setResolution(readBuffer.width, readBuffer.height);
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
