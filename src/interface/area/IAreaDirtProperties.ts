/**
 * IAreaDirtProperties — TSL ARE Dirty* layer parameters (one of three slots).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IAreaDirtProperties.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IAreaDirtLayer {
  /** Packed ARGB as DWORD from ARE DirtyARGB*. */
  argb: number;
  /** Procedural texture edge length (DirtySize*). */
  size: number;
  /**
   * Stored formula after retail 0↔1 swap on load.
   * Stored `1` → perlin generation; stored `0` → random.
   */
  formula: number;
  /** DirtyFunc* — stored on the controller; generation uses formula primarily. */
  func: number;
}

/**
 * Three TSL area dirt layers (One / Two / Three → dirtytex / dirtytex2 / dirtytex3).
 */
export interface IAreaDirtProperties {
  layers: [IAreaDirtLayer, IAreaDirtLayer, IAreaDirtLayer];
}
