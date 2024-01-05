import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptStack } from "../nwscript/NWScriptStack";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * ActionParameter class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionParameter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionParameter {
  type: number;
  value: number;

  constructor(type = 0, value = 0){
    this.type = type;
    this.value = value;

    switch(this.type){

    }

    if(!this.type){
      throw 'ActionParameter: Invalid Type ('+type+')';
    }
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let type = struct.getFieldByLabel('Type').getValue();
      let value = undefined;
      switch(type){
        case ActionParameterType.INT:
        case ActionParameterType.FLOAT:
        case ActionParameterType.DWORD:
        case ActionParameterType.STRING:
          value = struct.getFieldByLabel('Value').getValue();
        break;
        case ActionParameterType.SCRIPT_SITUATION:
          let scriptParamStructs = struct.getFieldByLabel('Value').getChildStructs()[0];
          let script = new NWScript();
          script.name = scriptParamStructs.getFieldByLabel('Name').getValue();
          script.init(
            scriptParamStructs.getFieldByLabel('Code').getVoid(),
            scriptParamStructs.getFieldByLabel('CodeSize').getValue()
          );
      
          let scriptInstance = script.newInstance();
          scriptInstance.isStoreState = true;
          scriptInstance.offset = scriptInstance.address = scriptParamStructs.getFieldByLabel('InstructionPtr').getValue();
      
          let stackStruct = scriptParamStructs.getFieldByLabel('Stack').getChildStructs()[0];
          scriptInstance.stack = NWScriptStack.FromActionStruct(stackStruct);

          value = scriptInstance;
        break;
        default:
          throw 'ActionParameter.FromStruct: Invalid Type ('+type+')';
      }
      return new ActionParameter(type, value);
    }
    return undefined;
  }

}