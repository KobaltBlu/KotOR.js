import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

export class EventUserDefined extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventUserDefined;

    //intList[0] : userdefined number

  }

}
