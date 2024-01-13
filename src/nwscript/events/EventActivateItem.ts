import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

/**
 * EventActivateItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventActivateItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
