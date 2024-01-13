import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { NWScriptEvent } from "./NWScriptEvent";

/**
 * EventSpellCastAt class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventSpellCastAt.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventSpellCastAt extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEventType.EventSpellCastAt;

    //intList[0] = spellId
    //intList[0] = bHarmful
    //objectList[0] = oCaster

  }

}
