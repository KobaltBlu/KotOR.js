/**
 * Factory helpers for three.js controls so that ESLint/TypeScript resolve return types.
 * KotOR JS - Forge
 */

import type * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export function createOrbitControls(
  camera: THREE.Camera,
  domElement: HTMLCanvasElement
): OrbitControls {
  return new OrbitControls(camera, domElement);
}

export function createTransformControls(
  camera: THREE.Camera,
  domElement: HTMLCanvasElement
): TransformControls {
  return new TransformControls(camera, domElement);
}
