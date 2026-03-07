/**
 * Module declarations for three.js examples (jsm) when using Node16/tsconfig paths.
 * Runtime resolves via three package exports.
 */
declare module "three/examples/jsm/objects/Lensflare" {
  import type * as THREE from "three";
  export class LensflareElement {
    constructor(texture?: THREE.Texture, size?: number, distance?: number, color?: THREE.Color);
  }
  export class Lensflare extends THREE.Mesh {
    addElement(element: LensflareElement): void;
  }
}

declare module "three/examples/jsm/utils/BufferGeometryUtils" {
  import type * as THREE from "three";
  export function mergeGeometries(geometries: THREE.BufferGeometry[], useGroups?: boolean): THREE.BufferGeometry;
  export function mergeBufferGeometries(geometries: THREE.BufferGeometry[], useGroups?: boolean): THREE.BufferGeometry;
}

declare module "three/examples/jsm/libs/stats.module" {
  export default function Stats(): { showPanel(panel?: number): void; update(): void };
}

declare module "three/examples/jsm/postprocessing/EffectComposer" {
  import type * as THREE from "three";
  export class EffectComposer {
    constructor(renderer: THREE.WebGLRenderer);
    addPass(pass: unknown): void;
    setSize(width: number, height: number): void;
    render(delta: number): void;
    clear?: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/RenderPass" {
  import type * as THREE from "three";
  export class RenderPass {
    constructor(scene: THREE.Scene, camera: THREE.Camera);
    renderToScreen: boolean;
    clear: boolean;
    clearDepth: boolean;
    needsSwap: boolean;
    camera: THREE.Camera;
  }
}

declare module "three/examples/jsm/postprocessing/SSAARenderPass" {
  import type * as THREE from "three";
  export class SSAARenderPass {
    constructor(scene: THREE.Scene, camera: THREE.Camera);
    sampleLevel: number;
    renderToScreen: boolean;
    clear: boolean;
    clearDepth: boolean;
    needsSwap: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/ShaderPass" {
  import type * as _THREE from "three";
  export class ShaderPass {
    constructor(shader: { uniformLocations?: unknown; uniforms?: Record<string, { value: unknown }> });
    renderToScreen: boolean;
    clear: boolean;
    clearDepth: boolean;
    needsSwap: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/BloomPass" {
  export class BloomPass {
    constructor(strength?: number);
    clear: boolean;
    needsSwap: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/BokehPass" {
  import type * as THREE from "three";
  export class BokehPass {
    constructor(scene: THREE.Scene, camera: THREE.Camera, params?: { focus?: number; aperture?: number; maxblur?: number });
    camera: THREE.Camera;
    needsSwap: boolean;
    enabled: boolean;
  }
}

declare module "three/examples/jsm/shaders/CopyShader" {
  export const CopyShader: { uniformLocations?: unknown; uniforms?: Record<string, { value: unknown }> };
}

declare module "three/examples/jsm/postprocessing/Pass" {
  import type * as THREE from "three";
  export class Pass {
    enabled: boolean;
    clear: boolean;
    needsSwap: boolean;
    renderToScreen: boolean;
    render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number): void;
  }
}
