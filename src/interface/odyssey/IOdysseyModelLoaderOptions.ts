/**
 * IOdysseyModelLoaderOptions interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyModelLoaderOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyModelLoaderOptions {
  textureVar?: string, //override texture
  castShadow?: boolean, //force cast shadow on mesh nodes
  receiveShadow?: boolean, //force recieve shadow on mesh nodes
  manageLighting?: boolean, // true | light nodes are manages by the LightManager class, false | lights are created inline
  // context: Game,
  mergeStatic?: boolean, //Use on room models
  static?: boolean, //Static placeable
  lighting?: boolean,
  useTweakColor?: boolean,
  tweakColor?: number,
  isForceShield?: boolean,
  isChildrenDynamic?: boolean,
  parseChildren?: boolean,
  isHologram?: boolean,
  context?: any,
  onComplete?: Function,
  editorMode?: boolean,
}