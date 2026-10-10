import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { CExoLocString } from '@core/resource/CExoLocString';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import { GameEffectType } from '@core/enums/effects/GameEffectType';
import type { Creature } from '@engine/module/Creature';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { GameState } from '@engine/runtime/GameState';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import * as THREE from 'three';

function defaultPartyFollowInfo() {
  return {
    followObject: GameObjectConstant.OBJECT_INVALID,
    followLocation: new THREE.Vector3(0, 0, 0),
    lastLeaderPos: new THREE.Vector3(0, 0, 0),
    lastFollowerPos: new THREE.Vector3(0, 0, 0),
    maxSpeed: 0,
    stickToPos: 0,
    result: 2,
    timeElapsed: 0,
    inSafetyRange: 0,
  };
}
import {
  addByte,
  addChar,
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
import { PositionOrientationTransform } from '@engine/module/serialization/transforms/PositionOrientationTransform';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';
import { itemSerializer } from '@engine/module/serialization/ItemSerializer';

export const CREATURE_SCRIPT_KEYS = [
  ScriptHook.CreatureOnAttacked,
  ScriptHook.CreatureOnDamaged,
  ScriptHook.CreatureOnDeath,
  ScriptHook.CreatureOnDialog,
  ScriptHook.CreatureOnDisturbed,
  ScriptHook.CreatureOnEndDialog,
  ScriptHook.CreatureOnEndRound,
  ScriptHook.CreatureOnHeartbeat,
  ScriptHook.CreatureOnBlocked,
  ScriptHook.CreatureOnNotice,
  ScriptHook.CreatureOnRested,
  ScriptHook.CreatureOnSpawn,
  ScriptHook.CreatureOnSpellAt,
  ScriptHook.CreatureOnUserDefined,
];

const CREATURE_SCRIPT_SAVE_FIELDS: Array<[string, string]> = [
  ['ScriptAttacked', ScriptHook.CreatureOnAttacked],
  ['ScriptDamaged', ScriptHook.CreatureOnDamaged],
  ['ScriptDeath', ScriptHook.CreatureOnDeath],
  ['ScriptDialogue', ScriptHook.CreatureOnDialog],
  ['ScriptDisturbed', ScriptHook.CreatureOnDisturbed],
  ['ScriptEndDialogu', ScriptHook.CreatureOnEndDialog],
  ['ScriptEndRound', ScriptHook.CreatureOnEndRound],
  ['ScriptHeartbeat', ScriptHook.CreatureOnHeartbeat],
  ['ScriptOnBlocked', ScriptHook.CreatureOnBlocked],
  ['ScriptOnNotice', ScriptHook.CreatureOnNotice],
  ['ScriptRested', ScriptHook.CreatureOnRested],
  ['ScriptSpawn', ScriptHook.CreatureOnSpawn],
  ['ScriptSpellAt', ScriptHook.CreatureOnSpellAt],
  ['ScriptUserDefine', ScriptHook.CreatureOnUserDefined],
];

/**
 * Creature UTC/GIT serializer — scalar + common list fields.
 * Nested construction that needs GameState (classes, feats, equipment, effects,
 * conversation, perceptionRange, skill templates) stays in the Creature facade.
 */
export class CreatureSerializer implements GameObjectSerializer<Creature, GFFObject, GFFObject> {
  deserialize(target: Creature, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('Appearance_Type')) {
      // setAppearance may touch appearance tables — store id; facade may re-call setAppearance.
      (target as any)._pendingAppearance = readWord(root, 'Appearance_Type');
    }

    if (root.hasField('AreaId')) target.savedAreaId = readDword(root, 'AreaId');
    if (root.hasField('Age')) target.age = readInt(root, 'Age');
    if (root.hasField('AIState')) target.aiState = readInt(root, 'AIState');
    if (root.hasField('AmbientAnimState')) target.ambientAnimState = readByte(root, 'AmbientAnimState');
    if (root.hasField('Appearance_Head')) target.appearanceHead = readByte(root, 'Appearance_Head');
    if (root.hasField('Color_Hair')) target.colorHair = readByte(root, 'Color_Hair');
    if (root.hasField('Color_Skin')) target.colorSkin = readByte(root, 'Color_Skin');
    if (root.hasField('Color_Tattoo1')) target.colorTattoo1 = readByte(root, 'Color_Tattoo1');
    if (root.hasField('Color_Tattoo2')) target.colorTattoo2 = readByte(root, 'Color_Tattoo2');
    if (root.hasField('DuplicatingHead')) target.duplicatingHead = readByte(root, 'DuplicatingHead');
    if (root.hasField('UseBackupHead')) target.useBackupHead = readByte(root, 'UseBackupHead');
    if (root.hasField('Tail')) target.tail = readByte(root, 'Tail');
    if (root.hasField('Wings')) target.wings = readByte(root, 'Wings');
    if (root.hasField('BodyBag')) target.bodyBag = readByte(root, 'BodyBag');
    if (root.hasField('BodyVariation')) target.bodyVariation = readByte(root, 'BodyVariation');
    if (root.hasField('Gold')) target.gold = readDword(root, 'Gold');
    if (root.hasField('ChallengeRating')) target.challengeRating = readFloat(root, 'ChallengeRating');

    if (root.hasField('Conversation')) {
      (target as any)._conversationResRef = readResRef(root, 'Conversation');
    }

    if (root.hasField('CurrentForce')) target.currentForce = readShort(root, 'CurrentForce');
    if (root.hasField('HitPoints')) target.hitPoints = readShort(root, 'HitPoints');
    if (root.hasField('CurrentHitPoints')) {
      target.currentHitPoints = readShort(root, 'CurrentHitPoints');
    } else {
      target.currentHitPoints = target.hitPoints;
    }

    if (root.hasField('Disarmable')) target.disarmable = readByte(root, 'Disarmable');
    if (root.hasField('Experience')) target.experience = readDword(root, 'Experience');
    if (root.hasField('Listening')) target.setListening(readByte(root, 'Listening'));
    if (root.hasField('Commandable')) target.setCommadable(readByte(root, 'Commandable'));

    if (root.hasField('StealthMode')) {
      (target as any)._pendingStealthMode = readBoolByte(root, 'StealthMode');
    }

    if (root.hasField('FactionID')) {
      target.factionId = readWord(root, 'FactionID');
      if ((target.factionId & 0xFFFFFFFF) === -1) target.factionId = 0;
    }

    if (root.hasField('FirstName')) target.firstName = readLocString(root, 'FirstName') as any;
    if (root.hasField('ForcePoints')) target.forcePoints = readShort(root, 'ForcePoints');
    if (root.hasField('Gender')) target.gender = readByte(root, 'Gender');
    if (root.hasField('GoodEvil')) {
      target.goodEvil = readByte(root, 'GoodEvil');
      target.baseGoodEvil = target.goodEvil;
    }
    if (root.hasField('Hologram')) target.isHologram = readByte(root, 'Hologram');
    if (root.hasField('Interruptable')) target.interruptable = readByte(root, 'Interruptable');
    if (root.hasField('IsPC')) target.isPC = readByte(root, 'IsPC');
    if (root.hasField('LastName')) target.lastName = readLocString(root, 'LastName') as any;

    if (root.hasField('MaxHitPoints')) target.maxHitPoints = readShort(root, 'MaxHitPoints');
    if (target.maxHitPoints <= 0 && target.hitPoints > 0) target.maxHitPoints = target.hitPoints;

    if (root.hasField('MaxForcePoints')) target.maxForcePoints = readShort(root, 'MaxForcePoints');
    if (target.currentForce <= 0 && target.forcePoints > 0) {
      target.currentForce = target.maxForcePoints > 0
        ? Math.min(target.forcePoints, target.maxForcePoints)
        : target.forcePoints;
    }

    if (root.hasField('Min1HP')) target.min1HP = readByte(root, 'Min1HP');
    if (root.hasField('NaturalAC')) target.naturalAC = readByte(root, 'NaturalAC');
    if (root.hasField('NoPermDeath')) target.noPermDeath = readByte(root, 'NoPermDeath');
    if (root.hasField('NotReorienting')) target.notReorienting = readByte(root, 'NotReorienting');
    if (root.hasField('PartyInteract')) target.partyInteract = readByte(root, 'PartyInteract');
    if (root.hasField('PerceptionRange')) {
      (target as any)._pendingPerceptionRangeId = readByte(root, 'PerceptionRange');
    }
    if (root.hasField('Phenotype')) target.phenotype = readInt(root, 'Phenotype');
    if (root.hasField('Plot')) target.plot = readByte(root, 'Plot');
    if (root.hasField('IsDestroyable')) target.isDestroyable = readBoolByte(root, 'IsDestroyable');
    if (root.hasField('IsRaiseable')) target.isRaisable = readBoolByte(root, 'IsRaiseable');
    if (root.hasField('DeadSelectable')) target.isDeadSelectable = readBoolByte(root, 'DeadSelectable');
    if (root.hasField('PortraitId')) target.portraitId = readWord(root, 'PortraitId');
    if (root.hasField('Race')) target.race = readByte(root, 'Race');

    if (root.hasField('SkillList') && target.skills?.length) {
      const skills = root.getFieldByLabel('SkillList').getChildStructs?.() || [];
      for (let i = 0; i < skills.length; i++) {
        if (target.skills[i]) {
          target.skills[i].rank = skills[i].getFieldByLabel('Rank').getValue();
        }
      }
    }

    if (root.hasField('SoundSetFile')) target.soundSetFile = readWord(root, 'SoundSetFile');

    if (root.hasField('SpecAbilityList')) {
      target.specialAbilities = [];
      const list = root.getFieldByLabel('SpecAbilityList').getChildStructs?.() || [];
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        target.specialAbilities.push({
          spell: s.hasField('Spell') ? (s.getFieldByLabel('Spell').getValue() | 0) : 0,
          spellFlags: s.hasField('SpellFlags') ? (s.getFieldByLabel('SpellFlags').getValue() | 0) : 0,
          spellCasterLevel: s.hasField('SpellCasterLevel') ? (s.getFieldByLabel('SpellCasterLevel').getValue() | 0) : 0,
        });
      }
    }

    if (root.hasField('StartingPackage')) target.startingPackage = readByte(root, 'StartingPackage');
    if (root.hasField('SubRace')) target.subrace = readString(root, 'SubRace');
    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');
    if (root.hasField('TextureVar')) target.textureVar = readByte(root, 'TextureVar');

    if (root.hasField('MovementRate')) target.walkRate = readByte(root, 'MovementRate');
    else if (root.hasField('WalkRate')) target.walkRate = readByte(root, 'WalkRate');

    if (root.hasField('Str')) target.str = readByte(root, 'Str');
    if (root.hasField('Dex')) target.dex = readByte(root, 'Dex');
    if (root.hasField('Con')) target.con = readByte(root, 'Con');
    if (root.hasField('Cha')) target.cha = readByte(root, 'Cha');
    if (root.hasField('Wis')) target.wis = readByte(root, 'Wis');
    if (root.hasField('Int')) target.int = readByte(root, 'Int');

    PositionOrientationTransform.deserialize(target, root);

    if (root.hasField('FortSaveThrow')) target.fortitudeSaveThrow = readByte(root, 'FortSaveThrow');
    if (root.hasField('RefSaveThrow')) target.reflexSaveThrow = readByte(root, 'RefSaveThrow');
    if (root.hasField('WillSaveThrow')) target.willSaveThrow = readByte(root, 'WillSaveThrow');
    if (root.hasField('SubraceIndex')) target.subraceIndex = readByte(root, 'SubraceIndex');

    SwVarTableSerializer.deserialize(target, root);

    if (root.hasField('PM_Appearance')) target.pm_Appearance = readWord(root, 'PM_Appearance');
    if (root.hasField('PM_IsDisguised')) target.pm_IsDisguised = readBoolByte(root, 'PM_IsDisguised');

    if (root.hasField('PerceptionList')) {
      const perceptionList = root.getFieldByLabel('PerceptionList').getChildStructs?.() || [];
      if (perceptionList.length) target.perceptionList = [];
      for (let i = 0; i < perceptionList.length; i++) {
        const perception = perceptionList[i];
        target.perceptionList.push({
          object: undefined,
          objectId: perception.getFieldByLabel('ObjectId').getValue(),
          data: perception.getFieldByLabel('PerceptionData').getValue(),
        });
      }
    }

    // Script resrefs use Script* save labels — hydrate from those field names.
    for (const [field, hook] of CREATURE_SCRIPT_SAVE_FIELDS) {
      if (root.hasField(field) && typeof target.scriptResRefs[hook] !== 'string') {
        target.scriptResRefs[hook] = readResRef(root, field);
      }
    }

    NamedVarTableSerializer.deserialize(target, root);
  }

  serialize(source: Creature, context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';
    gff.RootNode.type = 4;

    addDword(gff.RootNode, 'ObjectId', source.id);
    addInt(gff.RootNode, 'AIState', source.aiState | 0);
    ActionListSerializer.writeField(gff.RootNode, source as any);
    addInt(gff.RootNode, 'Age', source.age | 0);
    addByte(gff.RootNode, 'AmbientAnimState', source.ambientAnimState | 0);
    addInt(gff.RootNode, 'Animation', source.animationState?.index ?? 10000);
    addByte(gff.RootNode, 'Appearance_Head', source.appearanceHead | 0);
    addWord(gff.RootNode, 'Appearance_Type', source.appearance);
    addDword(gff.RootNode, 'AreaId', source.getSaveAreaId?.() || (source.savedAreaId >>> 0));
    addShort(gff.RootNode, 'ArmorClass', source.getAC());
    addByte(gff.RootNode, 'BodyBag', source.bodyBag);
    addByte(gff.RootNode, 'Cha', source.cha);
    addFloat(gff.RootNode, 'ChallengeRating', source.challengeRating);

    const classList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ClassList'));
    for (let i = 0; i < source.classes.length; i++) {
      classList.addChildStruct(source.classes[i].save());
    }
    addByte(gff.RootNode, 'MClassLevUpIn', Math.max(0, (source.classes?.length || 1) - 1));

    addByte(gff.RootNode, 'Color_Hair', source.colorHair | 0);
    addByte(gff.RootNode, 'Color_Skin', source.colorSkin | 0);
    addByte(gff.RootNode, 'Color_Tattoo1', source.colorTattoo1 | 0);
    addByte(gff.RootNode, 'Color_Tattoo2', source.colorTattoo2 | 0);

    const combatInfoStruct = gff.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'CombatInfo'));
    source.syncCombatInformationForSave?.();
    combatInfoStruct.addChildStruct(source.combatInformation.toStruct(0xCAAA));

    const combatRoundDataStruct = gff.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'CombatRoundData'));
    if (source.combatRound.roundStarted) {
      combatRoundDataStruct.addChildStruct(source.combatRound.toStruct(0xCADA));
    } else {
      combatRoundDataStruct.addChildStruct(new GFFStruct(0xCADA));
    }

    addByte(gff.RootNode, 'Commandable', source.getCommadable() ? 1 : 0);
    addByte(gff.RootNode, 'Con', source.con);
    addResRef(gff.RootNode, 'Conversation', source.conversation ? source.conversation.resref : '');
    addByte(gff.RootNode, 'CreatnScrptFird', source.spawned ? 1 : 0);
    addInt(gff.RootNode, 'CreatureSize', source.getAppearance()?.sizecategory ?? 3);
    addShort(gff.RootNode, 'CurrentForce', source.currentForce);
    addShort(gff.RootNode, 'CurrentHitPoints', source.currentHitPoints);
    addByte(gff.RootNode, 'DeadSelectable', source.isDeadSelectable);
    addString(gff.RootNode, 'Deity', source.deity || '');
    addLocString(
      gff.RootNode,
      'Description',
      source.description instanceof CExoLocString ? source.description : new CExoLocString(),
    );
    addByte(gff.RootNode, 'DetectMode', source.detectMode ? 1 : 0);
    addByte(gff.RootNode, 'Dex', source.dex);
    addByte(gff.RootNode, 'Disarmable', source.disarmable);
    addByte(gff.RootNode, 'DuplicatingHead', source.duplicatingHead | 0);

    const effectList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'EffectList'));
    for (let i = 0; i < source.effects.length; i++) {
      effectList.addChildStruct(source.effects[i].save());
    }

    const equipItemList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    for (let slot = 1, n = 0; n < 18; slot <<= 1, n++) {
      const equipped = source.GetItemInSlot(slot);
      if (!equipped) continue;
      const equipItem = itemSerializer.serialize(equipped, context);
      equipItem.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(equipped.id >>> 0);
      equipItem.setType(slot);
      equipItemList.addChildStruct(equipItem);
    }

    addDword(gff.RootNode, 'Experience', source.experience);

    if (source.listeningPatterns.length > 0) {
      const expressionList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ExpressionList'));
      for (let i = 0; i < source.listeningPatterns.length; i++) {
        const entry = source.listeningPatterns[i];
        const expressionStruct = new GFFStruct(5);
        expressionStruct.addField(new GFFField(GFFDataType.INT, 'ExpressionId')).setValue(entry.number);
        expressionStruct.addField(new GFFField(GFFDataType.CEXOSTRING, 'ExpressionString')).setValue(entry.pattern);
        expressionList.addChildStruct(expressionStruct);
      }
    }

    addWord(gff.RootNode, 'FactionID', source.faction ? source.faction.id : source.factionId);

    if (source.feats.length > 0) {
      const featList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'FeatList'));
      for (let i = 0; i < source.feats.length; i++) {
        const featStruct = source.feats[i].save();
        if (typeof featStruct.setType === 'function') featStruct.setType(1);
        featList.addChildStruct(featStruct);
      }
    }

    addLocString(
      gff.RootNode,
      'FirstName',
      source.firstName instanceof CExoLocString ? source.firstName : new CExoLocString(),
    );
    addShort(gff.RootNode, 'ForcePoints', source.forcePoints | 0);
    addChar(gff.RootNode, 'FortSaveThrow', source.fortitudeSaveThrow);
    addByte(gff.RootNode, 'Gender', source.gender);
    addDword(gff.RootNode, 'Gold', source.gold || 0);
    addByte(gff.RootNode, 'GoodEvil', source.goodEvil);
    addShort(gff.RootNode, 'HitPoints', source.hitPoints);
    addByte(gff.RootNode, 'Int', source.int);
    addByte(gff.RootNode, 'Interruptable', source.interruptable);
    addByte(gff.RootNode, 'IsDestroyable', source.isDestroyable);
    addByte(gff.RootNode, 'IsPC', source.isPC);
    addByte(gff.RootNode, 'IsRaiseable', source.isRaisable);
    if (source.playerCreated) {
      addInt(gff.RootNode, 'PlayerCreated', 1);
    }

    const itemList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
    for (let i = 0; i < source.inventory.length; i++) {
      const invItem = source.inventory[i];
      const itemStruct = itemSerializer.serialize(invItem, context);
      itemStruct.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(invItem.id >>> 0);
      itemList.addChildStruct(itemStruct);
    }

    addInt(gff.RootNode, 'JoiningXP', source.joiningXP ? source.joiningXP : 0);
    addLocString(
      gff.RootNode,
      'LastName',
      source.lastName instanceof CExoLocString ? source.lastName : new CExoLocString(),
    );
    addByte(gff.RootNode, 'Listening', source.isListening);
    addShort(gff.RootNode, 'MaxForcePoints', source.maxForcePoints);
    addShort(gff.RootNode, 'MaxHitPoints', source.maxHitPoints);
    addByte(gff.RootNode, 'Min1HP', source.min1HP);
    addByte(gff.RootNode, 'MovementRate', source.getMovementRate());
    addByte(gff.RootNode, 'NaturalAC', source.naturalAC);
    if (context?.gameKey === 'k2') {
      addByte(gff.RootNode, 'NoPermDeath', source.noPermDeath);
    }
    addByte(gff.RootNode, 'NotReorienting', source.notReorienting);

    addByte(gff.RootNode, 'PM_IsDisguised', source.hasEffect(GameEffectType.EffectDisguise) ? 1 : 0);
    if (source.hasEffect(GameEffectType.EffectDisguise)) {
      addWord(gff.RootNode, 'PM_Appearance', source.appearance);
    }

    addByte(gff.RootNode, 'PartyInteract', source.partyInteract);

    const perceptionList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'PerceptionList'));
    for (let i = 0; i < source.perceptionList.length; i++) {
      const percept = source.perceptionList[i];
      const perceptionStruct = new GFFStruct();
      perceptionStruct.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(percept.objectId);
      perceptionStruct.addField(new GFFField(GFFDataType.BYTE, 'PerceptionData')).setValue(percept.data & 0xFF);
      perceptionList.addChildStruct(perceptionStruct);
    }

    addInt(gff.RootNode, 'Phenotype', source.phenotype);
    addByte(gff.RootNode, 'Plot', source.plot);
    addWord(gff.RootNode, 'PortraitId', source.portraitId);
    addShort(gff.RootNode, 'PregameCurrent', source.getHP() | 0);
    addByte(gff.RootNode, 'Race', source.race);
    addChar(gff.RootNode, 'RefSaveThrow', source.reflexSaveThrow);

    SwVarTableSerializer.writeField(gff.RootNode, source);

    for (const [field, hook] of CREATURE_SCRIPT_SAVE_FIELDS) {
      addResRef(gff.RootNode, field, source.scripts[hook]?.name || source.scriptResRefs[hook] || '');
    }

    const skillList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'SkillList'));
    for (let i = 0; i < 8; i++) {
      skillList.addChildStruct(source.skills[i].save());
    }

    addWord(gff.RootNode, 'SkillPoints', source.skillPoints ? source.skillPoints : 0);
    addWord(gff.RootNode, 'SoundSetFile', source.soundSetFile);

    if (source.specialAbilities.length > 0) {
      const specAbilityList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'SpecAbilityList'));
      for (let i = 0; i < source.specialAbilities.length; i++) {
        const sa = source.specialAbilities[i];
        if (!sa) continue;
        const saStruct = new GFFStruct(4);
        saStruct.addField(new GFFField(GFFDataType.WORD, 'Spell')).setValue((sa.spell ?? 0) | 0);
        saStruct.addField(new GFFField(GFFDataType.BYTE, 'SpellFlags')).setValue((sa.spellFlags ?? 0) | 0);
        saStruct.addField(new GFFField(GFFDataType.BYTE, 'SpellCasterLevel')).setValue((sa.spellCasterLevel ?? 0) | 0);
        specAbilityList.addChildStruct(saStruct);
      }
    }

    addByte(gff.RootNode, 'StartingPackage', source.startingPackage | 0);
    addByte(gff.RootNode, 'StealthMode', source.stealthMode ? 1 : 0);
    addByte(gff.RootNode, 'Str', source.str);
    addString(gff.RootNode, 'Subrace', '');
    addByte(gff.RootNode, 'SubraceIndex', source.subraceIndex | 0);
    addString(gff.RootNode, 'Tag', source.tag);
    addByte(gff.RootNode, 'Tail', source.tail | 0);
    addByte(gff.RootNode, 'UseBackupHead', source.useBackupHead ? 1 : 0);
    NamedVarTableSerializer.writeField(gff.RootNode, source);
    addChar(gff.RootNode, 'WillSaveThrow', source.willSaveThrow);
    addByte(gff.RootNode, 'Wings', source.wings | 0);
    addByte(gff.RootNode, 'Wis', source.wis);

    addFloat(gff.RootNode, 'XPosition', source.position.x);
    addFloat(gff.RootNode, 'YPosition', source.position.y);
    addFloat(gff.RootNode, 'ZPosition', source.position.z);

    const theta = source.rotation.z * Math.PI;
    addFloat(gff.RootNode, 'XOrientation', 1 * Math.cos(theta));
    addFloat(gff.RootNode, 'YOrientation', 1 * Math.sin(theta));
    addFloat(gff.RootNode, 'ZOrientation', 0);

    addShort(gff.RootNode, 'fortbonus', source.fortbonus);
    addShort(gff.RootNode, 'refbonus', source.refbonus);
    addShort(gff.RootNode, 'willbonus', source.willbonus);

    // Party-member FollowInfo — observed on savegame UTC for party members.
    if (source.isPM) {
      const follow = source.partyFollowInfo || defaultPartyFollowInfo();
      source.partyFollowInfo = follow;
      const followField = gff.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'FollowInfo'));
      const followStruct = new GFFStruct(0);
      followStruct.addField(new GFFField(GFFDataType.DWORD, 'FollowObject')).setValue(follow.followObject >>> 0);
      followStruct.addField(new GFFField(GFFDataType.VECTOR, 'FollowLocation')).setValue(
        follow.followLocation.clone(),
      );
      followStruct.addField(new GFFField(GFFDataType.VECTOR, 'LastLeaderPos')).setValue(
        follow.lastLeaderPos.clone(),
      );
      followStruct.addField(new GFFField(GFFDataType.VECTOR, 'LastFollowerPos')).setValue(
        follow.lastFollowerPos.clone(),
      );
      followStruct.addField(new GFFField(GFFDataType.FLOAT, 'MaxSpeed')).setValue(follow.maxSpeed);
      followStruct.addField(new GFFField(GFFDataType.BYTE, 'StickToPos')).setValue(follow.stickToPos | 0);
      followStruct.addField(new GFFField(GFFDataType.DWORD, 'Result')).setValue(follow.result >>> 0);
      followStruct.addField(new GFFField(GFFDataType.DWORD, 'TimeElapsed')).setValue(follow.timeElapsed >>> 0);
      followStruct.addField(new GFFField(GFFDataType.BYTE, 'InSafetyRange')).setValue(follow.inSafetyRange | 0);
      followField.addChildStruct(followStruct);
    }

    // PC level-up history — only when player-controlled and ControlledNPC === -1.
    if (
      source.isPC &&
      GameState.PartyManager?.ControlledNPC === -1 &&
      source.levelStats?.length > 0 &&
      typeof source.saveLevelStatStruct === 'function'
    ) {
      const lvlStatList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'LvlStatList'));
      for (let i = 0; i < source.levelStats.length; i++) {
        lvlStatList.addChildStruct(source.saveLevelStatStruct(source.levelStats[i], i));
      }
    }

    return gff;
  }
}

export const creatureSerializer = new CreatureSerializer();
