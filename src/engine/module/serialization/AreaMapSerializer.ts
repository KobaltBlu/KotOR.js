import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GFFStruct } from '@core/resource/GFFStruct';
import { AreaMap } from '@engine/module/area/AreaMap';
import type { GffRoot } from '@engine/module/serialization/types';

/** ARE map definition and GIT exploration-data boundary. */
export class AreaMapSerializer {
  static fromStruct(struct: GFFStruct | undefined): AreaMap | undefined {
    return struct ? AreaMap.FromStruct(struct) : undefined;
  }

  static serialize(areaMap: AreaMap): GFFStruct {
    return areaMap.exportData();
  }

  static writeField(
    parent: { addField: (field: GFFField) => GFFField },
    areaMap: AreaMap,
  ): GFFField {
    const field = parent.addField(new GFFField(GFFDataType.STRUCT, 'AreaMap'));
    field.addChildStruct(AreaMapSerializer.serialize(areaMap));
    return field;
  }

  static deserialize(areaMap: AreaMap, root: GffRoot): void {
    if (!root.hasField('AreaMap')) return;
    const data = root.getFieldByLabel('AreaMap').getChildStructs?.()?.[0];
    if (data) {
      areaMap.loadDataStruct(data);
    }
  }
}
