import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import type { Trigger } from '@engine/module/Trigger';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addInt,
  addLocString,
  addResRef,
  addString,
  addWord,
  readBoolByte,
  readByte,
  readDword,
  readFloat,
  readInt,
  readLocString,
  readObjectId,
  readResRef,
  readString,
  readWord,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { NamedVarTableSerializer } from '@engine/module/serialization/NamedVarTableSerializer';
import { GeometrySerializer } from '@engine/module/serialization/GeometrySerializer';
import { ScriptResRefSerializer } from '@engine/module/serialization/ScriptResRefSerializer';
import { PositionOrientationTransform } from '@engine/module/serialization/transforms/PositionOrientationTransform';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';

const TRIGGER_SCRIPT_KEYS = [
  ScriptHook.TriggerOnClick,
  ScriptHook.TriggerOnDisarm,
  ScriptHook.TriggerOnTrapTriggered,
  ScriptHook.TriggerOnHeartbeat,
  ScriptHook.TriggerOnEnter,
  ScriptHook.TriggerOnExit,
  ScriptHook.TriggerOnUserDefined,
];

/**
 * Trigger GIT/UTT serializer.
 * Geometry uses PointX/Y/Z. Scripts use ScriptHook field labels.
 * Save omits TrapDetectDC / TrapDisarmDC / TrapFlag (UTT-only).
 */
export class TriggerSerializer implements GameObjectSerializer<Trigger, GFFObject, GFFObject> {
  deserialize(target: Trigger, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('AutoRemoveKey')) target.autoRemoveKey = readByte(root, 'AutoRemoveKey');
    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable', true);
    if (root.hasField('Cursor')) target.cursor = readByte(root, 'Cursor');

    if (root.hasField('Faction')) {
      target.factionId = readDword(root, 'Faction');
      if ((target.factionId & 0xFFFFFFFF) === -1) {
        target.factionId = 0;
      }
    }

    GeometrySerializer.deserialize(target, root, 'PointXYZ');

    if (root.hasField('HighlightHeight')) target.highlightHeight = readFloat(root, 'HighlightHeight');
    if (root.hasField('KeyName')) target.keyName = readString(root, 'KeyName');
    if (root.hasField('LinkedTo')) target.linkedTo = readString(root, 'LinkedTo');
    if (root.hasField('LinkedToFlags')) target.linkedToFlags = readByte(root, 'LinkedToFlags');
    if (root.hasField('LinkedToModule')) target.linkedToModule = readResRef(root, 'LinkedToModule');

    if (root.hasField('LoadScreenID')) target.loadScreenID = readWord(root, 'LoadScreenID');
    else if (root.hasField('LoadscreenID')) target.loadScreenID = readWord(root, 'LoadscreenID');

    if (root.hasField('LocalizedName')) target.localizedName = readLocString(root, 'LocalizedName') as any;
    else if (root.hasField('LocName')) target.localizedName = readLocString(root, 'LocName') as any;

    if (root.hasField('PortraidId')) target.portraitId = readDword(root, 'PortraidId');
    if (root.hasField('PortraitId')) target.portraitId = readWord(root, 'PortraitId');

    if (root.hasField('SetByPlayerParty')) target.setByPlayerParty = readByte(root, 'SetByPlayerParty');
    else if (root.hasField('SetByPartyPlayer')) target.setByPlayerParty = readByte(root, 'SetByPartyPlayer');

    if (target.setByPlayerParty) {
      target.trapFlag = target.setByPlayerParty;
    }

    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');
    if (root.hasField('TransitionDestin')) target.transitionDestin = readLocString(root, 'TransitionDestin') as any;

    if (root.hasField('TrapDetectable')) target.trapDetectable = readBoolByte(root, 'TrapDetectable');
    if (root.hasField('TrapDisarmable')) target.trapDisarmable = readBoolByte(root, 'TrapDisarmable');
    if (root.hasField('TrapOneShot')) target.trapOneShot = readBoolByte(root, 'TrapOneShot');
    if (root.hasField('TrapDetectDC')) target.trapDetectDC = readByte(root, 'TrapDetectDC');
    if (root.hasField('TrapDisarmDC')) target.trapDisarmDC = readByte(root, 'TrapDisarmDC');
    if (root.hasField('TrapFlag')) target.trapFlag = readByte(root, 'TrapFlag');
    if (root.hasField('TrapType')) target.trapType = readByte(root, 'TrapType');
    if (root.hasField('Type')) target.type = readInt(root, 'Type');

    PositionOrientationTransform.deserialize(target, root);
    ScriptResRefSerializer.deserialize(target, root, TRIGGER_SCRIPT_KEYS);
    SwVarTableSerializer.deserialize(target, root, { loadByteArray: false });
    NamedVarTableSerializer.deserialize(target, root);

    target.initialized = true;
  }

  serialize(source: Trigger, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTT ';
    gff.RootNode.type = 1;

    ActionListSerializer.writeField(gff.RootNode, source as any);
    addByte(gff.RootNode, 'AutoRemoveKey', source.autoRemoveKey);
    addByte(gff.RootNode, 'Commandable', source.commandable);
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'CreatorId')).setValue(2130706432);
    addByte(gff.RootNode, 'Cursor', source.cursor);
    addDword(gff.RootNode, 'Faction', source.faction ? source.faction.id : source.factionId);

    GeometrySerializer.writeField(gff.RootNode, source, 'PointXYZ', 3);

    addFloat(gff.RootNode, 'HighlightHeight', source.highlightHeight);
    addString(gff.RootNode, 'KeyName', source.keyName);
    addString(gff.RootNode, 'LinkedTo', source.linkedTo);
    addByte(gff.RootNode, 'LinkedToFlags', source.linkedToFlags);
    addResRef(gff.RootNode, 'LinkedToModule', source.linkedToModule);
    addWord(gff.RootNode, 'LoadScreenID', source.loadScreenID);
    addLocString(
      gff.RootNode,
      'LocalizedName',
      source.localizedName instanceof CExoLocString
        ? source.localizedName
        : (source.locName instanceof CExoLocString ? source.locName : new CExoLocString()),
    );
    addDword(gff.RootNode, 'ObjectId', source.id);

    // SaveTrigger prefers loaded script instance names over stored resrefs.
    const writeScript = (key: string) => {
      const value = source.scripts[key]?.name || source.scriptResRefs[key] || '';
      addResRef(gff.RootNode, key, value);
    };
    writeScript(ScriptHook.TriggerOnClick);
    writeScript(ScriptHook.TriggerOnDisarm);
    writeScript(ScriptHook.TriggerOnTrapTriggered);

    addWord(gff.RootNode, 'PortraitId', source.portraitId);
    SwVarTableSerializer.writeField(gff.RootNode, source);

    writeScript(ScriptHook.TriggerOnHeartbeat);
    writeScript(ScriptHook.TriggerOnEnter);
    writeScript(ScriptHook.TriggerOnExit);
    writeScript(ScriptHook.TriggerOnUserDefined);

    addByte(gff.RootNode, 'SetByPlayerParty', source.setByPlayerParty);
    addString(gff.RootNode, 'Tag', source.tag);
    addLocString(
      gff.RootNode,
      'TransitionDestin',
      source.transitionDestin instanceof CExoLocString ? source.transitionDestin : new CExoLocString(),
    );
    // SaveTrigger omits TrapDetectDC / TrapDisarmDC / TrapFlag (UTT-only)
    addByte(gff.RootNode, 'TrapDetectable', source.trapDetectable);
    addByte(gff.RootNode, 'TrapDisarmable', source.trapDisarmable);
    addByte(gff.RootNode, 'TrapOneShot', source.trapOneShot);
    addByte(gff.RootNode, 'TrapType', source.trapType);
    addInt(gff.RootNode, 'Type', source.type);
    NamedVarTableSerializer.writeField(gff.RootNode, source);
    PositionOrientationTransform.writeFields(gff.RootNode, source);

    return gff;
  }
}

export const triggerSerializer = new TriggerSerializer();
