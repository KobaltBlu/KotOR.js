import { GameState } from "../GameState";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * Represents a parameter for game actions in the engine.
 * 
 * @remarks
 * ActionParameter handles the storage and type conversion of values used by actions.
 * It supports various parameter types including integers, floats, object references,
 * strings, and script situations.
 * 
 * @example
 * ```typescript
 * // Create an integer parameter
 * const intParam = new ActionParameter(ActionParameterType.INT, 42);
 * 
 * // Create a float parameter
 * const floatParam = new ActionParameter(ActionParameterType.FLOAT, 3.14);
 * ```
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionParameter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionParameter {
  /**
   * The type of parameter from ActionParameterType enum
   */
  type: number;

  /**
   * The value stored in this parameter
   * @remarks Can be a number for basic types or an NWScriptInstance for script situations
   */
  value: number|string;

  scriptInstance: NWScriptInstance;

  /**
   * Creates a new ActionParameter instance
   * 
   * @param type - The parameter type from ActionParameterType enum
   * @param value - Initial value for the parameter
   * @throws {Error} If the parameter type is invalid
   */
  constructor(type = 0, value: any = 0){
    this.type = type;
    if(value instanceof NWScriptInstance){
      this.scriptInstance = value;
    }else{
      this.value = value;
    }

    switch(this.type){

    }

    if(!this.type){
      throw 'ActionParameter: Invalid Type ('+type+')';
    }
  }

  /**
   * Creates an ActionParameter instance from a GFF struct.
   * 
   * @param struct - GFF struct containing parameter data
   * @returns New ActionParameter instance or undefined if creation fails
   * 
   * @remarks
   * Handles deserialization of different parameter types:
   * - INT: Integer values
   * - FLOAT: Floating point values
   * - DWORD: Object references or numeric values
   * - STRING: Text values
   * - SCRIPT_SITUATION: Script instance data
   * 
   * @throws {Error} If the parameter type in the struct is invalid
   * 
   * @example
   * ```typescript
   * // Create parameter from GFF struct
   * const param = ActionParameter.FromStruct(gffStruct);
   * if (param) {
   *   // Use the parameter
   * }
   * ```
   */
  static FromStruct( struct: GFFStruct ){
    if(!(struct instanceof GFFStruct)){
      return undefined;
    }

    const type = struct.getFieldByLabel('Type').getValue();
    let value = undefined;
    switch(type){
      case ActionParameterType.INT:
      case ActionParameterType.FLOAT:
      case ActionParameterType.DWORD:
      case ActionParameterType.STRING:
        value = struct.getFieldByLabel('Value').getValue();
      break;
      case ActionParameterType.SCRIPT_SITUATION:
        const scriptParamStructs = struct.getFieldByLabel('Value').getChildStructs()[0];
        const script = new GameState.NWScript();
        script.name = scriptParamStructs.getFieldByLabel('Name').getValue();
        script.init(
          scriptParamStructs.getFieldByLabel('Code').getVoid(),
          scriptParamStructs.getFieldByLabel('CodeSize').getValue()
        );
    
        const scriptInstance = script.newInstance();
        scriptInstance.isStoreState = true;
        scriptInstance.offset = scriptInstance.address = scriptParamStructs.getFieldByLabel('InstructionPtr').getValue();
    
        const stackStruct = scriptParamStructs.getFieldByLabel('Stack').getChildStructs()[0];
        scriptInstance.stack = GameState.NWScript.NWScriptStack.FromActionStruct(stackStruct);

        value = scriptInstance;
      break;
      default:
        throw 'ActionParameter.FromStruct: Invalid Type ('+type+')';
    }
    return new ActionParameter(type, value);
  }

  toStruct(){
    const struct = new GFFStruct(1);
    switch(this.type){
      case ActionParameterType.INT:
        struct.addField(new GFFField(GFFDataType.INT, 'Value', this.value));
      break;
      case ActionParameterType.FLOAT:
        struct.addField(new GFFField(GFFDataType.FLOAT, 'Value', this.value));
      break;
      case ActionParameterType.DWORD:
        struct.addField(new GFFField(GFFDataType.DWORD, 'Value', this.value));
      break;
      case ActionParameterType.STRING:
        struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Value', this.value));
      break;
      case ActionParameterType.SCRIPT_SITUATION:
        struct.addField(new GFFField(GFFDataType.STRUCT, 'Value')).addChildStruct(
          this.scriptInstance.saveEventSituation()
        );
      break;
      default:
        throw 'ActionParameter.FromStruct: Invalid Type ('+this.type+')';
    }

    return struct;
  }

}