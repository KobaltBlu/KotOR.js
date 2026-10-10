import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { AreaOfEffectShape } from '@core/enums/module/AreaOfEffectShape';
import type { AreaEffect } from '@engine/module/AreaEffect';
import type { GameObject } from '@engine/module/GameObject';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addInt,
  addString,
  readBoolByte,
  readByte,
  readDword,
  readFloat,
  readInt,
  readObjectId,
  readResRef,
  readString,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';

/**
 * AreaEffect serializer.
 *
 * Position / orientation field-name evidence (exports/k1/save/quicksave + k2 autosave):
 * - AreaEffectList entries were empty in both dumps (no live AOE instances to sample).
 * - Closest related save structs (effect GameDefinedStrct) use PositionX/Y/Z and
 *   OrientationX/Y/Z — matching the existing load path in AreaEffect.initProperties.
 * - The previous engine save() wrote XPosition/YPosition/ZPosition and
 *   XOrientation/YOrientation/ZOrientation (creature/trigger style).
 *
 * Deserialize accepts both naming schemes so retail Position* and older engine
 * XPosition* round-trips both work. Serialize emits Position* / Orientation*
 * to align with the load path and GameDefinedStrct naming.
 */
export class AreaEffectSerializer implements GameObjectSerializer<AreaEffect, GFFObject, GFFObject> {
  deserialize(target: AreaEffect, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('AreaEffectId')) target.areaEffectId = readInt(root, 'AreaEffectId');
    if (root.hasField('CreatorId')) target.creatorId = readDword(root, 'CreatorId');
    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable');
    if (root.hasField('Duration')) target.duration = readDword(root, 'Duration');
    if (root.hasField('DurationType')) target.durationType = readByte(root, 'DurationType');
    if (root.hasField('LastEntered')) target.lastEnteredId = readDword(root, 'LastEntered');
    if (root.hasField('LastLeft')) target.lastLeftId = readDword(root, 'LastLeft');
    if (root.hasField('LastHrtbtDay')) target.lastHeartBeatDay = readDword(root, 'LastHrtbtDay');
    if (root.hasField('LastHrtbtTime')) target.lastHeartbeatTime = readDword(root, 'LastHrtbtTime');
    if (root.hasField('LinkedToObject')) target.linkedToObjectId = readDword(root, 'LinkedToObject');
    if (root.hasField('MetaMagicType')) target.metaMagicType = readByte(root, 'MetaMagicType');
    if (root.hasField('Shape')) target.shape = readByte(root, 'Shape');

    if (target.shape === AreaOfEffectShape.RECTANGLE) {
      if (root.hasField('Length')) target.length = readFloat(root, 'Length');
      if (root.hasField('Width')) target.width = readFloat(root, 'Width');
    } else {
      if (root.hasField('Radius')) target.radius = readFloat(root, 'Radius');
    }

    if (root.hasField('SpellId')) target.spellId = readDword(root, 'SpellId');
    if (root.hasField('SpellLevel')) target.spellLevel = readInt(root, 'SpellLevel');
    if (root.hasField('SpellSaveDC')) target.spellSaveDC = readInt(root, 'SpellSaveDC');

    // Prefer retail Orientation* / Position*; fall back to XOrientation / XPosition.
    if (root.hasField('OrientationX')) target.xOrientation = readFloat(root, 'OrientationX');
    else if (root.hasField('XOrientation')) target.xOrientation = readFloat(root, 'XOrientation');

    if (root.hasField('OrientationY')) target.yOrientation = readFloat(root, 'OrientationY');
    else if (root.hasField('YOrientation')) target.yOrientation = readFloat(root, 'YOrientation');

    if (root.hasField('OrientationZ')) target.zOrientation = readFloat(root, 'OrientationZ');
    else if (root.hasField('ZOrientation')) target.zOrientation = readFloat(root, 'ZOrientation');

    if (root.hasField('PositionX')) target.position.x = readFloat(root, 'PositionX');
    else if (root.hasField('XPosition')) target.position.x = readFloat(root, 'XPosition');

    if (root.hasField('PositionY')) target.position.y = readFloat(root, 'PositionY');
    else if (root.hasField('YPosition')) target.position.y = readFloat(root, 'YPosition');

    if (root.hasField('PositionZ')) target.position.z = readFloat(root, 'PositionZ');
    else if (root.hasField('ZPosition')) target.position.z = readFloat(root, 'ZPosition');

    SwVarTableSerializer.deserialize(target, root);

    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');

    if (root.hasField('OnObjEnter')) {
      const resRef = readResRef(root, 'OnObjEnter');
      if (resRef) target.scriptResRefs.onEnter = resRef;
    }
    if (root.hasField('OnHeartbeat')) {
      const resRef = readString(root, 'OnHeartbeat') || readResRef(root, 'OnHeartbeat');
      if (resRef) target.scriptResRefs.heartbeat = resRef;
    }
    if (root.hasField('OnObjExit')) {
      const resRef = readResRef(root, 'OnObjExit');
      if (resRef) target.scriptResRefs.onExit = resRef;
    }
    if (root.hasField('OnUserDefined')) {
      const resRef = readString(root, 'OnUserDefined') || readResRef(root, 'OnUserDefined');
      if (resRef) target.scriptResRefs.onUserDefined = resRef;
    }

    target.initialized = true;
  }

  serialize(source: AreaEffect, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'AOE ';

    addDword(gff.RootNode, 'ObjectId', source.id);
    addInt(gff.RootNode, 'AreaEffectId', source.areaEffectId);

    const objectIdOrInvalid = (obj: GameObject | undefined, fallbackId: number) =>
      obj ? obj.id : (fallbackId || GameObjectConstant.OBJECT_INVALID);

    addDword(
      gff.RootNode,
      'LinkedToObject',
      objectIdOrInvalid(source.linkedToObject as any, source.linkedToObjectId),
    );
    addDword(
      gff.RootNode,
      'CreatorId',
      objectIdOrInvalid(source.creator as any, source.creatorId),
    );
    addDword(
      gff.RootNode,
      'LastEntered',
      objectIdOrInvalid(source.lastEntered as any, source.lastEnteredId),
    );
    addDword(
      gff.RootNode,
      'LastLeft',
      objectIdOrInvalid(source.lastLeft as any, source.lastLeftId),
    );

    addDword(gff.RootNode, 'Duration', source.duration);
    addByte(gff.RootNode, 'DurationType', source.durationType);
    addDword(gff.RootNode, 'LastHrtbtDay', source.lastHeartBeatDay);
    addDword(gff.RootNode, 'LastHrtbtTime', source.lastHeartbeatTime);

    const scriptName = (inst: any, fallback: string) =>
      (inst && typeof inst.name === 'string' ? inst.name : '') || fallback || '';

    addString(gff.RootNode, 'OnHeartbeat', scriptName(source.onHeartbeat, source.scriptResRefs.heartbeat || ''));
    addString(gff.RootNode, 'OnUserDefined', scriptName(source.onUserDefined, source.scriptResRefs.onUserDefined || ''));
    addString(gff.RootNode, 'OnObjEnter', scriptName(source.onObjectEnter, source.scriptResRefs.onEnter || ''));
    addString(gff.RootNode, 'OnObjExit', scriptName(source.onObjectExit, source.scriptResRefs.onExit || ''));

    addString(gff.RootNode, 'Tag', source.tag);
    addDword(gff.RootNode, 'SpellId', source.spellId);
    addByte(gff.RootNode, 'Shape', source.shape);
    addByte(gff.RootNode, 'MetaMagicType', source.metaMagicType);
    addInt(gff.RootNode, 'SpellSaveDC', source.spellSaveDC);
    addInt(gff.RootNode, 'SpellLevel', source.spellLevel);

    if (source.shape === AreaOfEffectShape.RECTANGLE) {
      addFloat(gff.RootNode, 'Length', source.length);
      addFloat(gff.RootNode, 'Width', source.width);
    } else {
      addFloat(gff.RootNode, 'Radius', source.radius);
    }

    ActionListSerializer.writeField(gff.RootNode, source as any);
    SwVarTableSerializer.writeField(gff.RootNode, source);

    const effectList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'EffectList'));
    for (let i = 0; i < source.effects.length; i++) {
      effectList.addChildStruct(source.effects[i].save());
    }

    // Emit Position* / Orientation* (see class comment for evidence).
    addFloat(gff.RootNode, 'PositionX', source.position.x);
    addFloat(gff.RootNode, 'PositionY', source.position.y);
    addFloat(gff.RootNode, 'PositionZ', source.position.z);

    const theta = source.rotation.z * Math.PI;
    addFloat(gff.RootNode, 'OrientationX', 1 * Math.cos(theta));
    addFloat(gff.RootNode, 'OrientationY', 1 * Math.sin(theta));
    addFloat(gff.RootNode, 'OrientationZ', 0);

    return gff;
  }
}

export const areaEffectSerializer = new AreaEffectSerializer();
