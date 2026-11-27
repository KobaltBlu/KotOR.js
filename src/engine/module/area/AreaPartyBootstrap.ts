import { GFFObject } from "@core/resource/GFFObject";
import type { Area } from "@engine/module/Area";
import { Creature } from "@engine/module/Creature";
import { PlayerCharacter } from "@engine/module/PlayerCharacter";
import EngineLocation from "@engine/runtime/EngineLocation";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Party / player placement during area scene realization.
 */
export class AreaPartyBootstrap {
  static getSpawnLocation(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): EngineLocation {
    const pending = context.getPendingJumpSpawn();
    if(pending){
      context.clearPendingJumpSpawn();
      return new EngineLocation(pending.x, pending.y, pending.z, pending.ox, pending.oy, 0, area);
    }
    const partyManager = context.getPartyManager();
    if(context.isLoadingSave()){
      return new EngineLocation(
        partyManager.PlayerTemplate.RootNode.getFieldByLabel('XPosition').getValue(),
        partyManager.PlayerTemplate.RootNode.getFieldByLabel('YPosition').getValue(),
        partyManager.PlayerTemplate.RootNode.getFieldByLabel('ZPosition').getValue(),
        partyManager.PlayerTemplate.RootNode.getFieldByLabel('XOrientation').getValue(),
        partyManager.PlayerTemplate.RootNode.getFieldByLabel('YOrientation').getValue(),
        0,
        area
      );
    }else if(area.transWP instanceof GFFObject){
      console.log('TransWP', area.transWP);
      return new EngineLocation(
        area.transWP.RootNode.getFieldByLabel('XPosition').getValue(),
        area.transWP.RootNode.getFieldByLabel('YPosition').getValue(),
        area.transWP.RootNode.getFieldByLabel('ZPosition').getValue(),
        area.transWP.RootNode.getFieldByLabel('XOrientation').getValue(),
        area.transWP.RootNode.getFieldByLabel('YOrientation').getValue(),
        0,
        area
      );
    }else{
      console.log('No TransWP');
      return new EngineLocation(
        area.module.entryX,
        area.module.entryY,
        area.module.entryZ,
        area.module.entryDirectionX,
        area.module.entryDirectionY,
        0,
        area
      );
    }
  }

  static async loadPlayer(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    const partyManager = context.getPartyManager();
    const groups = context.getSceneGroups();
    console.log('Loading Player', partyManager.Player)
    try{
      if(partyManager.Player instanceof Creature){
        partyManager.Player.npcId = -1;

        if(!area.miniGame){
          partyManager.party[ partyManager.GetCreatureStartingPartyIndex(partyManager.Player) ] = partyManager.Player;
        }

        area.assignArea(partyManager.Player);

        // Reset actions between modules; preserve mid-combat ActionList on save load.
        if(!context.isLoadingSave()){
          partyManager.Player.clearAllActions();
        }
        partyManager.Player.force = 0;
        partyManager.Player.collisionManager.groundFace = undefined;
        partyManager.Player.collisionManager.lastGroundFace = undefined;
        partyManager.Player.load();
        try{
          const model = await partyManager.Player.loadModel();
          partyManager.Player.model = model;
          partyManager.Player.model.hasCollision = true;
          let spawnLoc = partyManager.GetSpawnLocation(partyManager.Player);
          partyManager.Player.position.copy(spawnLoc.position);
          partyManager.Player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);

          partyManager.Player.getCurrentRoom();
          if(!area.miniGame){
            groups.party.add( partyManager.Player.container );
          }
        }catch(e){
          console.error(e);
        }
      }else{
        let player = new PlayerCharacter( area.getPlayerTemplate() );
        player.npcId = -1;

        player.load();
        partyManager.Player = player;

        if(!area.miniGame){
          partyManager.party[ partyManager.GetCreatureStartingPartyIndex(player) ] = player;
        }

        area.assignArea(player);

        try{
          const model = await player.loadModel();
          model.userData.gameObject = player;
          model.hasCollision = true;

          let spawnLoc = partyManager.GetSpawnLocation(player);

          player.position.copy(spawnLoc.position);
          player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);

          player.getCurrentRoom();
          player.computeBoundingBox(true);
          if(!area.miniGame){
            groups.party.add( player.container );
          }
        }catch(e){
          console.error(e);
        }
      }
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Load the active party members.
   * Minigame areas leave party empty (see loadPlayer) — companions would otherwise
   * land at PortraitOrder indices with party[0] unset, which breaks GetObjectByTag.
   */
  static async loadParty(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    if(area.miniGame){
      return;
    }
    const partyManager = context.getPartyManager();
    console.log('Loading Party Member');
    for(let i = 0; i < partyManager.CurrentMembers.length; i++){
      await partyManager.LoadPartyMember(i);
    }
    // Portrait-order mismatch can leave Player in the scene but not in party.
    // initAreaObjects only onSpawns party members — re-insert if missing.
    const player = partyManager.Player;
    if(player && partyManager.party.indexOf(player) < 0){
      const idx = partyManager.GetCreatureStartingPartyIndex(player);
      if(!partyManager.party[idx]){
        partyManager.party[idx] = player;
      }else{
        partyManager.party.push(player);
      }
    }
    // Area transit reuses locomotion state from the prior module (WASD walk into
    // a door, etc.). PositionParty leaves creatures in PAUSE (10000).
    for(let i = 0; i < partyManager.party.length; i++){
      const pm = partyManager.party[i];
      if(pm && typeof pm.clearLocomotionState === 'function'){
        pm.clearLocomotionState(true);
        // clearLocomotion may demote walk/run → PAUSE with started=false; apply
        // before fade-in (Mode is still LOADING so tick update skips anim).
        if(typeof pm.primeAnimationPose === 'function'){
          pm.primeAnimationPose();
        }
      }
    }
    partyManager.ApplyControlledNPC();
    // PositionParty → ResetAllFollowData after placing the party.
    partyManager.resetFollowPath(partyManager.party[0]);
    // Attach every party member to a room (companions skip this in LoadPartyMember;
    // controlled NPC as party[0] must have a room for UpdateRoom VIS).
    for(let i = 0; i < partyManager.party.length; i++){
      const pm = partyManager.party[i];
      if(!pm) continue;
      if(pm.area !== area){
        area.assignArea(pm);
      }
      if(!pm.room){
        pm.getCurrentRoom();
      }
    }
    // CombatRound fromStruct may run before partners are registered — re-resolve now.
    area.resolveCombatRoundObjectReferences();
  }
}
