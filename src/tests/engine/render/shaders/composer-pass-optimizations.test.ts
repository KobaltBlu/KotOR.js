/**
 * @jest-environment node
 *
 * Locks in composer optimization invariants that do not need a WebGL context.
 */
import * as THREE from 'three';
import { collectSoftDepthSplitLists, createDepthStencilTexture } from '@engine/render/odysseyDepthPrepass';

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
    const { ConvolutionBloomPass } = await import('@engine/render/shaders/pass/ConvolutionBloomPass');
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

  it('world depth targets carry a stencil (force-distortion mask) and match for blits', () => {
    const dt = createDepthStencilTexture(16, 8);
    expect(dt.format).toBe(THREE.DepthStencilFormat);
    expect(dt.type).toBe(THREE.UnsignedInt248Type);
  });

  it('AccumulationBlurPass mixes in place so readBuffer keeps its stencil', async () => {
    const { AccumulationBlurPass } = await import('@engine/render/shaders/pass/AccumulationBlurPass');
    const pass = new AccumulationBlurPass();
    expect(pass.needsSwap).toBe(false);

    const targets: (THREE.WebGLRenderTarget | null)[] = [];
    const renderer = { setRenderTarget: (t: THREE.WebGLRenderTarget | null) => targets.push(t) } as any;
    const read = new THREE.WebGLRenderTarget(8, 8);
    const write = new THREE.WebGLRenderTarget(8, 8);

    pass.render(renderer, write, read);
    // First frame only seeds the 128^2 history.
    expect(targets).not.toContain(write);
    expect(targets).not.toContain(read);

    targets.length = 0;
    pass.render(renderer, write, read);
    // Mix goes to scratch, then back into readBuffer; writeBuffer is never touched.
    expect(targets[0]).toBe((pass as any).mixRT);
    expect(targets[1]).toBe(read);
    expect(targets).not.toContain(write);
    pass.dispose();
  });

  it('ForceDistortionPass uses a color-only snapshot scratch', async () => {
    const { ForceDistortionPass } = await import('@engine/render/shaders/pass/ForceDistortionPass');
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
