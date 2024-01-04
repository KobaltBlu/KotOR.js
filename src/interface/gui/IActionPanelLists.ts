import type { ActionMenuPanel } from "../../ActionMenuPanel";

/**
 * IActionPanelLists interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IActionPanelLists.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IActionPanelLists {
  targetPanels: ActionMenuPanel[],
  selfPanels: ActionMenuPanel[],
}