/**
 * IGUIControlChrome interface.
 *
 * Shared single-mesh chrome drawable for a GUI control (border frame + fill).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IGUIControlChrome.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export type GUIChromeMapSlot =
  | 'edgeMap'
  | 'cornerMap'
  | 'fillMap'
  | 'highlightEdgeMap'
  | 'highlightCornerMap'
  | 'highlightFillMap';

export interface IGUIControlChrome {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
}
