import type * as THREE from "three";

import type { TextureType } from "../../enums/loaders/TextureType";

/** Part group (e.g. OdysseyEmitter) with material for particle textures. */
export interface ITextureLoaderPartGroup {
  type?: string;
  material: THREE.Material & {
    uniforms?: Record<string, { value: unknown }>;
    map?: THREE.Texture;
    depthWrite?: boolean;
    needsUpdate?: boolean;
  };
}

/**
 * ITextureLoaderQueuedRef interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ITextureLoaderQueuedRef.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ITextureLoaderQueuedRef {
  name: string;
  type: TextureType;
  material?: THREE.ShaderMaterial;
  partGroup?: ITextureLoaderPartGroup;
  fallback?: string;
  onLoad?: (texture?: unknown, ref?: ITextureLoaderQueuedRef) => void;
}