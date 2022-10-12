import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

export class EventConversation extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventConversation;

    //stringList[*] : strings to speak

  }

}
