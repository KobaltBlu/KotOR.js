import { AILevel } from "@core/enums/module/AILevel";
import { Utility } from "@core/utility/Utility";
import { DirtyTextureManager } from "@engine/managers/DirtyTextureManager";
import type { Area } from "@engine/module/Area";
import { AreaObjectSceneLoader } from "@engine/module/area/AreaObjectSceneLoader";
import { AreaPartyBootstrap } from "@engine/module/area/AreaPartyBootstrap";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";
import { FollowerCamera } from "@engine/render/FollowerCamera";

/**
 * Orchestrates Area.loadScene: rooms → GIT object assets → path/minigame/music/weather → cleanup.
 */
export class AreaSceneBootstrap {
  static async run(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    try{
      try{
        context.bindAreaMapUI(area.areaMap, area.name);
      }catch(e){
        console.error(e);
      }

      // Scene ctor loads dirtytex* before room models bind dirt overlays.
      try { await DirtyTextureManager.loadForArea(area); } catch(e){ console.error(e); }

      // LoadArea: rooms → GIT load objects → LoadPathPoints
      try { await AreaObjectSceneLoader.loadRooms(area, context); } catch(e){ console.error(e); }

      area.roomWalkmeshes = area.rooms.filter( (r) => { return r?.model?.wok}).map( (r) => { return r.model.wok; });

      context.setLoadProgress(10);

      // GIT object asset order matches GIT load (player/party adjacent to creatures)
      try { await AreaObjectSceneLoader.loadCreatures(area, context); } catch(e){ console.error(e); }
      try { await AreaPartyBootstrap.loadPlayer(area, context); } catch(e){ console.error(e); }
      try { await AreaPartyBootstrap.loadParty(area, context); } catch(e){ console.error(e); }

      context.setLoadProgress(20);

      try { await AreaObjectSceneLoader.loadItems(area, context); } catch(e){ console.error(e); }
      try { await AreaObjectSceneLoader.loadDoors(area, context); } catch(e){ console.error(e); }

      area.doorWalkmeshes = area.doors.filter( (d) => { return d?.collisionManager?.walkmesh}).map( (d) => { return d.collisionManager.walkmesh; });

      context.setLoadProgress(30);

      try { await AreaObjectSceneLoader.loadTriggers(area, context); } catch(e){ console.error(e); }
      try { await AreaObjectSceneLoader.loadEncounters(area, context); } catch(e){ console.error(e); }
      try { await AreaObjectSceneLoader.loadWaypoints(area, context); } catch(e){ console.error(e); }

      context.setLoadProgress(40);

      try { await AreaObjectSceneLoader.loadsounds(area); } catch(e){ console.error(e); }
      try { await AreaObjectSceneLoader.loadPlaceables(area, context); } catch(e){ console.error(e); }

      context.setLoadProgress(50);

      try { await AreaObjectSceneLoader.loadStores(area); } catch(e){ console.error(e); }
      try { await AreaObjectSceneLoader.loadAreaEffects(area, context); } catch(e){ console.error(e); }
      try { await AreaObjectSceneLoader.loadCameras(area, context); } catch(e){ console.error(e); }

      context.setLoadProgress(60);

      await area.loadPath();

      if(area.miniGame){
        try {
          await area.miniGame.load();
        }catch(e){
          console.error(e);
          // type-2 Load aborts on missing Camera — do not continue half-loaded MG.
          throw e;
        }
      }

      context.setLoadProgress(80);

      try{
        await area.loadAreaMusic();
      }catch(e){
        console.error(e);
      }

      context.setLoadProgress(100);

      // Minigame loads intentionally leave party empty (see loadPlayer); skip facing sync.
      const partyManager = context.getPartyManager();
      const facingSource = partyManager.party[0] ?? partyManager.Player;
      if(facingSource){
        FollowerCamera.facing = Utility.NormalizeRadian(facingSource.getFacing() - Math.PI/2);
      }

      try { await area.weather.load(); } catch(e){ console.error(e); }

      area.transWP = null;

      area.cleanupUninitializedObjects();
      area.detectRoomObjects();

      // IncreaseAILevelPriority when players occupy the area
      area.playersInArea = partyManager?.party?.length || 0;
      if(area.playersInArea > 0){
        const aiScheduler = context.getAIScheduler();
        const aiObjects = [
          ...area.creatures,
          ...area.doors,
          ...area.placeables,
          ...area.triggers,
          ...area.encounters,
          ...area.areaOfEffects,
          ...(partyManager?.party || []),
        ];
        aiScheduler.increaseAILevelPriority(aiObjects);
        // Party / PC always VERY_HIGH
        for(let i = 0; i < (partyManager?.party?.length || 0); i++){
          const pm = partyManager.party[i];
          if(pm) aiScheduler.setAILevel(pm, AILevel.VERY_HIGH);
        }
      }

      const groups = context.getSceneGroups();
      if(groups.grass){
        groups.grass.visible = context.isGrassEnabled();
      }
    }catch(e){
      console.error(e);
    }
  }
}
