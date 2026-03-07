/**
 * IGUIControlEventListeners interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGUIControlEventListeners.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlEventListeners {
  click:      Function[],
  mouseIn:    Function[],
  mouseOut:   Function[],
  mouseDown:  Function[],
  mouseMove:  Function[],
  mouseUp:    Function[],
  hover:      Function[]
};