import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from ".";

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
