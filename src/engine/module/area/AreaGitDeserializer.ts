import { GFFObject } from "@core/resource/GFFObject";
import { AreaCamera } from "@engine/module/area/AreaCamera";
import { AreaEffect } from "@engine/module/AreaEffect";
import { Creature } from "@engine/module/Creature";
import { Door } from "@engine/module/Door";
import { Encounter } from "@engine/module/Encounter";
import { Item } from "@engine/module/Item";
import { Placeable } from "@engine/module/Placeable";
import { Sound } from "@engine/module/Sound";
import { Store } from "@engine/module/Store";
import { Trigger } from "@engine/module/Trigger";
import { Waypoint } from "@engine/module/Waypoint";
import type { Area } from "@engine/module/Area";
import { AreaMapSerializer } from "@engine/module/serialization/AreaMapSerializer";
import { SwVarTableSerializer } from "@engine/module/serialization/SwVarTableSerializer";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Builds runtime objects from GIT in engine load order.
 * Save aggregation order lives in AreaGitSerializer and is intentionally different.
 */
export class AreaGitDeserializer {
  static deserialize(area: Area, context: AreaLoadContext = getDefaultAreaLoadContext()): void {
    // BEGIN GIT LOAD — GIT load (K1) (TSL)
    // Order: weather/vars → creatures → items → doors → triggers → encounters →
    // waypoints → sounds → placeables → stores → AOEs → properties → maps → cameras

    const areaProps = area.git.getFieldByLabel('AreaProperties');
    const areaEffects = area.git.getFieldByLabel('AreaEffectList');
    const cameras = area.git.getFieldByLabel('CameraList');
    const creatures = area.git.getFieldByLabel('Creature List');
    const doors = area.git.getFieldByLabel('Door List');
    const encounters = area.git.getFieldByLabel('Encounter List');
    const groundItems = area.git.getFieldByLabel('List');
    const placeables = area.git.getFieldByLabel('Placeable List');
    const sounds = area.git.getFieldByLabel('SoundList');
    const stores = area.git.getFieldByLabel('StoreList');
    const triggers = area.git.getFieldByLabel('TriggerList');
    const waypoints = area.git.getFieldByLabel('WaypointList');

    // GIT load start (when from save): weather + var tables before objects.
    // Indoor areas force clear (GIT load flags & 1).
    if(area.git.RootNode.hasField('CurrentWeather')){
      area.weather.currentWeather = area.git.getFieldByLabel('CurrentWeather').getValue();
      area.weather.fromSave = true;
    }
    if(area.git.RootNode.hasField('WeatherStarted')){
      area.weather.started = !!area.git.getFieldByLabel('WeatherStarted').getValue();
      area.weather.fromSave = true;
    }
    if(area.flags & 1){
      area.weather.currentWeather = 0xFF;
      area.weather.started = false;
    }
    if(area.git.RootNode.hasField('VarTable')){
      area.loadNamedVarTable(area.git.getFieldByLabel('VarTable'));
    }
    SwVarTableSerializer.deserialize(area, area.git.RootNode);

    // Creatures
    if(creatures){
      for(let i = 0; i < creatures.childStructs.length; i++){
        const strt = creatures.childStructs[i];
        area.attachObject( new Creature(GFFObject.FromStruct(strt)) );
      }
    }

    // Ground items (GIT List)
    if(groundItems){
      for(let i = 0; i < groundItems.childStructs.length; i++){
        const strt = groundItems.childStructs[i];
        area.attachObject( new Item(GFFObject.FromStruct(strt), true) );
      }
    }

    // Doors
    if(doors){
      for(let i = 0; i < doors.childStructs.length; i++ ){
        const strt = doors.childStructs[i];
        area.attachObject( new Door(GFFObject.FromStruct(strt)) );
      }
    }

    // Triggers
    if(triggers){
      for(let i = 0; i < triggers.childStructs.length; i++){
        const strt = triggers.childStructs[i];
        area.attachObject( new Trigger(GFFObject.FromStruct(strt)) );
      }
    }

    // Encounters
    if(encounters){
      for(let i = 0; i < encounters.childStructs.length; i++){
        const strt = encounters.childStructs[i];
        area.attachObject( new Encounter(GFFObject.FromStruct(strt)) );
      }
    }

    // Waypoints
    if(waypoints){
      for(let i = 0; i < waypoints.childStructs.length; i++ ){
        const strt = waypoints.childStructs[i];

        if(area.transWP){
          if(typeof area.transWP === 'string'){
            if(area.transWP.toLowerCase() == strt.getFieldByLabel('Tag').getValue().toLowerCase()){
              area.transWP = GFFObject.FromStruct(strt);
            }
          }else if(area.transWP instanceof GFFObject){
            if(area.transWP.getFieldByLabel('Tag').getValue().toLowerCase() == strt.getFieldByLabel('Tag').getValue().toLowerCase()){
              area.transWP = GFFObject.FromStruct(strt);
            }
          }
        }

        area.attachObject( new Waypoint(GFFObject.FromStruct(strt)) );
      }
    }

    // Sounds
    if(sounds){
      for(let i = 0; i < sounds.childStructs.length; i++ ){
        const strt = sounds.childStructs[i];
        area.attachObject( new Sound(GFFObject.FromStruct(strt), context.getAudioEngine()) );
      }
    }

    // Placeables
    if(placeables){
      for(let i = 0; i < placeables.childStructs.length; i++ ){
        const strt = placeables.childStructs[i];
        area.attachObject( new Placeable(GFFObject.FromStruct(strt)) );
      }
    }

    // Stores
    if(stores){
      for(let i = 0; i < stores.childStructs.length; i++ ){
        const strt = stores.childStructs[i];
        area.attachObject( new Store(GFFObject.FromStruct(strt)) );
      }
    }

    // AreaEffects
    if(areaEffects){
      for(let i = 0; i < areaEffects.childStructs.length; i++){
        const strt = areaEffects.childStructs[i];
        area.attachObject( new AreaEffect(GFFObject.FromStruct(strt)) );
      }
    }

    // LoadProperties — AreaProperties + ambient (after stores/AOEs)
    if(areaProps){
      const areaPropsStruct = areaProps.getChildStructs()[0];
      if(areaPropsStruct){
        const areaPropsField = areaPropsStruct.getFields();
        area.audio.ambient.day = area.git.getFieldByLabel('AmbientSndDay', areaPropsField).getValue();
        area.audio.ambient.dayVolume = area.git.getFieldByLabel('AmbientSndDayVol', areaPropsField).getValue();
        area.audio.ambient.night = area.git.getFieldByLabel('AmbientSndNight', areaPropsField).getValue();
        area.audio.ambient.nightVolume = area.git.getFieldByLabel('AmbientSndNitVol', areaPropsField).getValue();
        if(areaPropsStruct.hasField('EnvAudio')){
          area.audio.environmentAudio = area.git.getFieldByLabel('EnvAudio', areaPropsField).getValue();
        }else{
          area.audio.environmentAudio = -1;
        }

        area.audio.music.battle = area.git.getFieldByLabel('MusicBattle', areaPropsField).getValue();
        area.audio.music.day = area.git.getFieldByLabel('MusicDay', areaPropsField).getValue();
        area.audio.music.delay = area.git.getFieldByLabel('MusicDelay', areaPropsField).getValue();
        area.audio.music.night = area.git.getFieldByLabel('MusicNight', areaPropsField).getValue();
        context.setAreaAudioProperties(area.audio);

        if(areaPropsStruct.hasField('StealthXPCurrent')){
          area.stealthXP = areaPropsStruct.getFieldByLabel('StealthXPCurrent').getValue() | 0;
        }
        if(areaPropsStruct.hasField('StealthXPLoss')){
          area.stealthXPLoss = areaPropsStruct.getFieldByLabel('StealthXPLoss').getValue() | 0;
        }
        if(areaPropsStruct.hasField('StealthXPEnabled')){
          area.stealthXPEnabled = areaPropsStruct.getFieldByLabel('StealthXPEnabled').getValue() | 0;
        }
        if(areaPropsStruct.hasField('StealthXPMax')){
          area.stealthXPMax = areaPropsStruct.getFieldByLabel('StealthXPMax').getValue() | 0;
        }
        if(areaPropsStruct.hasField('RestrictMode')){
          area.restrictMode = areaPropsStruct.getFieldByLabel('RestrictMode').getValue() | 0;
        }
        if(areaPropsStruct.hasField('Unescapable')){
          area.unescapable = !!areaPropsStruct.getFieldByLabel('Unescapable').getValue();
        }
        if(areaPropsStruct.hasField('SunFogColor')){
          area.sun.fogColor = areaPropsStruct.getFieldByLabel('SunFogColor').getValue();
        }
        // LoadProperties also reads transition pending from AreaProperties.
        if(areaPropsStruct.hasField('TransPending')){
          area.transPending = areaPropsStruct.getFieldByLabel('TransPending').getValue() | 0;
        }
        if(areaPropsStruct.hasField('TransPendCurrID')){
          area.transPendCurrId = areaPropsStruct.getFieldByLabel('TransPendCurrID').getValue() | 0;
        }
        if(areaPropsStruct.hasField('TransPendNextID')){
          area.transPendNextId = areaPropsStruct.getFieldByLabel('TransPendNextID').getValue() | 0;
        }
      }
    }
    // KotOR savegame GIT root still carries TransPending* (SaveGIT); prefer root if present.
    if(area.git.RootNode.hasField('TransPending')){
      area.transPending = area.git.getFieldByLabel('TransPending').getValue() | 0;
    }
    if(area.git.RootNode.hasField('TransPendCurrID')){
      area.transPendCurrId = area.git.getFieldByLabel('TransPendCurrID').getValue() | 0;
    }
    if(area.git.RootNode.hasField('TransPendNextID')){
      area.transPendNextId = area.git.getFieldByLabel('TransPendNextID').getValue() | 0;
    }

    // LoadMaps
    AreaMapSerializer.deserialize(area.areaMap, area.git.RootNode);

    // LoadPlaceableCameras — last among GIT lists
    if(cameras){
      for(let i = 0; i < cameras.childStructs.length; i++){
        const strt = cameras.childStructs[i];
        const camera = new AreaCamera(GFFObject.FromStruct(strt) );
        area.cameras.push(camera);
      }
    }

    if(!(area.transWP instanceof GFFObject)){
      area.transWP = null;
    }
  }
}
