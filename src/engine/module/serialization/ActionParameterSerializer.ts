import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import type { NWScriptInstance } from '@engine/nwscript/NWScriptInstance';

export type ScriptSituationLoader = (situationStruct: GFFStruct) => NWScriptInstance | undefined;
export type ScriptSituationSaver = (instance: NWScriptInstance) => GFFStruct;

/**
 * ActionList parameter struct (Type + Value).
 * SCRIPT_SITUATION load/save is injected so this stays free of GameState.
 */
export class ActionParameterSerializer {
  static read(
    struct: GFFStruct,
    loadScriptSituation?: ScriptSituationLoader,
  ): { type: number; value: any; scriptInstance?: NWScriptInstance } | undefined {
    if (!(struct instanceof GFFStruct)) return undefined;
    if (!struct.hasField('Type')) return undefined;

    const type = struct.getFieldByLabel('Type').getValue();
    switch (type) {
      case ActionParameterType.INT:
      case ActionParameterType.FLOAT:
      case ActionParameterType.DWORD:
      case ActionParameterType.STRING:
        return { type, value: struct.getFieldByLabel('Value').getValue() };
      case ActionParameterType.SCRIPT_SITUATION: {
        if (!loadScriptSituation) {
          throw new Error('ActionParameterSerializer.read: SCRIPT_SITUATION requires loadScriptSituation');
        }
        const situationStructs = struct.getFieldByLabel('Value').getChildStructs?.() || [];
        const scriptInstance = loadScriptSituation(situationStructs[0]);
        return { type, value: scriptInstance, scriptInstance };
      }
      default:
        throw new Error(`ActionParameterSerializer.read: Invalid Type (${type})`);
    }
  }

  static write(
    type: number,
    value: any,
    scriptInstance: NWScriptInstance | undefined,
    saveScriptSituation?: ScriptSituationSaver,
  ): GFFStruct {
    const struct = new GFFStruct(1);
    // SaveActionQueue — Type is DWORD (INT breaks LoadActionQueue ReadFieldDWORD)
    struct.addField(new GFFField(GFFDataType.DWORD, 'Type', type));
    switch (type) {
      case ActionParameterType.INT:
        struct.addField(new GFFField(GFFDataType.INT, 'Value', value));
        break;
      case ActionParameterType.FLOAT:
        struct.addField(new GFFField(GFFDataType.FLOAT, 'Value', value));
        break;
      case ActionParameterType.DWORD:
        struct.addField(new GFFField(GFFDataType.DWORD, 'Value', value));
        break;
      case ActionParameterType.STRING:
        struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Value', value));
        break;
      case ActionParameterType.SCRIPT_SITUATION: {
        if (!scriptInstance || !saveScriptSituation) {
          throw new Error('ActionParameterSerializer.write: SCRIPT_SITUATION requires scriptInstance saver');
        }
        struct.addField(new GFFField(GFFDataType.STRUCT, 'Value')).addChildStruct(
          saveScriptSituation(scriptInstance),
        );
        break;
      }
      default:
        throw new Error(`ActionParameterSerializer.write: Invalid Type (${type})`);
    }
    return struct;
  }
}
