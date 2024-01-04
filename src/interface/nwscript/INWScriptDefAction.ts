import type { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";

/**
 * INWScriptDefAction interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file INWScriptDefAction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface INWScriptDefAction {
  comment: string,
  name: string,
  type: NWScriptDataType,
  args: NWScriptDataType[],
  action?: (args: any[]) => any
};