import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import type { Encounter } from '@engine/module/Encounter';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addInt,
  addLocString,
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
import { NamedVarTableSerializer } from '@engine/module/serialization/NamedVarTableSerializer';
import { GeometrySerializer } from '@engine/module/serialization/GeometrySerializer';
import { ScriptResRefSerializer } from '@engine/module/serialization/ScriptResRefSerializer';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';
import { EncounterCreatureEntry } from '@engine/module/EncounterCreatureEntry';
import { EncounterSpawnPointEntry } from '@engine/module/EncounterSpawnPointEntry';
import { EncounterSpawnEntry } from '@engine/module/EncounterSpawnEntry';

const ENCOUNTER_SCRIPT_KEYS = [
  ScriptHook.EncounterOnEntered,
  ScriptHook.EncounterOnExit,
  ScriptHook.EncounterOnExhausted,
  ScriptHook.EncounterOnHeartbeat,
  ScriptHook.EncounterOnUserDefined,
];

/**
 * Encounter GIT/UTE serializer.
 * Geometry uses X/Y/Z labels (not PointXYZ).
 * Always hydrates fields when called — registration stays in the facade.
 */
export class EncounterSerializer implements GameObjectSerializer<Encounter, GFFObject, GFFObject> {
  deserialize(target: Encounter, source: GFFObject, context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    GeometrySerializer.deserialize(target, root, 'XYZ');
    SwVarTableSerializer.deserialize(target, root, { loadByteArray: false });

    if (root.hasField('CreatureList') && !target.creatureList.length) {
      const creatures = root.getFieldByLabel('CreatureList').getChildStructs?.() || [];
      for (let i = 0; i < creatures.length; i++) {
        const entry = EncounterCreatureEntry.FromStruct(creatures[i]);
        if (entry instanceof EncounterCreatureEntry) target.creatureList.push(entry);
      }
    }

    if (root.hasField('SpawnPointList') && !target.spawnPointList.length) {
      const spawnPoints = root.getFieldByLabel('SpawnPointList').getChildStructs?.() || [];
      for (let i = 0; i < spawnPoints.length; i++) {
        const entry = EncounterSpawnPointEntry.FromStruct(spawnPoints[i]);
        if (entry instanceof EncounterSpawnPointEntry) target.spawnPointList.push(entry);
      }
    }

    if (root.hasField('SpawnList') && !target.spawnList.length) {
      const spawns = root.getFieldByLabel('SpawnList').getChildStructs?.() || [];
      for (let i = 0; i < spawns.length; i++) {
        const entry = EncounterSpawnEntry.FromStruct(spawns[i]);
        if (entry instanceof EncounterSpawnEntry) target.spawnList.push(entry);
      }
    }

    if (root.hasField('Active')) target.active = readBoolByte(root, 'Active');
    if (root.hasField('AreaPoints')) target.areaPoints = readFloat(root, 'AreaPoints');
    if (root.hasField('Difficulty')) target.difficulty = readInt(root, 'Difficulty');
    if (root.hasField('DifficultyIndex')) target.difficultyIndex = readInt(root, 'DifficultyIndex');

    if (root.hasField('Faction')) {
      target.factionId = readDword(root, 'Faction');
      if ((target.factionId & 0xFFFFFFFF) === -1) target.factionId = 0;
    }

    if (root.hasField('LocalizedName')) {
      const loc = root.getFieldByLabel('LocalizedName');
      // Some templates store a plain string; prefer CExoLocString when present.
      if (typeof loc.getCExoLocString === 'function') {
        target.localizedName = loc.getCExoLocString() as any;
      } else {
        target.localizedName = loc.getValue();
      }
    }

    if (root.hasField('MaxCreatures')) target.maxCreatures = readInt(root, 'MaxCreatures');
    if (root.hasField('PaletteID')) target.paletteId = readByte(root, 'PaletteID');
    if (root.hasField('PlayerOnly')) target.playerOnly = readBoolByte(root, 'PlayerOnly');
    if (root.hasField('RecCreatures')) target.recCreatures = readInt(root, 'RecCreatures');
    if (root.hasField('Reset')) target.reset = readBoolByte(root, 'Reset');
    if (root.hasField('ResetTime')) target.resetTime = readInt(root, 'ResetTime');
    if (root.hasField('Respawns')) target.respawns = readInt(root, 'Respawns');
    if (root.hasField('SpawnOption')) target.spawnOption = readInt(root, 'SpawnOption');
    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');

    if (root.hasField('XPosition')) target.position.x = readFloat(root, 'XPosition');
    if (root.hasField('YPosition')) target.position.y = readFloat(root, 'YPosition');
    if (root.hasField('ZPosition')) target.position.z = readFloat(root, 'ZPosition');

    if (root.hasField('Commandable')) target.commandable = readBoolByte(root, 'Commandable');
    if (root.hasField('NumberSpawned')) target.numberSpawned = readInt(root, 'NumberSpawned');
    if (root.hasField('HeartbeatDay')) target.heartbeatDay = readDword(root, 'HeartbeatDay');
    if (root.hasField('HeartbeatTime')) target.heartbeatTime = readDword(root, 'HeartbeatTime');
    if (root.hasField('LastSpawnDay')) target.lastSpawnDay = readDword(root, 'LastSpawnDay');
    if (root.hasField('LastSpawnTime')) target.lastSpawnTime = readDword(root, 'LastSpawnTime');
    if (root.hasField('LastEntered')) target.lastEntered = readDword(root, 'LastEntered');
    if (root.hasField('LastLeft')) target.lastLeft = readDword(root, 'LastLeft');
    if (root.hasField('Started')) target.started = readBoolByte(root, 'Started');
    if (root.hasField('Exhausted')) target.exhausted = readBoolByte(root, 'Exhausted');
    if (root.hasField('CurrentSpawns')) target.currentSpawns = readInt(root, 'CurrentSpawns');
    if (root.hasField('CustomScriptId')) target.customScriptId = readInt(root, 'CustomScriptId');
    if (root.hasField('AreaListMaxSize')) target.areaListMaxSize = readInt(root, 'AreaListMaxSize');
    if (root.hasField('SpawnPoolActive')) target.spawnPoolActive = readFloat(root, 'SpawnPoolActive');
    if (root.hasField('SpawnPoolRecovered')) target.spawnPoolRecovered = readFloat(root, 'SpawnPoolRecovered');

    ScriptResRefSerializer.deserialize(target, root, ENCOUNTER_SCRIPT_KEYS);
    NamedVarTableSerializer.deserialize(target, root);

    ActionListSerializer.deserializeFromContext(target as any, root, context);


  }

  serialize(source: Encounter, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTE ';

    ActionListSerializer.writeField(gff.RootNode, source as any);
    addByte(gff.RootNode, 'Commandable', source.commandable);
    addByte(gff.RootNode, 'Active', source.active);
    addByte(gff.RootNode, 'Reset', source.reset);
    addInt(gff.RootNode, 'ResetTime', source.resetTime);
    addInt(gff.RootNode, 'Respawns', source.respawns);
    addInt(gff.RootNode, 'SpawnOption', source.spawnOption);
    addInt(gff.RootNode, 'MaxCreatures', source.maxCreatures);
    addInt(gff.RootNode, 'RecCreatures', source.recCreatures);
    addByte(gff.RootNode, 'PlayerOnly', source.playerOnly);
    addDword(gff.RootNode, 'Faction', source.faction ? source.faction.id : source.factionId);
    addInt(gff.RootNode, 'DifficultyIndex', source.difficultyIndex);
    addInt(gff.RootNode, 'Difficulty', source.difficulty);
    if (source.localizedName instanceof CExoLocString) {
      addLocString(gff.RootNode, 'LocalizedName', source.localizedName);
    } else {
      gff.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')).setValue(
        source.localizedName || new CExoLocString(),
      );
    }
    addString(gff.RootNode, 'Tag', source.tag);

    addInt(gff.RootNode, 'NumberSpawned', source.numberSpawned);
    addDword(gff.RootNode, 'HeartbeatDay', source.heartbeatDay);
    addDword(gff.RootNode, 'HeartbeatTime', source.heartbeatTime);
    addDword(gff.RootNode, 'LastSpawnDay', source.lastSpawnDay);
    addDword(gff.RootNode, 'LastSpawnTime', source.lastSpawnTime);
    addByte(gff.RootNode, 'Started', source.started);
    addByte(gff.RootNode, 'Exhausted', source.exhausted);
    addInt(gff.RootNode, 'CurrentSpawns', source.currentSpawns);
    addFloat(gff.RootNode, 'SpawnPoolActive', source.spawnPoolActive);
    addFloat(gff.RootNode, 'SpawnPoolRecovered', source.spawnPoolRecovered);
    addDword(gff.RootNode, 'LastEntered', source.lastEntered);
    addDword(gff.RootNode, 'LastLeft', source.lastLeft);
    addInt(gff.RootNode, 'CustomScriptId', source.customScriptId);
    addInt(gff.RootNode, 'AreaListMaxSize', source.areaListMaxSize);
    addFloat(gff.RootNode, 'AreaPoints', source.areaPoints);

    const creatureList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'CreatureList'));
    for (let i = 0; i < source.creatureList.length; i++) {
      const creature = source.creatureList[i].save();
      if (creature) creatureList.addChildStruct(creature);
    }

    const spawnPointList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'SpawnPointList'));
    for (let i = 0; i < source.spawnPointList.length; i++) {
      const spawnPoint = source.spawnPointList[i].save();
      if (spawnPoint) spawnPointList.addChildStruct(spawnPoint);
    }

    if (source.spawnList.length) {
      const spawnList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'SpawnList'));
      for (let i = 0; i < source.spawnList.length; i++) {
        const spawn = source.spawnList[i].save();
        if (spawn) spawnList.addChildStruct(spawn);
      }
    }

    GeometrySerializer.writeField(gff.RootNode, source, 'XYZ', 0);
    SwVarTableSerializer.writeField(gff.RootNode, source);
    ScriptResRefSerializer.writeFields(gff.RootNode, source, ENCOUNTER_SCRIPT_KEYS, {
      preferLoadedName: true,
      fallback: '',
    });
    NamedVarTableSerializer.writeField(gff.RootNode, source);
    addFloat(gff.RootNode, 'XPosition', source.position.x);
    addFloat(gff.RootNode, 'YPosition', source.position.y);
    addFloat(gff.RootNode, 'ZPosition', source.position.z);

    return gff;
  }
}

export const encounterSerializer = new EncounterSerializer();
