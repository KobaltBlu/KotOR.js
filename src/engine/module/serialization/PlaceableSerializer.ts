import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import { ModulePlaceableAnimState } from '@core/enums/module/ModulePlaceableAnimState';
import { ModulePlaceableState } from '@core/enums/module/ModulePlaceableState';
import type { Placeable } from '@engine/module/Placeable';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addInt,
  addLocString,
  addResRef,
  addShort,
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
  readShort,
  readString,
  readWord,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { NamedVarTableSerializer } from '@engine/module/serialization/NamedVarTableSerializer';
import { ScriptResRefSerializer } from '@engine/module/serialization/ScriptResRefSerializer';
import { PositionBearingTransform } from '@engine/module/serialization/transforms/PositionBearingTransform';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';
import { itemSerializer } from '@engine/module/serialization/ItemSerializer';

export const PLACEABLE_SCRIPT_KEYS = [
  ScriptHook.PlaceableOnClosed,
  ScriptHook.PlaceableOnDamaged,
  ScriptHook.PlaceableOnDeath,
  ScriptHook.PlaceableOnDialog,
  ScriptHook.PlaceableOnDisarm,
  ScriptHook.PlaceableOnEndDialogue,
  ScriptHook.PlaceableOnHeartbeat,
  ScriptHook.PlaceableOnInvDisturbed,
  ScriptHook.PlaceableOnLock,
  ScriptHook.PlaceableOnMeleeAttacked,
  ScriptHook.PlaceableOnOpen,
  ScriptHook.PlaceableOnSpellCastAt,
  ScriptHook.PlaceableOnTrapTriggered,
  ScriptHook.PlaceableOnUnlock,
  ScriptHook.PlaceableOnUsed,
  ScriptHook.PlaceableOnUserDefined,
];

/**
 * Placeable GIT/UTP serializer.
 * PositionBearing transform; ItemList nested on serialize when inventory non-empty.
 * Inventory load stays in Placeable.loadInventory facade.
 */
export class PlaceableSerializer implements GameObjectSerializer<Placeable, GFFObject, GFFObject> {
  deserialize(target: Placeable, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('LocName')) {
      const loc = readLocString(root, 'LocName');
      if (loc) {
        target.name = loc.getValue();
        target.locName = loc as any;
      }
    }

    if (root.hasField('Animation')) {
      target.setAnimationState(readInt(root, 'Animation'));
    }

    if (root.hasField('AnimationState')) {
      const animState = readByte(root, 'AnimationState');
      switch (animState) {
        case 1:
          target.setAnimationState(ModulePlaceableAnimState.OPEN);
          break;
        case 2:
          target.setAnimationState(ModulePlaceableAnimState.CLOSE);
          target.setOpenState(ModulePlaceableState.CLOSED);
          break;
        case 3:
          target.setAnimationState(ModulePlaceableAnimState.DEAD);
          break;
        case 4:
          target.setAnimationState(ModulePlaceableAnimState.ACTIVATE);
          break;
        case 5:
          target.setAnimationState(ModulePlaceableAnimState.DEACTIVATE);
          break;
        default:
          target.setAnimationState(ModulePlaceableAnimState.DEFAULT);
          break;
      }
    }

    if (root.hasField('Appearance')) target.appearance = readDword(root, 'Appearance');
    if (root.hasField('AutoRemoveKey')) target.autoRemoveKey = readByte(root, 'AutoRemoveKey');
    if (root.hasField('BodyBag')) target.bodyBag = readByte(root, 'BodyBag');
    if (root.hasField('CloseLockDC')) target.closeLockDC = readByte(root, 'CloseLockDC');
    if (root.hasField('Conversation')) {
      (target as any)._conversationResRef = readResRef(root, 'Conversation');
    }
    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable');
    if (root.hasField('CurrentHP')) target.currentHP = readShort(root, 'CurrentHP');
    if (root.hasField('DisarmDC')) target.disarmDC = readByte(root, 'DisarmDC');

    if (root.hasField('Faction')) {
      target.factionId = readDword(root, 'Faction');
      if ((target.factionId & 0xFFFFFFFF) === -1) target.factionId = 0;
    }

    if (root.hasField('Fort')) target.fort = readByte(root, 'Fort');
    if (root.hasField('HP')) target.hp = readShort(root, 'HP');
    if (!root.hasField('CurrentHP')) target.currentHP = target.hp;

    if (root.hasField('Hardness')) target.hardness = readByte(root, 'Hardness');
    if (root.hasField('HasInventory')) target.hasInventory = readByte(root, 'HasInventory');
    if (root.hasField('IsBodyBag')) target.isBodyBag = readBoolByte(root, 'IsBodyBag');
    if (root.hasField('IsBodyBagVisible')) target.isBodyBagVisible = readBoolByte(root, 'IsBodyBagVisible');
    if (root.hasField('DieWhenEmpty')) target.dieWhenEmpty = readBoolByte(root, 'DieWhenEmpty');
    if (root.hasField('IsCorpse')) target.isCorpse = readBoolByte(root, 'IsCorpse');
    if (root.hasField('GroundPile')) target.groundPile = readBoolByte(root, 'GroundPile');
    if (root.hasField('IsDestroyable')) target.isDestroyable = readBoolByte(root, 'IsDestroyable');
    if (root.hasField('Interruptable')) target.interruptable = readByte(root, 'Interruptable');
    if (root.hasField('KeyName')) target.keyName = readString(root, 'KeyName');
    if (root.hasField('KeyRequired')) target.keyRequired = readByte(root, 'KeyRequired');
    if (root.hasField('Description')) target.description = readLocString(root, 'Description') as any;
    if (root.hasField('Locked')) target.locked = readByte(root, 'Locked');
    if (root.hasField('Min1HP')) target.min1HP = readByte(root, 'Min1HP');
    if (root.hasField('OpenLockDC')) target.openLockDC = readByte(root, 'OpenLockDC');
    if (root.hasField('PaletteID')) target.paletteID = readByte(root, 'PaletteID');

    if (root.hasField('Invulnerable')) {
      target.plot = readBoolByte(root, 'Invulnerable');
    } else if (root.hasField('Plot')) {
      target.plot = readBoolByte(root, 'Plot');
    }

    if (root.hasField('PartyInteract')) target.partyInteract = readByte(root, 'PartyInteract');

    if (root.hasField('PortraitId')) target.portraitId = readWord(root, 'PortraitId');
    else if (root.hasField('PortraidId')) target.portraitId = readDword(root, 'PortraidId');

    if (root.hasField('Ref')) target.ref = readByte(root, 'Ref');
    if (root.hasField('Useable')) target.useable = readByte(root, 'Useable');

    if (root.hasField('Static')) {
      target.static = readBoolByte(root, 'Static');
    } else {
      target.static = !target.useable;
    }
    if (target.static) target.plot = true;

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

    if (root.hasField('TweakColor')) target.tweakColor = readDword(root, 'TweakColor');
    if (root.hasField('UseTweakColor')) target.useTweakColor = readByte(root, 'UseTweakColor');
    if (root.hasField('NotBlastable')) target.notBlastable = readBoolByte(root, 'NotBlastable');

    ScriptResRefSerializer.deserialize(target, root, PLACEABLE_SCRIPT_KEYS);
    SwVarTableSerializer.deserialize(target, root, { loadByteArray: false });
    NamedVarTableSerializer.deserialize(target, root);

    if (target.animState === ModulePlaceableAnimState.DEFAULT && !target.isOpen()) {
      target.setAnimationState(ModulePlaceableAnimState.CLOSE);
    }

    target.initialized = true;
  }

  serialize(source: Placeable, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTP ';
    gff.RootNode.type = 9;

    ActionListSerializer.writeField(gff.RootNode, source as any);
    addInt(gff.RootNode, 'Animation', source.animState);
    addDword(gff.RootNode, 'Appearance', source.appearance);
    addByte(gff.RootNode, 'AutoRemoveKey', source.autoRemoveKey);
    addFloat(gff.RootNode, 'Bearing', source.bearing);
    addByte(gff.RootNode, 'BodyBag', source.bodyBag);
    addByte(gff.RootNode, 'CloseLockDC', source.closeLockDC);
    addByte(gff.RootNode, 'Commandable', source.commandable);
    addResRef(gff.RootNode, 'Conversation', source.conversation ? source.conversation.resref : '');
    addShort(gff.RootNode, 'CurrentHP', source.currentHP);
    addLocString(
      gff.RootNode,
      'Description',
      source.description instanceof CExoLocString ? source.description : new CExoLocString(),
    );
    addByte(gff.RootNode, 'DieWhenEmpty', source.dieWhenEmpty);
    addByte(gff.RootNode, 'DisarmDC', source.disarmDC);

    const effectList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'EffectList'));
    for (let i = 0; i < source.effects.length; i++) {
      effectList.addChildStruct(source.effects[i].save());
    }

    addDword(gff.RootNode, 'Faction', source.faction ? source.faction.id : source.factionId);
    addByte(gff.RootNode, 'Fort', source.fort);
    addByte(gff.RootNode, 'GroundPile', source.groundPile);
    addShort(gff.RootNode, 'HP', source.hp);
    addByte(gff.RootNode, 'Hardness', source.hardness);
    addByte(gff.RootNode, 'HasInventory', source.hasInventory);
    addByte(gff.RootNode, 'IsBodyBag', source.isBodyBag);
    addByte(gff.RootNode, 'IsBodyBagVisible', source.isBodyBagVisible);
    addByte(gff.RootNode, 'IsCorpse', source.isCorpse);

    if (source.inventory.length) {
      const itemList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
      for (let i = 0; i < source.inventory.length; i++) {
        const invItem = source.inventory[i];
        const itemStruct = itemSerializer.serialize(invItem);
        itemStruct.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(invItem.id >>> 0);
        itemList.addChildStruct(itemStruct);
      }
    }

    addString(gff.RootNode, 'KeyName', source.keyName);
    addByte(gff.RootNode, 'KeyRequired', source.keyRequired);
    addByte(gff.RootNode, 'LightState', source.lightState ? 1 : 0);
    addLocString(
      gff.RootNode,
      'LocName',
      source.locName instanceof CExoLocString ? source.locName : new CExoLocString(),
    );
    addByte(gff.RootNode, 'Lockable', source.lockable);
    addByte(gff.RootNode, 'Locked', source.locked);
    addByte(gff.RootNode, 'Min1HP', source.min1HP);
    addDword(gff.RootNode, 'ObjectId', source.id);

    ScriptResRefSerializer.writeFields(gff.RootNode, source, [
      ScriptHook.PlaceableOnClosed,
      ScriptHook.PlaceableOnDamaged,
      ScriptHook.PlaceableOnDeath,
      ScriptHook.PlaceableOnDisarm,
      ScriptHook.PlaceableOnHeartbeat,
      ScriptHook.PlaceableOnInvDisturbed,
      ScriptHook.PlaceableOnLock,
      ScriptHook.PlaceableOnMeleeAttacked,
      ScriptHook.PlaceableOnOpen,
      ScriptHook.PlaceableOnSpellCastAt,
      ScriptHook.PlaceableOnUnlock,
      ScriptHook.PlaceableOnUsed,
      ScriptHook.PlaceableOnUserDefined,
      ScriptHook.PlaceableOnDialog,
      ScriptHook.PlaceableOnEndDialogue,
      ScriptHook.PlaceableOnTrapTriggered,
    ], { preferLoadedName: true, fallback: '' });

    addByte(gff.RootNode, 'Open', source.isOpen() ? 1 : 0);
    addByte(gff.RootNode, 'OpenLockDC', source.openLockDC);
    addByte(gff.RootNode, 'PartyInteract', source.partyInteract);
    addByte(gff.RootNode, 'Plot', source.plot);

    if ((source.portraitId | 0) !== 0xFFFF && (source.portraitId | 0) !== -1) {
      addWord(gff.RootNode, 'PortraitId', source.portraitId);
    } else {
      const portraitResRef = (source.portrait as any)?.resref || (source.portrait as any)?.baseresre || '';
      addResRef(gff.RootNode, 'Portrait', portraitResRef || '');
    }

    addByte(gff.RootNode, 'Ref', source.ref);
    SwVarTableSerializer.writeField(gff.RootNode, source);
    addByte(gff.RootNode, 'Static', source.static);
    addString(gff.RootNode, 'Tag', source.tag);
    addByte(gff.RootNode, 'TrapDetectDC', source.trapDetectDC);
    addByte(gff.RootNode, 'TrapDetectable', source.trapDetectable);
    addByte(gff.RootNode, 'TrapDisarmable', source.trapDisarmable);
    addByte(gff.RootNode, 'TrapFlag', source.trapFlag);
    addByte(gff.RootNode, 'TrapOneShot', source.trapOneShot);
    addByte(gff.RootNode, 'TrapType', source.trapType);
    addByte(gff.RootNode, 'Useable', source.useable);
    NamedVarTableSerializer.writeField(gff.RootNode, source);
    addByte(gff.RootNode, 'Will', source.will);
    PositionBearingTransform.writeFields(gff.RootNode, source);

    return gff;
  }
}

export const placeableSerializer = new PlaceableSerializer();
