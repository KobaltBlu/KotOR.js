import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';
import type { Waypoint } from '@engine/module/Waypoint';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addLocString,
  addString,
  readBoolByte,
  readByte,
  readDword,
  readLocString,
  readResRef,
  readString,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { NamedVarTableSerializer } from '@engine/module/serialization/NamedVarTableSerializer';
import { PositionOrientationTransform } from '@engine/module/serialization/transforms/PositionOrientationTransform';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';

/**
 * Waypoint GIT/UTW serializer.
 * Evidence: exports/k1/save/quicksave/.../WaypointList (struct id 5),
 * XPosition + X/Y/ZOrientation, map-note fields, SWVarTable, VarTable, ActionList.
 */
export class WaypointSerializer implements GameObjectSerializer<Waypoint, GFFObject, GFFObject> {
  deserialize(target: Waypoint, source: GFFObject, context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      if (root.hasField('ObjectId')) {
        target.id = readDword(root, 'ObjectId');
      } else if (root.hasField('ID')) {
        target.id = readDword(root, 'ID');
      }
    }

    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable', true);
    if (root.hasField('HasMapNote')) target.hasMapNote = readBoolByte(root, 'HasMapNote');
    if (root.hasField('MapNoteEnabled')) target.mapNoteEnabled = readBoolByte(root, 'MapNoteEnabled');
    if (root.hasField('MapNote')) target.mapNote = readLocString(root, 'MapNote') as any;
    if (root.hasField('LocalizedName')) target.localizedName = readLocString(root, 'LocalizedName') as any;
    if (root.hasField('LocName')) target.locName = readLocString(root, 'LocName') as any;
    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');

    PositionOrientationTransform.deserialize(target, root);
    SwVarTableSerializer.deserialize(target, root);
    NamedVarTableSerializer.deserialize(target, root);

    ActionListSerializer.deserializeFromContext(target as any, root, context);

    target.initialized = true;
  }

  serialize(source: Waypoint, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTW ';
    gff.RootNode.type = 5;

    const localizedName = source.localizedName instanceof CExoLocString
      ? source.localizedName
      : (source.locName instanceof CExoLocString ? source.locName : new CExoLocString());
    const mapNote = source.mapNote instanceof CExoLocString ? source.mapNote : new CExoLocString();

    ActionListSerializer.writeField(gff.RootNode, source as any);
    addByte(gff.RootNode, 'Commandable', source.commandable ? 1 : 0);
    addByte(gff.RootNode, 'HasMapNote', source.hasMapNote ? 1 : 0);
    addLocString(gff.RootNode, 'LocalizedName', localizedName);
    if (source.hasMapNote) {
      addLocString(gff.RootNode, 'MapNote', mapNote);
      addByte(gff.RootNode, 'MapNoteEnabled', source.mapNoteEnabled ? 1 : 0);
    }
    addDword(gff.RootNode, 'ObjectId', source.id);
    SwVarTableSerializer.writeField(gff.RootNode, source);
    addString(gff.RootNode, 'Tag', source.tag);
    NamedVarTableSerializer.writeField(gff.RootNode, source);
    PositionOrientationTransform.writeFields(gff.RootNode, source);

    return gff;
  }
}

export const waypointSerializer = new WaypointSerializer();
