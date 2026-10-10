import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { ScriptVarTable } from '@engine/world/ScriptVarTable';
import type { GffRoot } from '@engine/module/serialization/types';

export interface NamedVarTableHost {
  scriptVarTable: ScriptVarTable;
}

/**
 * Named VarTable LIST (not SWVarTable).
 */
export class NamedVarTableSerializer {
  static deserialize(target: NamedVarTableHost, root: GffRoot): void {
    if (!root.hasField('VarTable')) return;
    const field = root.getFieldByLabel('VarTable') as unknown as GFFField;
    target.scriptVarTable.loadFromListField(field);
  }

  static writeField(parent: { addField: (f: GFFField) => GFFField }, source: NamedVarTableHost): GFFField {
    const list = parent.addField(new GFFField(GFFDataType.LIST, 'VarTable'));
    source.scriptVarTable.writeToListField(list);
    return list;
  }
}
