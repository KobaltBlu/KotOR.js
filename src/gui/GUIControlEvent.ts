/**
 * GUIControlEvent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIControlEvent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/** Event payload types used by GUI controls (e.g. click position, key code). */
export type GUIControlEventData = string | number | boolean | object;

export class GUIControlEvent {
  propagate: boolean = true;
  data: GUIControlEventData[] = [];

  stopPropagation(){
    this.propagate = false;
  }
}