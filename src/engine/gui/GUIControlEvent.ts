/**
 * GUIControlEvent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIControlEvent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIControlEvent {
  propagate: boolean = true;
  data: any[] = [];
  
  constructor(){}

  stopPropagation(){
    this.propagate = false;
  }
}