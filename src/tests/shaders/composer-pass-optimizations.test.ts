/**
 * @jest-environment node
 *
 * Locks in composer optimization invariants that do not need a WebGL context.
 */
import * as THREE from 'three';
import { collectSoftDepthSplitLists } from '@/utility/odysseyDepthPrepass';

jest.mock('three/examples/jsm/postprocessing/Pass', () => {
  class Pass {
    enabled = true;
    needsSwap = true;
    clear = false;
    renderToScreen = false;
  }
  class FullScreenQuad {
    material: unknown;
    constructor(material: unknown) {
      this.material = material;
    }
    render() {}
    dispose() {}
  }
  return { Pass, FullScreenQuad };
});

jest.mock('three/examples/jsm/shaders/CopyShader', () => ({
  CopyShader: {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: '',
    fragmentShader: '',
  },
}));

describe('composer pass optimizations', () => {
  it('ConvolutionBloomPass swaps by default; in-place when preserving stencil', async () => {
    const { ConvolutionBloomPass } = await import('@/shaders/pass/ConvolutionBloomPass');
    const pass = new ConvolutionBloomPass();
    expect(pass.needsSwap).toBe(true);
    expect((pass as any).rt128).toBeUndefined();
    (pass as any).ensureTargets();
    expect((pass as any).rt512).toBeTruthy();
    expect((pass as any).rt256).toBeTruthy();
    expect((pass as any).rtBloom).toBeTruthy();
    expect((pass as any).rt128).toBeUndefined();

    pass.setPreserveStencil(true);
    expect(pass.needsSwap).toBe(false);
    pass.setPreserveStencil(false);
    expect(pass.needsSwap).toBe(true);
    pass.dispose();
  });

  it('ForceDistortionPass uses a color-only snapshot scratch', async () => {
    const { ForceDistortionPass } = await import('@/shaders/pass/ForceDistortionPass');
    const pass = new ForceDistortionPass();
    expect(pass.needsSwap).toBe(false);
    expect((pass as any).colorCopy).toBeNull();
    const source = new THREE.WebGLRenderTarget(8, 8);
    (pass as any).ensureColorCopy(source);
    expect((pass as any).colorCopy).toBeTruthy();
    expect((pass as any).colorCopy.depthBuffer).toBe(false);
    expect((pass as any).colorCopy.stencilBuffer).toBe(false);
    source.dispose();
    pass.dispose();
  });

  it('collectSoftDepthSplitLists gathers soft emitters in one walk', () => {
    const root = new THREE.Object3D();
    const soft = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({
        defines: { DEPTH_TEXTURE: '' },
        uniforms: { tDepth: { value: null } },
      })
    );
    (soft as any).type = 'OdysseyEmitter';
    const other = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial()
    );
    root.add(soft);
    root.add(other);
    const lists = collectSoftDepthSplitLists(root);
    expect(lists.softEmitters).toEqual([soft]);
    expect(lists.otherDrawables).toEqual([other]);
  });
});
