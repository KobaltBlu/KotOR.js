import { CurrentGame } from "@engine/save/CurrentGame";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import { GFFObject } from "@core/resource/GFFObject";
import { GFFStruct } from "@core/resource/GFFStruct";

import * as path from "path";
import { GFFField } from "@core/resource/GFFField";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GameFileSystem } from "@core/filesystem/GameFileSystem";
import { Faction } from "@engine/world/Faction";
import { Reputation } from "@engine/world/Reputation";
import { ReputationConstant } from "@engine/enums/engine/ReputationConstant";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameState } from "@engine/runtime/GameState";
import { TwoDAManager } from "@core/managers/TwoDAManager";

import { isArea } from "@engine/module/guards/isArea";

const blacklist = ['(Row Label)', '__index', 'label'];

const REPUTATION_STATUS = {
  HOSTILE: 0,
  NEUTRAL: 1,
  FRIENDLY: 2,
};

/**
 * FactionManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file FactionManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FactionManager {

  static FACTION_COUNT = 0;
  static factions = new Map<number, Faction>();

  static Init(){
    FactionManager.FACTION_COUNT = 0;
    FactionManager.factions.clear();
  }

  static AddCreatureToFaction( creature: GameObject ){
    if(BitWise.InstanceOf(creature?.objectType, GameObjectType.Creature)){
      FactionManager.RemoveCreatureFromFaction(creature);
      if(creature.faction){
        creature.faction.addMember(creature as Creature);
      }
    }
  }

  static RemoveCreatureFromFaction( creature: GameObject){
    if(BitWise.InstanceOf(creature?.objectType, GameObjectType.Creature)){
      let faction = creature.faction;
      if(faction){
        faction.removeMember(creature as Creature);
      }
    }
  }

  static GetFactionLeader( creature: GameObject ){
    if(BitWise.InstanceOf(creature?.objectType, GameObjectType.Creature)){
      if(creature.faction.id == 0){
        return GameState.PartyManager.party[0];
      }else{
        let faction = FactionManager.GetCreatureFaction(creature);
        if(faction){
          return faction.getStrongestMember();
        }
      }
    }
    return undefined;
  }

  static GetCreatureFaction(oSource: GameObject){
    if(BitWise.InstanceOf(oSource?.objectType, GameObjectType.Creature)){
      return oSource.faction;
    }

    return undefined;
  }

  static GetFactionByLabel( label = '' ){
    label = label.toLocaleLowerCase();
    let faction;
    for (let key of FactionManager.factions.keys()) {
      faction = FactionManager.factions.get(key);
      if(faction.label.toLocaleLowerCase() == label){
        return faction;
      }
    }
    return undefined;
  }

  static SetFactionReputation(oSource: GameObject, oTarget: GameObject, value = 50){

    if(!(BitWise.InstanceOf(oSource?.objectType, GameObjectType.GameObject)) || !(BitWise.InstanceOf(oTarget?.objectType, GameObjectType.GameObject)))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(0, Math.min(value, ReputationConstant.FRIENDLY));
    if(oSource.faction && oTarget.faction){
      oSource.faction.setReputation(oTarget.faction.id, value);
      return true;
    }
    return false;
  }

  static AdjustFactionReputation(oSource: GameObject, oTarget: GameObject, value = 50){

    if(!(BitWise.InstanceOf(oSource?.objectType, GameObjectType.GameObject)) || !(BitWise.InstanceOf(oTarget?.objectType, GameObjectType.GameObject)))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(-100, Math.min(value, 100));
    let fac1 = oSource.faction;
    let fac2 = oTarget.faction;
    if(fac1 && fac2){
      fac1.adjustReputation(oTarget.faction.id, value);
      return true;
    }
    return false;
  }

  static IsHostile(oSource: GameObject, oTarget: GameObject): boolean {
    return FactionManager.GetReputation(oSource, oTarget) <= 10;
  }

  static IsNeutral(oSource: GameObject, oTarget: GameObject): boolean {
    let rep = FactionManager.GetReputation(oSource, oTarget);
    return (rep >= 11) && (rep <= 89);
  }

  static IsFriendly(oSource: GameObject, oTarget: GameObject): boolean {
    return FactionManager.GetReputation(oSource, oTarget) >= 90;
  }

  static GetReputation(oSource: GameObject, oTarget: GameObject): number {
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget
    // GetReputation — missing faction → 0x32 (50)
    if(!(BitWise.InstanceOf(oSource?.objectType, GameObjectType.GameObject)) || !(BitWise.InstanceOf(oTarget?.objectType, GameObjectType.GameObject)))
      return 0;

    if(oSource.faction && oTarget.faction){
      let reputation = oSource.faction.reputations[oTarget.faction.id];
      if(reputation instanceof Reputation){
        return reputation.reputation;
      }
    }

    return 50;
  }

  static Load2DA(): void {
    console.log('FactionManager.Load2DA', 'loading...');
    //Clear the factions list
    FactionManager.Init();

    const swFactions = GameState.SWRuleSet?.factions;
    if(swFactions?.length){
      FactionManager.FACTION_COUNT = swFactions.length;
      for(let i = 0; i < swFactions.length; i++){
        const sw = swFactions[i];
        if(!sw) continue;
        const faction = new Faction();
        faction.id = sw.id;
        faction.label = sw.label;
        faction.global = 1;
        FactionManager.factions.set(faction.id, faction);
        faction.initReputations(FactionManager.FACTION_COUNT, ReputationConstant.FRIENDLY);
      }

      FactionManager.factions.forEach( (faction1, faction1_id) => {
        const swRow = swFactions[faction1_id];
        for(let faction2_id = 0; faction2_id < FactionManager.FACTION_COUNT; faction2_id++){
          const faction2 = FactionManager.factions.get(faction2_id);
          const repKey = (faction2?.label || '').toLocaleLowerCase();
          let reputation = swRow?.getReputation?.(repKey) ?? 0;
          if(typeof reputation !== 'number' || isNaN(reputation)) reputation = 0;

          if(faction1_id == 0){
            if(faction2_id == 0){
              faction1.reputations[faction2_id].reputation = ReputationConstant.FRIENDLY;
            }else{
              faction1.reputations[faction2_id].reputation = reputation;
            }
          }else{
            if(faction2_id == 0){
              faction1.reputations[faction2_id] = faction2.reputations[faction1_id];
            }else{
              if(faction1_id == faction2_id){
                faction1.reputations[faction2_id].reputation = reputation;
              }else{
                faction1.reputations[faction2_id] = faction2.reputations[faction1_id];
                faction1.reputations[faction2_id].reputation = reputation;
              }
            }
          }
        }
      });
      return;
    }

    // Fallback when SWRuleSet has not loaded repute yet
    let repute2DA = TwoDAManager.datatables.get('repute');
    if(repute2DA){
      FactionManager.FACTION_COUNT = repute2DA.RowCount;
      let twoDA_factions = repute2DA.rows;
      for(let i = 0, len = repute2DA.RowCount; i < len; i++){
        let faction = Faction.From2DARow(twoDA_factions[i]);
        if(faction){
          FactionManager.factions.set(faction.id, faction);
          faction.initReputations(FactionManager.FACTION_COUNT, ReputationConstant.FRIENDLY);
        }
      }

      FactionManager.factions.forEach( (faction1, faction1_id) => {
        let twoDA_row = twoDA_factions[faction1_id];
        for(let faction2_id = 0; faction2_id < FactionManager.FACTION_COUNT; faction2_id++){
          const faction2 = FactionManager.factions.get(faction2_id);
          let _2DARep = twoDA_row[faction2.label.toLocaleLowerCase()];
          let reputation = !isNaN(parseInt(_2DARep)) ? parseInt(_2DARep) : 0;

          if(faction1_id == 0){
            if(faction2_id == 0){
              faction1.reputations[faction2_id].reputation = ReputationConstant.FRIENDLY;
            }else{
              faction1.reputations[faction2_id].reputation = reputation;
            }
          }else{
            if(faction2_id == 0){
              faction1.reputations[faction2_id] = faction2.reputations[faction1_id];
            }else{
              if(faction1_id == faction2_id){
                faction1.reputations[faction2_id].reputation = reputation;
              }else{
                faction1.reputations[faction2_id] = faction2.reputations[faction1_id];
                faction1.reputations[faction2_id].reputation = reputation;
              }
            }
          }
        }
      });
    }
  }

  static LoadFAC( gff: GFFObject ){
    console.log('FactionManager.LoadFAC');
    if(gff instanceof GFFObject){
      FactionManager.Init();

      let factionList = gff.RootNode.getFieldByLabel('FactionList').getChildStructs();
      FactionManager.FACTION_COUNT = factionList.length;
      for(let i = 0, len = factionList.length; i < len; i++){
        let factionStruct = factionList[i];
        let faction = Faction.FromStruct(factionStruct);
        if(faction){
          FactionManager.factions.set(faction.id, faction);
        }
      }

      for (let id of FactionManager.factions.keys()) {
        let faction = FactionManager.factions.get(id);
        faction.initReputations(FactionManager.FACTION_COUNT, ReputationConstant.FRIENDLY);
      }

      let repList = gff.RootNode.getFieldByLabel('RepList').getChildStructs();
      for(let i = 0, len = repList.length; i < len; i++){
        let repStruct = repList[i];
        if(repStruct instanceof GFFStruct){
          let reputation = Reputation.FromStruct(repStruct);
          if(reputation instanceof Reputation){
            let faction = FactionManager.factions.get(reputation.id1);
            if(faction){
              faction.setReputation(reputation.id2, reputation.reputation);
            }
          }
        }
      }
      return true;
    }
    return false;
  }

  static async Load(){
    let fac_path = path.join( CurrentGame.gameinprogress_dir, 'repute.fac');
    const exists = await GameFileSystem.exists( fac_path );
    try{
      if(exists){
        const buffer = await GameFileSystem.readFile( fac_path )
        if(FactionManager.LoadFAC( new GFFObject(buffer) )){
          console.log('ReputationLoader: loaded', 'CurrentGame .fac');
        }else{
          console.error('ReputationLoader: failed', `couldn't load repute.fac`);
          FactionManager.Load2DA();
          console.log('ReputationLoader: loaded', 'default faction data');
        }
      }else{
        console.error('ReputationLoader: failed', `couldn't locate repute.fac`);
        FactionManager.Load2DA();
        console.log('ReputationLoader: loaded', 'default faction data');
      }
    }catch(e){
      console.error(e);
      FactionManager.Load2DA();
      console.log('ReputationLoader: loaded', 'default faction data');
    }
  }

  static Save(){
    let gff = new GFFObject();
    gff.FileType = 'FAC ';

    let factionList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'FactionList') );
    let repList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'RepList') );

    let facIdx = 0;
    let repIdx = 0;

    FactionManager.factions.forEach( (faction, id) => {
      let facStruct = faction.toStruct(facIdx++);
      if(facStruct instanceof GFFStruct){
        factionList.addChildStruct(facStruct);
      }

      for(let i = 0; i < faction.reputations.length; i++){
        let reputation = faction.reputations[i];
        if(reputation.reputation < ReputationConstant.FRIENDLY){
          let repStruct = reputation.toStruct(repIdx++, id, i);
          if(repStruct instanceof GFFStruct){
            repList.addChildStruct(repStruct);
          }else{
            console.log('FactionManager.save', 'invalid struct', id, i, repStruct);
          }
        }else{
          //console.log('FactionManager.save', 'skipping because 100', id, i, reputation.reputation);
        }
      }
    });

    return gff;
  }

  static Export( filename = '' ){
    console.log('FactionManager.Export', filename);
    return new Promise<void>( (resolve, reject) => {
      let fac = FactionManager.Save();
      if(fac instanceof GFFObject){
        fac.export( filename, () => {
          resolve();
        }, () => {
          resolve();
        });
      }
    });
  }

  /**
   * Resolve the area used by ExecuteCommandChangeByFaction.
   * Caller may be a creature/object (→ GetArea) or the area itself.
   */
  static resolveCallerArea(caller: GameObject | undefined): Area | undefined {
    if(!caller) return undefined;
    if(isArea(caller)){
      return caller as Area;
    }
    return caller.area;
  }

  /**
   * ExecuteCommandChangeByFaction
   * ChangeFactionByFaction / SurrenderByFaction.
   *
   * All creatures in the caller's area whose FactionID matches `fromFactionId`
   * join `toFactionId`. Surrender also clears combat/actions and pacifies.
   */
  static changeFactionByFaction(
    caller: GameObject | undefined,
    fromFactionId: number,
    toFactionId: number,
    surrender: boolean = false,
  ): void {
    const area = FactionManager.resolveCallerArea(caller);
    if(!area?.creatures?.length) return;

    const toFaction = FactionManager.factions.get(toFactionId);
    if(!toFaction) return;

    for(let i = 0; i < area.creatures.length; i++){
      const creature = area.creatures[i] as Creature;
      if(!creature) continue;

      const factionId = creature.faction?.id ?? creature.factionId;
      if(factionId !== fromFactionId) continue;

      creature.faction = toFaction;
      creature.factionId = toFactionId;
      FactionManager.AddCreatureToFaction(creature);

      if(surrender){
        // SetCombatState(0, 1), ClearAllActions(1), PacifyCreature
        creature.setCombatState(false);
        creature.clearAllActions(true);
        creature.pacifyCreature();
      }else{
        // ClearVisibleList + UpdateVisibleList(0)
        creature.clearVisibleList();
      }
    }
  }

}
