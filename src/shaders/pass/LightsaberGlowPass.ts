import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass";

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BLUR_SHADER = `
  uniform sampler2D tDiffuse;
  uniform vec2 direction;
  varying vec2 vUv;
  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb * 0.227027;
    color += texture2D(tDiffuse, vUv + direction * 1.3846153846).rgb * 0.316216;
    color += texture2D(tDiffuse, vUv - direction * 1.3846153846).rgb * 0.316216;
    color += texture2D(tDiffuse, vUv + direction * 3.2307692308).rgb * 0.070270;
    color += texture2D(tDiffuse, vUv - direction * 3.2307692308).rgb * 0.070270;
    gl_FragColor = vec4(color, 1.0);
  }
`;
const COMPOSITE_SHADER = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tGlow;
  uniform sampler2D tMask;
  uniform float glowIntensity;
  uniform float maskIntensity;
  uniform bool glowEnabled;
  varying vec2 vUv;
  void main() {
    vec4 baseColor = texture2D(tDiffuse, vUv);
    if (!glowEnabled) {
      gl_FragColor = baseColor;
      return;
    }
    vec3 light = texture2D(tGlow, vUv).rgb * glowIntensity
      + texture2D(tMask, vUv).rgb * maskIntensity;
    gl_FragColor = vec4(1.0 - ((1.0 - baseColor.rgb) * exp(-light)), baseColor.a);
  }
`;

/** Selective glow for QoL blades; ordinary scene objects retain depth occlusion. */
export class LightsaberGlowPass extends Pass {
  scene: THREE.Scene;
  getCamera: () => THREE.Camera;
  saberRenderTarget: THREE.WebGLRenderTarget;
  blurRenderTargetA: THREE.WebGLRenderTarget;
  blurRenderTargetB: THREE.WebGLRenderTarget;
  blurMaterial: THREE.ShaderMaterial;
  compositeMaterial: THREE.ShaderMaterial;
  blurQuad: FullScreenQuad;
  compositeQuad: FullScreenQuad;
  darkenedMaterials: { material: THREE.Material; colorWrite: boolean }[] = [];
  clearColor = new THREE.Color();

  constructor(scene: THREE.Scene, getCamera: () => THREE.Camera) {
    super();
    this.scene = scene;
    this.getCamera = getCamera;
    this.saberRenderTarget = this.createRenderTarget();
    this.blurRenderTargetA = this.createRenderTarget();
    this.blurRenderTargetB = this.createRenderTarget();
    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2() } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: BLUR_SHADER,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tGlow: { value: null },
        tMask: { value: null },
        glowIntensity: { value: 1.9 },
        maskIntensity: { value: 0.45 },
        glowEnabled: { value: false },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: COMPOSITE_SHADER,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.blurQuad = new FullScreenQuad(this.blurMaterial);
    this.compositeQuad = new FullScreenQuad(this.compositeMaterial);
  }

  createRenderTarget(): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.texture.generateMipmaps = false;
    return target;
  }

  setSize(width: number, height: number): void {
    const w = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : 1;
    const h = Number.isFinite(height) ? Math.max(1, Math.floor(height)) : 1;
    this.saberRenderTarget.setSize(w, h);
    this.blurRenderTargetA.setSize(w, h);
    this.blurRenderTargetB.setSize(w, h);
  }

  beginSaberIsolation(): boolean {
    this.endSaberIsolation();
    let hasVisibleSabers = false;
    const seen = new Set<THREE.Material>();
    this.scene.traverseVisible((object) => {
      if (object.userData?.qolLightsaberGlow === true) {
        hasVisibleSabers = true;
        return;
      }
      // Points and sprites must not contribute color to the saber mask either.
      const material = (object as THREE.Mesh).material;
      const materials = Array.isArray(material) ? material : [material];
      for (const entry of materials) {
        if (!(entry instanceof THREE.Material) || seen.has(entry)) continue;
        seen.add(entry);
        this.darkenedMaterials.push({ material: entry, colorWrite: entry.colorWrite });
        entry.colorWrite = false;
      }
    });
    return hasVisibleSabers;
  }

  endSaberIsolation(): void {
    for (const state of this.darkenedMaterials) state.material.colorWrite = state.colorWrite;
    this.darkenedMaterials.length = 0;
  }

  renderSaberMask(renderer: THREE.WebGLRenderer, camera: THREE.Camera): boolean {
    const target = renderer.getRenderTarget();
    renderer.getClearColor(this.clearColor);
    const alpha = renderer.getClearAlpha();
    const background = this.scene.background;
    try {
      const hasVisibleSabers = this.beginSaberIsolation();
      this.scene.background = null;
      renderer.setRenderTarget(this.saberRenderTarget);
      renderer.setClearColor(0x000000, 0);
      // Clear even after the final saber disappears. Otherwise last frame's mask persists.
      renderer.clear(true, true, true);
      if (hasVisibleSabers) renderer.render(this.scene, camera);
      return hasVisibleSabers;
    } finally {
      this.scene.background = background;
      renderer.setClearColor(this.clearColor, alpha);
      renderer.setRenderTarget(target);
      this.endSaberIsolation();
    }
  }

  blur(renderer: THREE.WebGLRenderer): void {
    const w = this.saberRenderTarget.width;
    const h = this.saberRenderTarget.height;
    const steps: [THREE.Texture, THREE.WebGLRenderTarget, number, number][] = [
      [this.saberRenderTarget.texture, this.blurRenderTargetA, 1 / w, 0],
      [this.blurRenderTargetA.texture, this.blurRenderTargetB, 0, 1 / h],
      [this.blurRenderTargetB.texture, this.blurRenderTargetA, 2 / w, 0],
      [this.blurRenderTargetA.texture, this.blurRenderTargetB, 0, 2 / h],
    ];
    for (const [texture, target, x, y] of steps) {
      this.blurMaterial.uniforms.tDiffuse.value = texture;
      this.blurMaterial.uniforms.direction.value.set(x, y);
      renderer.setRenderTarget(target);
      renderer.clear(true, false, false);
      this.blurQuad.render(renderer);
    }
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    const camera = this.getCamera();
    const hasVisibleSabers = camera instanceof THREE.Camera && this.renderSaberMask(renderer, camera);
    this.compositeMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.compositeMaterial.uniforms.glowEnabled.value = hasVisibleSabers;
    if (hasVisibleSabers) {
      this.blur(renderer);
      this.compositeMaterial.uniforms.tGlow.value = this.blurRenderTargetB.texture;
      this.compositeMaterial.uniforms.tMask.value = this.saberRenderTarget.texture;
    }
    // With no active camera or no blades, copy the input instead of leaving writeBuffer stale.
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    this.compositeQuad.render(renderer);
  }

  dispose(): void {
    this.endSaberIsolation();
    this.saberRenderTarget.dispose();
    this.blurRenderTargetA.dispose();
    this.blurRenderTargetB.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.blurQuad.dispose();
    this.compositeQuad.dispose();
  }
}
