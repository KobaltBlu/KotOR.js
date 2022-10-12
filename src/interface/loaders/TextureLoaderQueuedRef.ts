import * as THREE from "three";
import { TextureType } from "../../enums/loaders/TextureType";

export interface TextureLoaderQueuedRef {
  name: string,
  type: TextureType,
  material?: THREE.ShaderMaterial,
  partGroup?: any,
  fallback?: string,
  onLoad?: Function,
}