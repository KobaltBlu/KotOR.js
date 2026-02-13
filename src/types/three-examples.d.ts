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
