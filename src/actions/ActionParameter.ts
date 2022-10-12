import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptStack } from "../nwscript/NWScriptStack";

export class ActionParameter {

  constructor(type = 0, value = 0){
    this.type = type;
    this.value = value;

    switch(this.type){

    }

    if(!this.type){
      throw 'ActionParameter: Invalid Type ('+type+')';
    }
  }

  static FromStruct( struct ){
    if(struct instanceof Struct){
      let type = struct.GetFieldByLabel('Type').GetValue();
      let value = undefined;
      switch(type){
        case ActionParameterType.INT:
        case ActionParameterType.FLOAT:
        case ActionParameterType.DWORD:
        case ActionParameterType.STRING:
          value = struct.GetFieldByLabel('Value').GetValue();
        break;
        case ActionParameterType.SCRIPT_SITUATION:
          let scriptParamStructs = struct.GetFieldByLabel('Value').GetChildStructs()[0];
          let script = new NWScript();
          script.name = scriptParamStructs.GetFieldByLabel('Name').GetValue();
          script.init(
            scriptParamStructs.GetFieldByLabel('Code').GetVoid(),
            scriptParamStructs.GetFieldByLabel('CodeSize').GetValue()
          );
      
          let scriptInstance = script.newInstance();
          scriptInstance.isStoreState = true;
          scriptInstance.offset = scriptInstance.address = scriptParamStructs.GetFieldByLabel('InstructionPtr').GetValue();
      
          let stackStruct = scriptParamStructs.GetFieldByLabel('Stack').GetChildStructs()[0];
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