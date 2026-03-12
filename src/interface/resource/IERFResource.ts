/**
 * IERFResource interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IERFResource.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IERFResource {
  offset: number;
  size: number;
  /** Present when resource was added/replaced in memory; absent when loaded from disk until read or replaced. */
  data?: Uint8Array;
}