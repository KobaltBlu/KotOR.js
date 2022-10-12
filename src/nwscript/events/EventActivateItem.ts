import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

export class EventActivateItem extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventActivateItem;

    //objectList[0] = oItem
    //objectList[1] = oCaller
    //objectList[2] = oItemOwner? can be undefined / 2130706432
    //objectList[3] = oTarget

    //floatList[0] = targetX
    //floatList[1] = targetY
    //floatList[2] = targetZ

  }

}
