import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from ".";

export class EventSpellCastAt extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventSpellCastAt;

    //intList[0] = spellId
    //intList[0] = bHarmful
    //objectList[0] = oCaster

  }

}
