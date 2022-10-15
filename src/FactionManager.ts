import { CurrentGame } from "./CurrentGame";
import { PartyManager } from "./managers/PartyManager";
import { ModuleCreature, ModuleObject, ModulePlayer } from "./module";
import { GFFObject } from "./resource/GFFObject";
import { GFFStruct } from "./resource/GFFStruct";

import * as path from "path";
import * as fs from "fs";
import { GFFField } from "./resource/GFFField";
import { GFFDataType } from "./enums/resource/GFFDataType";
import { TwoDAManager } from "./managers/TwoDAManager";

const blacklist = ['(Row Label)', '__index', 'label'];

const REP_FRIENDLY = 100;
const REP_NEUTRAL = 50;
const REP_HOSTILE = 0;

const REPUTATION_STATUS = {
  HOSTILE: 0,
  NEUTRAL: 1,
  FRIENDLY: 2,
};

class FactionManager {

  static factions = new Map();
  static reputations = new Map();

  static Init(){
    FactionManager.factions.clear();
    FactionManager.reputations.clear();
  }

  static AddCreatureToFaction( creature: ModuleObject ){
    if(creature instanceof ModuleCreature){
      FactionManager.RemoveCreatureFromFaction(creature);
      let faction = FactionManager.factions.get(creature.faction);
      if(faction instanceof Faction){
        faction.addMember(creature);
      }
    }
  }

  static RemoveCreatureFromFaction( creature: ModuleObject){
    if(creature instanceof ModuleCreature){
      let faction = FactionManager.factions.get(creature.faction);
      if(faction instanceof Faction){
        faction.removeMember(creature);
      }
    }
  }

  static GetFactionLeader( creature: ModuleObject ){
    if(creature instanceof ModuleCreature){
      if(creature.faction == 0){
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
    if(oSource instanceof ModuleCreature){
      return FactionManager.factions.get(oSource.faction);
    }

    return undefined;
  }

  static GetReputationObject(id1 = 0, id2 = 0){
    let repKey = Reputation.GetReputationKey(id1, id2);
    if(repKey){
      let reputation = FactionManager.reputations.get(repKey);
      if(reputation instanceof Reputation){
        return reputation
      }
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

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(0, Math.min(value, 100));
    let fac1 = FactionManager.factions.get(oSource.faction);
    let fac2 = FactionManager.factions.get(oTarget.faction);
    if(fac1 instanceof Faction && fac2 instanceof Faction){
      fac1.setReputation(oTarget.faction, value);
      return true;
    }
    return false;
  }

  static AdjustFactionReputation(oSource: ModuleObject, oTarget: ModuleObject, value = 50){

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(-100, Math.min(value, 100));
    let fac1 = FactionManager.factions.get(oSource.faction);
    let fac2 = FactionManager.factions.get(oTarget.faction);
    if(fac1 instanceof Faction && fac2 instanceof Faction){
      fac1.adjustReputation(oTarget.faction, value);
      return true;
    }
    return false;
  }

  static IsHostile(oSource: ModuleObject, oTarget: ModuleObject){
    return FactionManager.GetReputation(oSource, oTarget) <= 10;
  }

  static IsNeutral(oSource: ModuleObject, oTarget: ModuleObject){
    let rep = FactionManager.GetReputation(oSource, oTarget);
    return (rep >= 11) && (rep <= 89);
  }

  static IsFriendly(oSource: ModuleObject, oTarget: ModuleObject){
    return FactionManager.GetReputation(oSource, oTarget) >= 90;
  }

  static GetReputation(oSource: ModuleObject, oTarget: ModuleObject){
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget
    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    let sourceFaction = FactionManager.factions.get(oSource.faction);

    if(sourceFaction instanceof Faction){
      let repKey = Reputation.GetReputationKey(oSource.faction, oTarget.faction);
      if(repKey){
        let reputation = FactionManager.reputations.get(repKey);
        if(reputation instanceof Reputation){
          return reputation.reputation;
        }
      }
    }

    return 50;
  }

  static Load2DA(){
    console.log('FactionManager.Load2DA');
    //Clear the factions list
    FactionManager.Init();

    //Populate the default factions
    let repute2DA = TwoDAManager.datatables.get('repute');
    if(repute2DA){
      let factions = repute2DA.rows;
      for(let i = 0, len = repute2DA.RowCount; i < len; i++){
        let faction = Faction.From2DARow(factions[i]);
        if(faction instanceof Faction){
          FactionManager.factions.set(faction.id, faction);
        }
      }
    

      //Set all faction reputations to their default values
      for (let id of FactionManager.factions.keys()) {
        let faction = FactionManager.factions.get(id);
        faction.initReputations(100);
        if(faction instanceof Faction){
          let row = factions[id];
          let keys = Object.keys(row);
          for(let i = 0, len = keys.length; i < len; i ++){
            if(row.hasOwnProperty(keys[i]) && blacklist.indexOf(keys[i]) == -1){
              let faction2 = FactionManager.GetFactionByLabel(row.label);
              if(faction2 instanceof Faction){
                let fac2_id = [...FactionManager.factions].find(([key, val]) => val == faction2)[0];
                if(fac2_id != undefined){
                  faction.setReputation(fac2_id, parseInt(row[keys[i]]));
                }
              }
            }
          }
        }
      }
    }
  }

  static LoadFac( gff: GFFObject ){
    console.log('FactionManager.LoadFac');
    if(gff instanceof GFFObject){
      FactionManager.Init();

      let factionList = gff.RootNode.GetFieldByLabel('FactionList').GetChildStructs();
      for(let i = 0, len = factionList.length; i < len; i++){
        let factionStruct = factionList[i];
        let faction = Faction.FromStruct(factionStruct);
        if(faction instanceof Faction){
          FactionManager.factions.set(faction.id, faction);
        }
      }

      for (let id of FactionManager.factions.keys()) {
        let faction = FactionManager.factions.get(id);
        faction.initReputations(100);
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

  static Load(){
    return new Promise<void>( (resolve, reject) => {
      fs.readFile( path.join( CurrentGame.gameinprogress_dir, 'repute.fac'), (error, data) => {
        if(!error){
          if(FactionManager.LoadFac( new GFFObject(data) )){
            console.log('ReputationLoader: loaded', 'CurrentGame .fac');
          }else{
            console.error('ReputationLoader: failed', 'CurrentGame .fac');
            FactionManager.Load2DA();
            console.log('ReputationLoader: loaded', 'default faction data');
          }
          resolve();
        }else{
          FactionManager.Load2DA();
          console.log('ReputationLoader: loaded', 'default faction data');
          resolve();
        }
      });
    });
  }

  static Save(){
    let gff = new GFFObject();
    gff.FileType = 'FAC ';

    let factionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'FactionList') );
    let repList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'RepList') );

    let facIdx = 0;
    let repIdx = 0;

    let maxFactions = FactionManager.factions.size;

    for (let id of FactionManager.factions.keys()) {
      let faction = FactionManager.factions.get(id);
      let facStruct = faction.toStruct(facIdx++);
      if(facStruct instanceof GFFStruct){
        factionList.AddChildStruct(facStruct);
      }

      for(let i = 0; i < maxFactions; i++){
        let repKey = Reputation.GetReputationKey(id, i);
        if(repKey){
          let reputation = FactionManager.reputations.get(repKey);
          if(reputation.reputation < 100){
            let repStruct = reputation.toStruct(repIdx++, id, i);
            if(repStruct instanceof GFFStruct){
              repList.AddChildStruct(repStruct);
            }else{
              console.log('FactionManager.save', 'invalid struct', id, i, repStruct);
            }
          }else{
            //console.log('FactionManager.save', 'skipping because 100', id, i, reputation.reputation);
          }
        }else{
          console.log('FactionManager.save', 'missing repKey', id, i);
        }
      }
    }

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

class Faction {

  id = 0;
  label = '';
  global = 0;
  parentId = 4294967295;
  creatures: ModuleCreature[] = [];

  addMember( creature: ModuleCreature ){
    if(creature instanceof ModuleCreature){
      if(this.creatures.indexOf(creature) == -1){
        this.creatures.push(creature);
      }
    }
  }

  removeMember( creature: ModuleCreature ){
    if(creature instanceof ModuleCreature){
      let index = this.creatures.indexOf(creature);
      if(index >= 0){
        this.creatures.splice(index, 1);
      }
    }
  }

  initReputations( value = 100 ){
    for (let id of FactionManager.factions.keys()) {
      let repKey = Reputation.GetReputationKey(this.id, id);
      //console.log('Faction.initReputations', this.id, id, repKey, value);
      if(repKey){
        let reputation = FactionManager.reputations.get(repKey);
        if(reputation instanceof Reputation){
          reputation.reputation = value;
        }else{
          FactionManager.reputations.set(
            repKey,
            new Reputation(repKey, value)
          );
        }
      }
    }
  }

  setReputation(id = -1, value = 100){
    let repKey = Reputation.GetReputationKey(this.id, id);
    if(repKey){
      let reputation = FactionManager.reputations.get(repKey);
      if(reputation instanceof Reputation){
        reputation.reputation = value;
      }else{
        FactionManager.reputations.set(
          repKey,
          new Reputation(repKey, value)
        );
      }
    }
  }

  adjustReputation(id = -1, value = 100){
    let repKey = Reputation.GetReputationKey(this.id, id);
    if(repKey){
      let reputation = FactionManager.reputations.get(repKey);
      if(reputation instanceof Reputation){
        reputation.reputation = reputation.reputation + value;
        reputation.reputation = Math.max(0, Math.min(reputation.reputation, 100));
      }else{
        FactionManager.reputations.set(
          repKey,
          new Reputation( repKey, Math.max(0, Math.min(value + 100, 100)) )
        );
      }
    }
  }

  getReputation(id = -1){
    let repKey = Reputation.GetReputationKey(this.id, id);
    if(repKey){
      let reputation = FactionManager.reputations.get(repKey);
      if(reputation instanceof Reputation){
        return reputation.reputation;
      }else{
        FactionManager.reputations.set(
          repKey,
          new Reputation( repKey, REP_NEUTRAL )
        );
      }
    }
    return REP_NEUTRAL;
  }

  getCreatureReputation(oTarget: ModuleObject){
    if(oTarget instanceof ModuleCreature){
      let repKey = Reputation.GetReputationKey(this.id, oTarget.faction);
      if(repKey){
        let reputation = FactionManager.reputations.get(repKey);
        if(reputation instanceof Reputation){
          return reputation.reputation;
        }
      }
    }
    return undefined;
  }

  getWeakestMember(bMustBeVisible = false){
    // if(oTarget instanceof ModuleCreature){
      let lowerCR = Infinity;
      let cLowestCR = 0;
      let currentCreature = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          cLowestCR = creature.challengeRating;
          if(cLowestCR < lowerCR){
            lowerCR = cLowestCR;
            currentCreature = creature;
          }
        }
      }
      return currentCreature; 
    // }
    return undefined;
  }

  getStrongestMember(bMustBeVisible = false){
    // if(oTarget instanceof ModuleCreature){
      let highestCR = -Infinity;
      let cHighestCR = 0;
      let currentCreature = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          cHighestCR = creature.challengeRating;
          if(cHighestCR > highestCR){
            highestCR = cHighestCR;
            currentCreature = creature;
          }
        }
      }
      return currentCreature; 
    // }
    return undefined;
  }

  getMostDamagedMember(bMustBeVisible = false){
    // if(oTarget instanceof ModuleCreature){
      let lowestHP = Infinity;
      let cLowestHP = 0;
      let currentCreature = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          cLowestHP = creature.maxHitPoints - creature.currentHitPoints;
          if(cLowestHP < lowestHP){
            lowestHP = cLowestHP;
            currentCreature = creature;
          }
        }
      }
      return currentCreature; 
    // }
    return undefined;
  }

  getLeastDamagedMember(bMustBeVisible = false){
    // if(oTarget instanceof ModuleCreature){
      let highestHP = -Infinity;
      let cHighestHP = 0;
      let currentCreature = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          cHighestHP = creature.maxHitPoints + creature.currentHitPoints;
          if(cHighestHP > highestHP){
            highestHP = cHighestHP;
            currentCreature = creature;
          }
        }
      }
      return currentCreature; 
    // }
    return undefined;
  }

  getWorstACMember(bMustBeVisible = false){
    // if(oTarget instanceof ModuleCreature){
      let ac = Infinity;
      let cAC = 0;
      let currentCreature = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          cAC = creature.getAC();
          if(cAC < ac){
            ac = cAC;
            currentCreature = creature;
          }
        }
      }
      return currentCreature; 
    // }
    return undefined;
  }

  getBestACMember(bMustBeVisible = false){
    // if(oTarget instanceof ModuleCreature){
      let ac = -Infinity;
      let cAC = 0;
      let currentCreature = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          cAC = creature.getAC();
          if(cAC > ac){
            ac = cAC;
            currentCreature = creature;
          }
        }
      }
      return currentCreature; 
    // }
    return undefined;
  }

  getMemberGold(){
    let gold = 0;
    let creature;
    for(let i = 0, len = this.creatures.length; i < len; i++){
      creature = this.creatures[i];
      if(creature.faction == this.id){
        gold += creature.getGold();
      }
    }
    return gold;
  }

  getAverageReputation(oTarget: ModuleObject){
    if(oTarget instanceof ModuleCreature){
      let totalRep = 0;
      let totalCreatures = 0;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          totalRep += this.getCreatureReputation(oTarget);
          totalCreatures++;
        }
      }
      return Math.floor(totalRep / totalCreatures); 
    }
    return -1;
  }

  getAverageGoodEvilAlignment(){
    // if(oTarget instanceof ModuleCreature){
      let totalGoodEvil = 0;
      let totalCreatures = 0;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          totalGoodEvil += creature.getGoodEvil();
          totalCreatures++;
        }
      }
      return Math.floor(totalGoodEvil / totalCreatures); 
    // }
    return -1;
  }

  getAverageLevel(){
    // if(oTarget instanceof ModuleCreature){
      let totalLevel = 0;
      let totalCreatures = 0;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          totalLevel += creature.getTotalClassLevel();
          totalCreatures++;
        }
      }
      return Math.floor(totalLevel / totalCreatures); 
    // }
    return -1;
  }

  getAverageExperience(){
    // if(oTarget instanceof ModuleCreature){
      let totalExp = 0;
      let totalCreatures = 0;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          totalExp += creature.getXP();
          totalCreatures++;
        }
      }
      return Math.floor(totalExp / totalCreatures); 
    // }
    return -1;
  }

  getMostFrequestClass(){
    // if(oTarget instanceof ModuleCreature){
      let classCount = new Map();
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this.id){
          let creatureClass = creature.getMainClass();
          if(creatureClass){
            classCount.set(creatureClass, (typeof classCount.get(creatureClass) == 'number') ? classCount.get(creatureClass) + 1 : 1);
          }
        }
      }
      if(classCount.size){
        let bestClass = undefined;
        let count = -Infinity;
        for(let c of classCount.entries()){
          if(c[1] > count){
            bestClass = c[0];
            count = c[1];
          }
        }
        return typeof bestClass == 'number' ? bestClass : -1; 
      }else{
        return -1;
      }
    // }
    return -1;
  }

  getFactionMemberByIndex(index = 0, isPCOnly = false){
    let cIdx = 0;
    for(let i = 0, len = this.creatures.length; i < len; i++){
      let creature = this.creatures[i];
      if(creature.faction == this.id){
        if(cIdx == index){
          if(!isPCOnly || creature instanceof ModulePlayer)
            return creature;
        }
        cIdx++;
      }
    }
  }

  toStruct(structIdx: number){
    let struct = new GFFStruct(structIdx);

    struct.AddField( new GFFField(GFFDataType.WORD, 'FactionGlobal') ).SetValue(this.global);
    struct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'FactionName') ).SetValue(this.label);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionParentID') ).SetValue(this.parentId);

    return struct;
  }

  static From2DARow( row: any = undefined ){
    if(typeof row === 'object'){
      let faction = new Faction();
      faction.id = row.__index;
      faction.label = row.label;
      faction.global = 1;
      return faction;
    }
    return undefined;
  }

  static FromStruct( struct: GFFStruct ){
    if( struct instanceof GFFStruct ){
      let faction = new Faction();

      faction.id = struct.GetType();

      if(struct.HasField('FactionGlobal'))
        faction.global = struct.GetFieldByLabel('FactionGlobal').GetValue();

      if(struct.HasField('FactionName'))
        faction.label = struct.GetFieldByLabel('FactionName').GetValue();

      if(struct.HasField('FactionParentID'))
        faction.parentId = struct.GetFieldByLabel('FactionParentID').GetValue();

      return faction;
    }
    return undefined;
  }

}

class Reputation {

  id1 = -1;
  id2 = -1;
  repKey = 0;
  reputation = 100;

  constructor(repKey: any = 0, reputation = 100){
    this.repKey = repKey;
    this.reputation = reputation;
  }

  toStruct(structIdx: number, id1 = -1, id2 = -1){
    let struct = new GFFStruct(structIdx);

    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionID1') ).SetValue(id1);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionID2') ).SetValue(id2);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionRep') ).SetValue(this.reputation);

    return struct;
  }

  static GetReputationKey(id1 = -1, id2 = -1){
    if(id1 >= 0 && id2 >= 0){
      if(id1 <= id2){
        return id1+''+id2;
      }else{
        return id2+''+id1;
      }
    }
    return false;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let reputation = new Reputation();
      if(struct.HasField('FactionID1'))
        reputation.id1 = struct.GetFieldByLabel('FactionID1').GetValue();

      if(struct.HasField('FactionID2'))
        reputation.id2 = struct.GetFieldByLabel('FactionID2').GetValue();

      if(struct.HasField('FactionRep'))
        reputation.reputation = struct.GetFieldByLabel('FactionRep').GetValue();

      return reputation;
    }
    return undefined;
  }

}
