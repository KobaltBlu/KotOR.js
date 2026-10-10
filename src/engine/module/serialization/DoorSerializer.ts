import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import type { Door } from '@engine/module/Door';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addLocString,
  addResRef,
  addShort,
  addString,
  addWord,
  readBoolByte,
  readByte,
  readDword,
  readFloat,
  readLocString,
  readObjectId,
  readResRef,
  readShort,
  readString,
  readWord,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { NamedVarTableSerializer } from '@engine/module/serialization/NamedVarTableSerializer';
import { ScriptResRefSerializer } from '@engine/module/serialization/ScriptResRefSerializer';
import { PositionBearingTransform } from '@engine/module/serialization/transforms/PositionBearingTransform';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';

export const DOOR_SCRIPT_KEYS = [
  ScriptHook.DoorOnClick,
  ScriptHook.DoorOnClosed,
  ScriptHook.DoorOnDamaged,
  ScriptHook.DoorOnDeath,
  ScriptHook.DoorOnDialog,
  ScriptHook.DoorOnDisarm,
  ScriptHook.DoorOnFailToOpen,
  ScriptHook.DoorOnHeartbeat,
  ScriptHook.DoorOnInvDisturbed,
  ScriptHook.DoorOnLock,
  ScriptHook.DoorOnMeleeAttacked,
  ScriptHook.DoorOnOpen,
  ScriptHook.DoorOnSpellCastAt,
  ScriptHook.DoorOnTrapTriggered,
  ScriptHook.DoorOnUnlock,
  ScriptHook.DoorOnUserDefined,
];

/**
 * Door GIT/UTD serializer.
 * PositionBearing transform; scriptResRefs default to "default".
 * Conversation / EffectList / faction lookup stay in the Door facade.
 */
export class DoorSerializer implements GameObjectSerializer<Door, GFFObject, GFFObject> {
  deserialize(target: Door, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('AnimationState')) target.animationState = readByte(root, 'AnimationState');
    if (root.hasField('Appearance')) target.appearance = readDword(root, 'Appearance');
    if (root.hasField('AutoRemoveKey')) target.autoRemoveKey = readByte(root, 'AutoRemoveKey');
    if (root.hasField('CloseLockDC')) target.closeLockDC = readByte(root, 'CloseLockDC');
    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable');

    // Conversation resref only — DLGObject.FromResRef stays in facade.
    if (root.hasField('Conversation')) {
      (target as any)._conversationResRef = readResRef(root, 'Conversation');
    }

    if (root.hasField('CurrentHP')) target.currentHP = readShort(root, 'CurrentHP');
    if (root.hasField('DisarmDC')) target.disarmDC = readByte(root, 'DisarmDC');

    if (root.hasField('Faction')) {
      target.factionId = readDword(root, 'Faction');
      if ((target.factionId & 0xFFFFFFFF) === -1) target.factionId = 0;
    }

    if (root.hasField('Fort')) target.fort = readByte(root, 'Fort');
    if (root.hasField('GenericType')) target.genericType = readByte(root, 'GenericType');
    if (root.hasField('HP')) target.hp = readShort(root, 'HP');
    if (!root.hasField('CurrentHP')) target.currentHP = target.hp;

    if (root.hasField('Hardness')) target.hardness = readByte(root, 'Hardness');
    if (root.hasField('Interruptable')) target.interruptable = readByte(root, 'Interruptable');
    if (root.hasField('KeyName')) target.keyName = readString(root, 'KeyName');
    if (root.hasField('KeyRequired')) target.keyRequired = readByte(root, 'KeyRequired');
    if (root.hasField('LoadScreenID')) target.loadScreenID = readWord(root, 'LoadScreenID');
    if (root.hasField('LocName')) target.locName = readLocString(root, 'LocName') as any;
    if (root.hasField('Description')) target.description = readLocString(root, 'Description') as any;
    if (root.hasField('Locked')) target.locked = readByte(root, 'Locked');
    if (root.hasField('Min1HP')) target.min1HP = readByte(root, 'Min1HP');
    if (root.hasField('OpenLockDC')) target.openLockDC = readByte(root, 'OpenLockDC');

    if (root.hasField('OpenState')) {
      target.openState = readByte(root, 'OpenState');
      target.alsoOpenState = target.openState;
    }

    if (root.hasField('PaletteID')) target.paletteID = readByte(root, 'PaletteID');

    if (root.hasField('Invulnerable')) {
      target.plot = readBoolByte(root, 'Invulnerable');
    } else if (root.hasField('Plot')) {
      target.plot = readBoolByte(root, 'Plot');
    }

    if (root.hasField('PortraitId')) {
      target.portraitId = readWord(root, 'PortraitId');
    } else if (root.hasField('PortraidId')) {
      target.portraitId = readDword(root, 'PortraidId');
    }
    if ((target.portraitId | 0) === 0) {
      target.portraitId = 0x22E;
    }

    if (root.hasField('Ref')) target.ref = readByte(root, 'Ref');
    if (root.hasField('SecretDoorDC')) target.secretDoorDC = readByte(root, 'SecretDoorDC');
    if (root.hasField('Static')) target.static = readBoolByte(root, 'Static');
    if (target.static) target.plot = true;
    if (root.hasField('Useable')) target.useable = readBoolByte(root, 'Useable');
    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');

    if (root.hasField('TrapDetectDC')) target.trapDetectDC = readByte(root, 'TrapDetectDC');
    if (root.hasField('TrapDetectable')) target.trapDetectable = readBoolByte(root, 'TrapDetectable');
    if (root.hasField('TrapDisarmable')) target.trapDisarmable = readBoolByte(root, 'TrapDisarmable');
    if (root.hasField('TrapFlag')) target.trapFlag = readBoolByte(root, 'TrapFlag');
    if (root.hasField('TrapOneShot')) target.trapOneShot = readBoolByte(root, 'TrapOneShot');
    if (root.hasField('TrapType')) target.trapType = readByte(root, 'TrapType');
    if (root.hasField('Will')) target.will = readByte(root, 'Will');

    PositionBearingTransform.deserialize(target, root);
    if (root.hasField('X')) target.x = target.position.x;
    if (root.hasField('Y')) target.y = target.position.y;
    if (root.hasField('Z')) target.z = target.position.z;
    if (root.hasField('Bearing')) {
      target.rotation.z = target.bearing;
      target.facing = target.bearing;
    }

    if (root.hasField('LinkedTo')) target.linkedTo = readString(root, 'LinkedTo');
    if (root.hasField('LinkedToFlags')) target.linkedToFlags = readByte(root, 'LinkedToFlags');
    if (root.hasField('LinkedToModule')) target.linkedToModule = readResRef(root, 'LinkedToModule');
    if (root.hasField('TransitionDestin')) target.transitionDestin = readLocString(root, 'TransitionDestin') as any;

    if (root.hasField('TweakColor')) target.tweakColor = readDword(root, 'TweakColor');
    if (root.hasField('UseTweakColor')) target.useTweakColor = readBoolByte(root, 'UseTweakColor');
    if (root.hasField('NotBlastable')) target.notBlastable = readBoolByte(root, 'NotBlastable');

    ScriptResRefSerializer.deserialize(target, root, DOOR_SCRIPT_KEYS, 'default');
    SwVarTableSerializer.deserialize(target, root, { loadByteArray: false });
    NamedVarTableSerializer.deserialize(target, root);

    target.initialized = true;
  }

  serialize(source: Door, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTD ';
    gff.RootNode.type = 8;

    ActionListSerializer.writeField(gff.RootNode, source as any);
    addDword(gff.RootNode, 'Appearance', source.appearance);
    addByte(gff.RootNode, 'AutoRemoveKey', source.autoRemoveKey);
    addFloat(gff.RootNode, 'Bearing', source.bearing);
    addByte(gff.RootNode, 'CloseLockDC', source.closeLockDC);
    addByte(gff.RootNode, 'Commandable', source.commandable);
    addResRef(gff.RootNode, 'Conversation', source.conversation ? source.conversation.resref : '');
    addShort(gff.RootNode, 'CurrentHP', source.currentHP);
    addLocString(
      gff.RootNode,
      'Description',
      source.description instanceof CExoLocString ? source.description : new CExoLocString(),
    );
    addByte(gff.RootNode, 'DisarmDC', source.disarmDC);

    const effectList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'EffectList'));
    for (let i = 0; i < source.effects.length; i++) {
      effectList.addChildStruct(source.effects[i].save());
    }

    addDword(gff.RootNode, 'Faction', source.faction ? source.faction.id : source.factionId);
    addByte(gff.RootNode, 'Fort', source.fort);
    addByte(gff.RootNode, 'GenericType', source.genericType);
    addShort(gff.RootNode, 'HP', source.hp);
    addByte(gff.RootNode, 'Hardness', source.hardness);
    addString(gff.RootNode, 'KeyName', source.keyName);
    addByte(gff.RootNode, 'KeyRequired', source.keyRequired);
    addString(gff.RootNode, 'LinkedTo', source.linkedTo);
    addByte(gff.RootNode, 'LinkedToFlags', source.linkedToFlags);
    addResRef(gff.RootNode, 'LinkedToModule', source.linkedToModule);
    addLocString(
      gff.RootNode,
      'LocName',
      source.locName instanceof CExoLocString ? source.locName : new CExoLocString(),
    );
    addWord(gff.RootNode, 'LoadScreenID', source.loadScreenID);
    addByte(gff.RootNode, 'Lockable', source.lockable);
    addByte(gff.RootNode, 'Locked', source.locked);
    addByte(gff.RootNode, 'Min1HP', source.min1HP);
    addDword(gff.RootNode, 'ObjectId', source.id);

    ScriptResRefSerializer.writeFields(gff.RootNode, source, DOOR_SCRIPT_KEYS, {
      preferLoadedName: true,
      fallback: 'default',
    });

    addByte(gff.RootNode, 'OpenLockDC', source.openLockDC);
    addByte(gff.RootNode, 'OpenState', source.openState);
    addByte(gff.RootNode, 'Plot', source.plot);

    if ((source.portraitId | 0) !== 0xFFFF && (source.portraitId | 0) !== -1) {
      addWord(gff.RootNode, 'PortraitId', source.portraitId);
    } else {
      const portraitResRef = (source.portrait as any)?.resref || (source.portrait as any)?.baseresre || '';
      addResRef(gff.RootNode, 'Portrait', portraitResRef || '');
    }

    addByte(gff.RootNode, 'Ref', source.ref);
    SwVarTableSerializer.writeField(gff.RootNode, source);
    addByte(gff.RootNode, 'SecretDoorDC', source.secretDoorDC | 0);
    addByte(gff.RootNode, 'Static', source.static);
    addString(gff.RootNode, 'Tag', source.tag);
    addLocString(
      gff.RootNode,
      'TransitionDestin',
      source.transitionDestin instanceof CExoLocString ? source.transitionDestin : new CExoLocString(),
    );
    addByte(gff.RootNode, 'TrapDetectDC', source.trapDetectDC);
    addByte(gff.RootNode, 'TrapDetectable', source.trapDetectable);
    addByte(gff.RootNode, 'TrapDisarmable', source.trapDisarmable);
    addByte(gff.RootNode, 'TrapFlag', source.trapFlag);
    addByte(gff.RootNode, 'TrapOneShot', source.trapOneShot);
    addByte(gff.RootNode, 'TrapType', source.trapType);
    NamedVarTableSerializer.writeField(gff.RootNode, source);
    addByte(gff.RootNode, 'Will', source.will);
    PositionBearingTransform.writeFields(gff.RootNode, source);

    return gff;
  }
}

export const doorSerializer = new DoorSerializer();
