import { GameState } from "@engine/runtime/GameState";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { GFFStruct } from "@core/resource/GFFStruct";
import { ActionParameterSerializer } from "@engine/module/serialization/ActionParameterSerializer";

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
   * // Use the parameter
   * }
   * ```
   */
  static FromStruct( struct: GFFStruct ){
    const loaded = ActionParameterSerializer.read(struct, (situationStruct) => {
      if(!situationStruct){ return undefined; }
      const script = new GameState.NWScript();
      script.name = situationStruct.getFieldByLabel('Name').getValue();
      script.init(
        situationStruct.getFieldByLabel('Code').getVoid(),
        situationStruct.getFieldByLabel('CodeSize').getValue()
      );
      const scriptInstance = script.newInstance();
      scriptInstance.isStoreState = true;
      scriptInstance.offset = scriptInstance.address = situationStruct.getFieldByLabel('InstructionPtr').getValue();
      const stackStruct = situationStruct.getFieldByLabel('Stack').getChildStructs()[0];
      scriptInstance.stack = GameState.NWScript.NWScriptStack.FromActionStruct(stackStruct);
      return scriptInstance;
    });
    if(!loaded){ return undefined; }
    return new ActionParameter(loaded.type, loaded.scriptInstance ?? loaded.value);
  }

  toStruct(){
    return ActionParameterSerializer.write(
      this.type,
      this.value,
      this.scriptInstance,
      (instance) => instance.saveEventSituation(),
    );
  }

}