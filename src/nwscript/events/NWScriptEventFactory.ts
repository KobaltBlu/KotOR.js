import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { GFFStruct } from "../../resource/GFFStruct";
import { EventActivateItem } from "./EventActivateItem";
import { EventConversation } from "./EventConversation";
import { EventSpellCastAt } from "./EventSpellCastAt";
import { EventUserDefined } from "./EventUserDefined";
import { NWScriptEvent } from "./NWScriptEvent";

/**
 * NWScriptEventFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptEventFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptEventFactory {

  static EventFromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let event: NWScriptEvent = undefined as any;

      let eType = struct.getFieldByLabel('EventType').getValue();

      let intList: number[] = [];
      let floatList: number[] = [];
      let stringList: string[] = [];
      let objectList: number[] = [];

      let tmpList = struct.getFieldByLabel('IntList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        intList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      tmpList = struct.getFieldByLabel('FloatList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        floatList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      tmpList = struct.getFieldByLabel('StringList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        stringList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      if(struct.hasField('ObjectList')){
        tmpList = struct.getFieldByLabel('ObjectList').getChildStructs();
        for(let i = 0, len = tmpList.length; i < len; i++){
          objectList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
        }
      }

      //Initialize the event object based on the type
      switch(eType){
        case NWScriptEventType.EventConversation: //EventConversation
          event = new EventConversation();
        break;
        case NWScriptEventType.EventSpellCastAt: //EventSpellCastAt
          event = new EventSpellCastAt();
        break;
        case NWScriptEventType.EventUserDefined: //EventUserDefined
          event = new EventUserDefined();
        break;
        case NWScriptEventType.EventActivateItem: //EventActivateItem
          event = new EventActivateItem();
        break;
      }

      if(event instanceof NWScriptEvent){
        event.setIntList(intList);
        event.setFloatList(floatList);
        event.setStringList(stringList);
        event.setObjectList(objectList);
        console.log('NWScriptEvent', event, struct);
      }else{
        console.log('NWScriptEvent', event, struct);
      }

      return event;

    }

  }

}