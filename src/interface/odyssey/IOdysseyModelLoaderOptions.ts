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
  /** true: force cast; false: never cast (rooms/doors); omit: use MDL flagShadow */
  castShadow?: boolean,
  receiveShadow?: boolean, //force recieve shadow on mesh nodes
  /** When false, retail TurnOffShadows — skip hull/volume projection for this model. */
  shadowsEnabled?: boolean,
  /**
   * true (default): register light nodes with context.lightManager.
   * false: keep OdysseyLight3D model-local (no LightManager registration).
   * Preview contexts that need lighting should leave this true/omitted and
   * provide their own context.lightManager.
   */
  manageLighting?: boolean,
  // context: Game,
  mergeStatic?: boolean, //Use on room models
  static?: boolean, //Static placeable
  lighting?: boolean,
  useTweakColor?: boolean,
  tweakColor?: number,
  isForceShield?: boolean,
  parseChildren?: boolean,
  isHologram?: boolean,
  /**
   * Object-level envmap resref applied to mesh materials, like retail SetEnvMap
   * (appearance.2da ENVMAP / baseitems partEnvMap). "DEFAULT" resolves to the
   * area's DefaultEnvMap. Takes precedence over the diffuse TXI envmaptexture.
   */
  envMapOverride?: string,
  context?: any,
  onComplete?: Function,
  editorMode?: boolean,
  /** When true, AABB/walkmesh geometry from the MDL is parented into the scene (Forge preview). Defaults from editorMode. Runtime uses WOK; leave false for game loads. */
  attachMdlAabbMesh?: boolean,
  disableMatrixUpdate?: boolean,
}