import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

/**
 * EventUserDefined class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventUserDefined.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventUserDefined extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventUserDefined;

    //intList[0] : userdefined number

  }

}
