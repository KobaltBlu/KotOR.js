import { GameEngineType } from '@core/enums/engine/GameEngineType';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import type { GFFStruct } from '@core/resource/GFFStruct';
import { GameState } from '@engine/runtime/GameState';
import { waypointSerializer } from '@engine/module/serialization/WaypointSerializer';
import { triggerSerializer } from '@engine/module/serialization/TriggerSerializer';
import { soundSerializer } from '@engine/module/serialization/SoundSerializer';
import { areaCameraSerializer } from '@engine/module/serialization/AreaCameraSerializer';
import { storeSerializer } from '@engine/module/serialization/StoreSerializer';
import { encounterSerializer } from '@engine/module/serialization/EncounterSerializer';
import { doorSerializer } from '@engine/module/serialization/DoorSerializer';
import { placeableSerializer } from '@engine/module/serialization/PlaceableSerializer';
import { creatureSerializer } from '@engine/module/serialization/CreatureSerializer';
import { areaEffectSerializer } from '@engine/module/serialization/AreaEffectSerializer';
import { itemSerializer } from '@engine/module/serialization/ItemSerializer';
import { AreaMapSerializer } from '@engine/module/serialization/AreaMapSerializer';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';

export type AreaGitListName =
  | 'WaypointList'
  | 'TriggerList'
  | 'SoundList'
  | 'CameraList'
  | 'StoreList'
  | 'EncounterList'
  | 'DoorList'
  | 'PlaceableList'
  | 'CreatureList'
  | 'AreaEffectList';

export class AreaGitSerializer {
  static serialize(area: any): GFFObject {
    const git = new GFFObject();
    git.FileType = 'GIT ';

    const aoeList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'AreaEffectList'));
    for (let i = 0; i < area.areaOfEffects.length; i++) {
      aoeList.addChildStruct(this.serializeObject('AreaEffectList', area.areaOfEffects[i]).RootNode);
    }

    AreaMapSerializer.writeField(git.RootNode, area.areaMap);

    const areaPropertiesField = git.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'AreaProperties'));
    areaPropertiesField.addChildStruct(area.getAreaPropertiesStruct());

    const cameraList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'CameraList'));
    for (let i = 0; i < area.cameras.length; i++) {
      cameraList.addChildStruct(this.serializeObject('CameraList', area.cameras[i]).RootNode);
    }

    const creatureList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'Creature List'));
    for (let i = 0; i < area.creatures.length; i++) {
      const creature = area.creatures[i];
      if (!creature || creature.isRetainedCorpse || creature.serverDestroyed) continue;
      // Creature.save appends facade-owned party/player fields after base serialization.
      creatureList.addChildStruct(creature.save().RootNode);
    }

    git.RootNode.addField(new GFFField(GFFDataType.BYTE, 'CurrentWeather')).setValue(area.weather.currentWeather | 0);

    const doorList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'Door List'));
    for (let i = 0; i < area.doors.length; i++) {
      doorList.addChildStruct(this.serializeObject('DoorList', area.doors[i]).RootNode);
    }

    const encounterList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'Encounter List'));
    for (let i = 0; i < area.encounters.length; i++) {
      encounterList.addChildStruct(this.serializeObject('EncounterList', area.encounters[i]).RootNode);
    }

    const list = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'List'));
    const gameKey = GameState.GameKey == GameEngineType.TSL ? 'k2' : 'k1';
    for (let i = 0; i < area.items.length; i++) {
      const item = area.items[i];
      if (!item) continue;
      list.addChildStruct(itemSerializer.serialize(item, { gameKey }));
    }

    const placeableList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'Placeable List'));
    for (let i = 0; i < area.placeables.length; i++) {
      placeableList.addChildStruct(this.serializeObject('PlaceableList', area.placeables[i]).RootNode);
    }

    SwVarTableSerializer.writeField(git.RootNode, area);

    const soundList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'SoundList'));
    for (let i = 0; i < area.sounds.length; i++) {
      soundList.addChildStruct(this.serializeObject('SoundList', area.sounds[i]).RootNode);
    }

    const storeList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'StoreList'));
    for (let i = 0; i < area.stores.length; i++) {
      storeList.addChildStruct(this.serializeObject('StoreList', area.stores[i]).RootNode);
    }

    git.RootNode.addField(new GFFField(GFFDataType.BYTE, 'TransPendCurrID')).setValue(area.transPendCurrId | 0);
    git.RootNode.addField(new GFFField(GFFDataType.BYTE, 'TransPendNextID')).setValue(area.transPendNextId | 0);
    git.RootNode.addField(new GFFField(GFFDataType.BYTE, 'TransPending')).setValue(area.transPending | 0);

    const triggerList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'TriggerList'));
    for (let i = 0; i < area.triggers.length; i++) {
      triggerList.addChildStruct(this.serializeObject('TriggerList', area.triggers[i]).RootNode);
    }

    area.writeNamedVarTable(git.RootNode);

    const waypointList = git.RootNode.addField(new GFFField(GFFDataType.LIST, 'WaypointList'));
    for (let i = 0; i < area.waypoints.length; i++) {
      waypointList.addChildStruct(this.serializeObject('WaypointList', area.waypoints[i]).RootNode);
    }

    git.RootNode.addField(new GFFField(GFFDataType.BYTE, 'WeatherStarted')).setValue(area.weather.started ? 1 : 0);

    return git;
  }

  static serializeObject(listName: AreaGitListName, object: any): GFFObject {
    switch (listName) {
      case 'WaypointList': return waypointSerializer.serialize(object);
      case 'TriggerList': return triggerSerializer.serialize(object);
      case 'SoundList': return soundSerializer.serialize(object);
      case 'CameraList': return areaCameraSerializer.serialize(object);
      case 'StoreList': return storeSerializer.serialize(object);
      case 'EncounterList': return encounterSerializer.serialize(object);
      case 'DoorList': return doorSerializer.serialize(object);
      case 'PlaceableList': return placeableSerializer.serialize(object);
      case 'CreatureList': return creatureSerializer.serialize(object);
      case 'AreaEffectList': return areaEffectSerializer.serialize(object);
      default:
        throw new Error(`AreaGitSerializer: unsupported list ${listName}`);
    }
  }

  static deserializeObject(listName: AreaGitListName, target: any, source: GFFObject | GFFStruct): void {
    switch (listName) {
      case 'WaypointList': return waypointSerializer.deserialize(target, source as any);
      case 'TriggerList': return triggerSerializer.deserialize(target, source as any);
      case 'SoundList': return soundSerializer.deserialize(target, source as any);
      case 'CameraList': return areaCameraSerializer.deserialize(target, source as any);
      case 'StoreList': return storeSerializer.deserialize(target, source as any);
      case 'EncounterList': return encounterSerializer.deserialize(target, source as any);
      case 'DoorList': return doorSerializer.deserialize(target, source as any);
      case 'PlaceableList': return placeableSerializer.deserialize(target, source as any);
      case 'CreatureList': return creatureSerializer.deserialize(target, source as any);
      case 'AreaEffectList': return areaEffectSerializer.deserialize(target, source as any);
      default:
        throw new Error(`AreaGitSerializer: unsupported list ${listName}`);
    }
  }
}
