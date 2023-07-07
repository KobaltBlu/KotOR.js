import { CurrentGame } from "./CurrentGame";
import type { ModuleCreature, ModuleObject, ModulePlayer } from "./module";
import { GFFObject } from "./resource/GFFObject";
import { GFFStruct } from "./resource/GFFStruct";

import * as path from "path";
import { GFFField } from "./resource/GFFField";
import { GFFDataType } from "./enums/resource/GFFDataType";
import { GameFileSystem } from "./utility/GameFileSystem";
import { Faction } from "./engine/Faction";
import { Reputation } from "./engine/Reputation";
import { ReputationConstant } from "./enums/engine/ReputationConstant";
import { PartyManager, TwoDAManager } from "./managers";
import { BitWise } from "./utility/BitWise";
import { ModuleObjectType } from "./enums/module/ModuleObjectType";

const blacklist = ['(Row Label)', '__index', 'label'];

const REPUTATION_STATUS = {
  HOSTILE: 0,
  NEUTRAL: 1,
  FRIENDLY: 2,
};

export class FactionManager {

  static FACTION_COUNT = 0;
  static factions = new Map<number, Faction>();

  static Init(){
    FactionManager.FACTION_COUNT = 0;
    FactionManager.factions.clear();
  }

  static AddCreatureToFaction( creature: ModuleObject ){
    if(BitWise.InstanceOf(creature?.objectType, ModuleObjectType.ModuleCreature)){
      FactionManager.RemoveCreatureFromFaction(creature);
      if(creature.faction instanceof Faction){
        creature.faction.addMember(creature as ModuleCreature);
      }
    }
  }

  static RemoveCreatureFromFaction( creature: ModuleObject){
    if(BitWise.InstanceOf(creature?.objectType, ModuleObjectType.ModuleCreature)){
      let faction = creature.faction;
      if(faction instanceof Faction){
        faction.removeMember(creature as ModuleCreature);
      }
    }
  }

  static GetFactionLeader( creature: ModuleObject ){
    if(BitWise.InstanceOf(creature?.objectType, ModuleObjectType.ModuleCreature)){
      if(creature.faction.id == 0){
        return PartyManager.party[0];
      }else{
        let faction = FactionManager.GetCreatureFaction(creature);
        if(faction instanceof Faction){
          return faction.getStrongestMember();
        }
      }
    }
    return undefined;
  }

  static GetCreatureFaction(oSource: ModuleObject){
    if(BitWise.InstanceOf(oSource?.objectType, ModuleObjectType.ModuleCreature)){
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

  static SetFactionReputation(oSource: ModuleObject, oTarget: ModuleObject, value = 50){

    if(!(BitWise.InstanceOf(oSource?.objectType, ModuleObjectType.ModuleObject)) || !(BitWise.InstanceOf(oTarget?.objectType, ModuleObjectType.ModuleObject)))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(0, Math.min(value, ReputationConstant.FRIENDLY));
    if(oSource.faction instanceof Faction && oTarget.faction instanceof Faction){
      oSource.faction.setReputation(oTarget.faction.id, value);
      return true;
    }
    return false;
  }

  static AdjustFactionReputation(oSource: ModuleObject, oTarget: ModuleObject, value = 50){

    if(!(BitWise.InstanceOf(oSource?.objectType, ModuleObjectType.ModuleObject)) || !(BitWise.InstanceOf(oTarget?.objectType, ModuleObjectType.ModuleObject)))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(-100, Math.min(value, 100));
    let fac1 = oSource.faction;
    let fac2 = oTarget.faction;
    if(fac1 instanceof Faction && fac2 instanceof Faction){
      fac1.adjustReputation(oTarget.faction.id, value);
      return true;
    }
    return false;
  }

  static IsHostile(oSource: ModuleObject, oTarget: ModuleObject): boolean {
    return FactionManager.GetReputation(oSource, oTarget) <= 10;
  }

  static IsNeutral(oSource: ModuleObject, oTarget: ModuleObject): boolean {
    let rep = FactionManager.GetReputation(oSource, oTarget);
    return (rep >= 11) && (rep <= 89);
  }

  static IsFriendly(oSource: ModuleObject, oTarget: ModuleObject): boolean {
    return FactionManager.GetReputation(oSource, oTarget) >= 90;
  }

  static GetReputation(oSource: ModuleObject, oTarget: ModuleObject): number {
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget
    if(!(BitWise.InstanceOf(oSource?.objectType, ModuleObjectType.ModuleObject)) || !(BitWise.InstanceOf(oTarget?.objectType, ModuleObjectType.ModuleObject)))
      return 0;

    if(oSource.faction instanceof Faction){
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

    //Populate the default factions
    let repute2DA = TwoDAManager.datatables.get('repute');
    if(repute2DA){
      FactionManager.FACTION_COUNT = repute2DA.RowCount;
      let twoDA_factions = repute2DA.rows;
      for(let i = 0, len = repute2DA.RowCount; i < len; i++){
        let faction = Faction.From2DARow(twoDA_factions[i]);
        if(faction instanceof Faction){
          FactionManager.factions.set(faction.id, faction);
          faction.initReputations(ReputationConstant.FRIENDLY);
        }
      }
    

      //Set all faction reputations to their default values
      FactionManager.factions.forEach( (faction1, faction1_id) => {
        let twoDA_row = twoDA_factions[faction1_id];
        for(let faction2_id = 0; faction2_id < FactionManager.FACTION_COUNT; faction2_id++){
          const faction2 = FactionManager.factions.get(faction2_id);
          let _2DARep = twoDA_row[faction2.label.toLocaleLowerCase()];
          let reputation = !isNaN(parseInt(_2DARep)) ? parseInt(_2DARep) : 0;

          if(faction1_id == 0){ //First row is a special case [player faction]
            if(faction2_id == 0){ //targeting the [player faction] again
              //hardcode the value to friendly
              faction1.reputations[faction2_id].reputation = ReputationConstant.FRIENDLY;
            }else{
              //set the reputation value found in the 2da column for the target faction
              faction1.reputations[faction2_id].reputation = reputation;
            }
          }else{
            if(faction2_id == 0){ //this faction info exists back in the player faction
              //copy over the reference object from the other faction
              //this will allow us to update both values at the same time in the future
              faction1.reputations[faction2_id] = faction2.reputations[faction1_id];
            }else{
              if(faction1_id == faction2_id){ //targeting itself
                //set the reputation value found in the 2da column for this faction
                faction1.reputations[faction2_id].reputation = reputation;
              }else{
                //copy over the reference object from the other faction
                //this will allow us to update both values at the same time in the future
                faction1.reputations[faction2_id] = faction2.reputations[faction1_id];
                //update the reputation value incase this value is newer
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

      let factionList = gff.RootNode.GetFieldByLabel('FactionList').GetChildStructs();
      FactionManager.FACTION_COUNT = factionList.length;
      for(let i = 0, len = factionList.length; i < len; i++){
        let factionStruct = factionList[i];
        let faction = Faction.FromStruct(factionStruct);
        if(faction instanceof Faction){
          FactionManager.factions.set(faction.id, faction);
        }
      }

      for (let id of FactionManager.factions.keys()) {
        let faction = FactionManager.factions.get(id);
        faction.initReputations(ReputationConstant.FRIENDLY);
      }

      let repList = gff.RootNode.GetFieldByLabel('RepList').GetChildStructs();
      for(let i = 0, len = repList.length; i < len; i++){
        let repStruct = repList[i];
        if(repStruct instanceof GFFStruct){
          let reputation = Reputation.FromStruct(repStruct);
          if(reputation instanceof Reputation){
            let faction = FactionManager.factions.get(reputation.id1);
            if(faction instanceof Faction){
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

    let factionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'FactionList') );
    let repList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'RepList') );

    let facIdx = 0;
    let repIdx = 0;

    FactionManager.factions.forEach( (faction, id) => {
      let facStruct = faction.toStruct(facIdx++);
      if(facStruct instanceof GFFStruct){
        factionList.AddChildStruct(facStruct);
      }

      for(let i = 0; i < faction.reputations.length; i++){
        let reputation = faction.reputations[i];
        if(reputation.reputation < ReputationConstant.FRIENDLY){
          let repStruct = reputation.toStruct(repIdx++, id, i);
          if(repStruct instanceof GFFStruct){
            repList.AddChildStruct(repStruct);
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
        fac.Export( filename, () => {
          resolve();
        }, () => {
          resolve();
        });
      }
    });
  }

}
