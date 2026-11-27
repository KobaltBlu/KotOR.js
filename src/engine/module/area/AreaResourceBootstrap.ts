import { ResourceTypes } from "@core/resource/ResourceTypes";
import { LYTObject } from "@core/resource/LYTObject";
import { VISObject } from "@core/resource/VISObject";
import { ResourceLoader } from "@engine/loaders";
import { MiniGame } from "@engine/module/minigame/MiniGame";
import { MiniGameObstacle } from "@engine/module/minigame/MiniGameObstacle";
import { MiniGameTrack } from "@engine/module/minigame/MiniGameTrack";
import type { Area } from "@engine/module/Area";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Post-GIT resource attachment: alpha/audio/camera, VIS, LYT, scripts, fog.
 */
export class AreaResourceBootstrap {
  static async bootstrap(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    context.setAlphaTest(area.alphaTest);

    // Area default EnvAudio — desired; Render/update applies SetCurrentEnvironment.
    context.setDesiredEnvironment(area.audio.environmentAudio);
    context.applyDesiredEnvironment();

    context.setCameraStyle(area.getCameraStyle());
    if(area.miniGame){
      context.setCameraFOV(area.miniGame.cameraViewAngle);
    }else{
      context.setCameraFOV(context.getDefaultCameraFOV());
    }

    await this.loadVis(area);
    await this.loadLayout(area);
    await this.loadScripts(area, context);
    context.setSceneFog(area.fog);
  }

  static async loadVis(area: Area): Promise<void> {
    console.log('Area.loadVis');
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes.vis, area.name);
      area.visObject = new VISObject(buffer);
      area.visObject.read();
    }catch(e){
      area.visObject = new VISObject();
      console.error(e);
    }
    area.visObject.attachArea(area);
  }

  static async loadLayout(area: Area): Promise<void> {
    console.log('Area.loadLayout');
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes.lyt, area.name);
      area.layout = new LYTObject(buffer);

      //Resort the rooms based on the LYT file because it matches the walkmesh transition index numbers
      let sortedRooms = [];
      for(let i = 0; i < area.layout.rooms.length; i++){
        let roomLYT = area.layout.rooms[i];
        if(!roomLYT.name || roomLYT.name == '****'){
          continue;
        }
        for(let r = 0; r != area.rooms.length; r++ ){
          let room = area.rooms[r];
          if(room.roomName.toLowerCase() == roomLYT.name.toLowerCase()){
            room.position.copy(roomLYT.position);
            sortedRooms.push(room);
          }
        }
      }

      area.rooms = sortedRooms;

      for(let i = 0; i < area.layout.doorhooks.length; i++){
        let _doorHook = area.layout.doorhooks[i];
        area.doorhooks.push(_doorHook);
      }

      if(area.miniGame){
        for(let i = 0; i < area.layout.tracks.length; i++){
          area.miniGame.tracks.push(new MiniGameTrack(area.layout.tracks[i]));
        }

        for(let i = 0; i < area.layout.obstacles.length; i++){
          const layoutObs = area.layout.obstacles[i];
          const name = MiniGame.normalizeMgoName(layoutObs?.name);
          // : LYT places by Name/pos; ARE Name → GetMiniGameObjectByName → Load(Scripts).
          const template = name ? area.miniGame.getMiniGameObjectByName(name) : undefined;
          const obstacle = new MiniGameObstacle(template, layoutObs);
          if(template){
            // Load — Scripts then OnCreate (OnCreate in initMiniGameObjects).
            obstacle.loadScripts();
          }
          area.miniGame.obstacles.push(obstacle);
        }
      }
    }catch(e){
      console.error(e);
      area.layout = new LYTObject();
    }
  }

  static async loadScripts(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    console.log('Area.loadScripts');
    for(let [key, resRef] of area.scriptResRefs){
      const script = context.loadNWScript(resRef);
      if(!script){ continue; }
      script.bindOwner(area, String(key));
      area.scripts[key as any] = script;
    }
  }
}
