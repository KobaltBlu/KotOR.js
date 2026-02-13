import type { GUIControlEvent , GUIControlEventData } from "../gui/GUIControlEvent";

/** Callback for GUI control events (click, hover, etc.). */
export type IGUIControlEventListenerCallback = (event: GUIControlEvent, ...args: GUIControlEventData[]) => void;

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
  click:      IGUIControlEventListenerCallback[];
  mouseIn:    IGUIControlEventListenerCallback[];
  mouseOut:   IGUIControlEventListenerCallback[];
  mouseDown:  IGUIControlEventListenerCallback[];
  mouseMove:  IGUIControlEventListenerCallback[];
  mouseUp:    IGUIControlEventListenerCallback[];
  hover:      IGUIControlEventListenerCallback[];
}