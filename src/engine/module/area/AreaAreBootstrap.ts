import * as THREE from "three";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { AreaMapSerializer } from "@engine/module/serialization/AreaMapSerializer";
import { AreaRoom } from "@engine/module/area/AreaRoom";
import { MiniGame } from "@engine/module/minigame/MiniGame";
import type { Area } from "@engine/module/Area";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Hydrates Area runtime fields from the ARE GFF.
 * Does not realize scene assets or run scripts.
 */
export class AreaAreBootstrap {
  static hydrate(area: Area, context: AreaLoadContext = getDefaultAreaLoadContext()): void {
    // ARE ObjectId (when present, e.g. embedded save ARE) is the game object id.
    // ARE ID header is separate (header_info[0]) — never overwrite this.id with it.
    if(area.are.RootNode.hasField('ObjectId'))
      area.id = area.are.getFieldByLabel('ObjectId').getValue();

    let rooms = area.are.getFieldByLabel('Rooms');

    area.alphaTest = area.are.getFieldByLabel('AlphaTest').getValue();
    area.cameraStyle = area.are.getFieldByLabel('CameraStyle').getValue();
    area.weather.chanceLightning = area.are.getFieldByLabel('ChanceLightning').getValue();
    area.weather.chanceRain = area.are.getFieldByLabel('ChanceRain').getValue();
    area.weather.chanceSnow = area.are.getFieldByLabel('ChanceSnow').getValue();
    area.comments = area.are.getFieldByLabel('Comments').getValue();
    area.creatorId = area.are.getFieldByLabel('Creator_ID').getValue();
    area.dayNightCycle = area.are.getFieldByLabel('DayNightCycle').getValue();
    area.defaultEnvMap = area.are.getFieldByLabel('DefaultEnvMap').getValue();
    // envmap assign resolves the "DEFAULT" envmap resref
    // against the current area's DefaultEnvMap.
    context.setDefaultEnvMap(area.defaultEnvMap);
    area.dynamicAmbientColor = area.are.getFieldByLabel('DynAmbientColor').getValue();
    area.applyDynAmbient();
    area.expansionList = [];

    area.flags = area.are.getFieldByLabel('Flags').getValue();
    // LoadAreaHeader: indoor (Flags & 1) clears weather chances / wind.
    if(area.flags & 1){
      area.weather.chanceLightning = 0;
      area.weather.chanceRain = 0;
      area.weather.chanceSnow = 0;
    }
    area.grass = {
      ambient: area.are.getFieldByLabel('Grass_Ambient').getValue(),
      density: area.are.getFieldByLabel('Grass_Density').getValue(),
      diffuse: area.are.getFieldByLabel('Grass_Diffuse').getValue(),
      probability: {
        lowerLeft: area.are.getFieldByLabel('Grass_Prob_LL').getValue(),
        lowerRight: area.are.getFieldByLabel('Grass_Prob_LR').getValue(),
        upperLeft: area.are.getFieldByLabel('Grass_Prob_UL').getValue(),
        upperRight: area.are.getFieldByLabel('Grass_Prob_UR').getValue()
      },
      quadSize: area.are.getFieldByLabel('Grass_QuadSize').getValue(),
      textureName: area.are.getFieldByLabel('Grass_TexName').getValue() || 'grass'
    };

    // TSL dirt layers (DirtyARGB/Size/Formula/Func One–Three). swaps formula 0↔1 on load.
    area.dirt = {
      layers: [
        area.readAreDirtLayer('One'),
        area.readAreDirtLayer('Two'),
        area.readAreDirtLayer('Three'),
      ],
    };

    area.areId = area.are.getFieldByLabel('ID').getValue();
    area.isNight = area.are.getFieldByLabel('IsNight').getValue();
    area.lightingScheme = area.are.getFieldByLabel('LightingScheme').getValue();
    area.loadScreenId = area.are.getFieldByLabel('LoadScreenID').getValue();

    if(area.are.RootNode.hasField('Map')){
      const map = area.are.getFieldByLabel('Map')?.getChildStructs()?.[0];
      const loadedMap = AreaMapSerializer.fromStruct(map);
      if(loadedMap){
        area.areaMap = loadedMap;
      }
    }

    if(area.are.RootNode.hasField('MiniGame')){
      area.miniGame = new MiniGame(
        area.are.getFieldByLabel('MiniGame').getChildStructs()[0]
      );
    }

    area.modListenCheck = area.are.getFieldByLabel('ModListenCheck').getValue();
    area.modSpotCheck = area.are.getFieldByLabel('ModSpotCheck').getValue();
    area.moon.ambientColor = area.are.getFieldByLabel('MoonAmbientColor').getValue();
    area.moon.diffuseColor = area.are.getFieldByLabel('MoonDiffuseColor').getValue();
    area.moon.fogColor = area.are.getFieldByLabel('MoonFogColor').getValue();
    area.moon.fogFar = area.are.getFieldByLabel('MoonFogFar').getValue();
    area.moon.fogNear = area.are.getFieldByLabel('MoonFogNear').getValue();
    area.moon.fogOn = !!area.are.getFieldByLabel('MoonFogOn').getValue();
    area.moon.shadows = !!area.are.getFieldByLabel('MoonShadows').getValue();
    area.areaName = area.are.getFieldByLabel('Name').getCExoLocString();

    area.noHangBack = !!area.are.getFieldByLabel('NoHangBack').getValue();
    area.noRest = !!area.are.getFieldByLabel('NoRest').getValue();

    if(area.are.RootNode.hasField(ScriptHook.AreaOnEnter)){
      area.scriptResRefs.set(ScriptHook.AreaOnEnter, area.are.getFieldByLabel(ScriptHook.AreaOnEnter).getValue());
    }

    if(area.are.RootNode.hasField(ScriptHook.AreaOnExit)){
      area.scriptResRefs.set(ScriptHook.AreaOnExit, area.are.getFieldByLabel(ScriptHook.AreaOnExit).getValue());
    }

    if(area.are.RootNode.hasField(ScriptHook.AreaOnHeartbeat)){
      area.scriptResRefs.set(ScriptHook.AreaOnHeartbeat, area.are.getFieldByLabel(ScriptHook.AreaOnHeartbeat).getValue());
    }

    if(area.are.RootNode.hasField(ScriptHook.AreaOnUserDefined)){
      area.scriptResRefs.set(ScriptHook.AreaOnUserDefined, area.are.getFieldByLabel(ScriptHook.AreaOnUserDefined).getValue());
    }

    area.playerOnly = !!area.are.getFieldByLabel('PlayerOnly').getValue();
    area.playerVsPlayer = area.are.getFieldByLabel('PlayerVsPlayer').getValue();

    //Rooms
    for(let i = 0; i < rooms.childStructs.length; i++ ){
      let strt = rooms.childStructs[i];
      const roomName = area.are.getFieldByLabel('RoomName', strt.getFields()).getValue().toLowerCase();
      if(!roomName || roomName == '****'){
        continue;
      }
      const envAudio = area.are.getFieldByLabel('EnvAudio', strt.getFields()).getValue();
      const ambientScale = area.are.getFieldByLabel('AmbientScale', strt.getFields()).getValue();
      const room = new AreaRoom(roomName, area);
      room.area = area;
      room.setAmbientScale(ambientScale);
      room.setEnvAudio(envAudio);
      if(strt.hasField('DisableWeather')){
        room.setDisableWeather(!!area.are.getFieldByLabel('DisableWeather', strt.getFields()).getValue());
      }
      area.rooms.push(room);
    }

    area.shadowOpacity = area.are.getFieldByLabel('ShadowOpacity').getValue();

    area.stealthXPEnabled = area.are.getFieldByLabel('StealthXPEnabled').getValue();
    area.stealthXPLoss = area.are.getFieldByLabel('StealthXPLoss').getValue();
    area.stealthXPMax = area.are.getFieldByLabel('StealthXPMax').getValue();

    area.sun.ambientColor = area.are.getFieldByLabel('SunAmbientColor').getValue();
    area.sun.diffuseColor = area.are.getFieldByLabel('SunDiffuseColor').getValue();
    area.sun.fogColor = area.are.getFieldByLabel('SunFogColor').getValue();
    area.sun.fogFar = area.are.getFieldByLabel('SunFogFar').getValue();
    area.sun.fogNear = area.are.getFieldByLabel('SunFogNear').getValue();
    area.sun.fogOn = area.are.getFieldByLabel('SunFogOn').getValue();
    area.sun.shadows = area.are.getFieldByLabel('SunShadows').getValue();
    area.tag = area.are.getFieldByLabel('Tag').getValue();
    area.unescapable = area.are.getFieldByLabel('Unescapable').getValue() ? true : false;
    area.version = area.are.getFieldByLabel('Version').getValue();
    area.windPower = area.are.getFieldByLabel('WindPower').getValue();
    area.applyAreaWind();

    area.fog = undefined;

    if(area.sun.fogOn){
      area.fog = new THREE.Fog(
        area.sun.fogColor,
        area.sun.fogNear,
        area.sun.fogFar
      );
      context.setSceneFog(area.fog);
    }else{
      context.setSceneFog(undefined);
    }
  }
}
