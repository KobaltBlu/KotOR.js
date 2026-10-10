import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GffRoot } from '@engine/module/serialization/types';
import { readFloat } from '@engine/module/serialization/gffHelpers';

/** Creature / Trigger / Waypoint / Sound / Item / Encounter style. */
export interface PositionOrientationHost {
  position: { x: number; y: number; z: number };
  xOrientation: number;
  yOrientation: number;
  zOrientation: number;
}

export class PositionOrientationTransform {
  static deserialize(target: PositionOrientationHost, root: GffRoot): void {
    if (root.hasField('XPosition')) target.position.x = readFloat(root, 'XPosition');
    if (root.hasField('YPosition')) target.position.y = readFloat(root, 'YPosition');
    if (root.hasField('ZPosition')) target.position.z = readFloat(root, 'ZPosition');
    if (root.hasField('XOrientation')) target.xOrientation = readFloat(root, 'XOrientation');
    if (root.hasField('YOrientation')) target.yOrientation = readFloat(root, 'YOrientation');
    if (root.hasField('ZOrientation')) target.zOrientation = readFloat(root, 'ZOrientation');
  }

  static writeFields(parent: { addField: (f: GFFField) => GFFField }, source: PositionOrientationHost): void {
    parent.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).setValue(source.xOrientation || 0);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(source.position.x);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).setValue(source.yOrientation || 0);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(source.position.y);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).setValue(source.zOrientation || 0);
    parent.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(source.position.z);
  }
}
