import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GffRoot } from '@engine/module/serialization/types';
import { readFloat } from '@engine/module/serialization/gffHelpers';

/** Door / Placeable style — X/Y/Z + Bearing. */
export interface PositionBearingHost {
  position: { x: number; y: number; z: number };
  bearing: number;
}

export class PositionBearingTransform {
  static deserialize(target: PositionBearingHost, root: GffRoot): void {
    if (root.hasField('X')) target.position.x = readFloat(root, 'X');
    if (root.hasField('Y')) target.position.y = readFloat(root, 'Y');
    if (root.hasField('Z')) target.position.z = readFloat(root, 'Z');
    if (root.hasField('Bearing')) target.bearing = readFloat(root, 'Bearing');
  }

  static writeFields(parent: { addField: (f: GFFField) => GFFField }, source: PositionBearingHost): void {
    parent.addField(new GFFField(GFFDataType.FLOAT, 'Bearing')).setValue(source.bearing || 0);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'X')).setValue(source.position.x);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'Y')).setValue(source.position.y);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'Z')).setValue(source.position.z);
  }
}
