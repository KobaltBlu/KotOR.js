import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

/**
 * EventConversation class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventConversation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventConversation extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventConversation;

    //intList[0]: (?)
    //intList[1]: (?)
    //intList[2]: bPrivateConversation
    //intList[3]: bIgnoreStartRange
    //stringList[*] : strings to speak

  }

}
