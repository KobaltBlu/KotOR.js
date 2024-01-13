// import { FactionManager } from "../managers";
import { ModuleCreature, ModuleObject, ModulePlayer } from "../module";
import { Reputation } from "./Reputation";
import { GFFStruct } from "../resource/GFFStruct";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ReputationConstant } from "../enums/engine/ReputationConstant";
import { GameState } from "../GameState";

/**
 * Faction class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Faction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Faction {

  id = 0;
  label = '';
  global = 0;
  parentId = 4294967295;
  creatures: ModuleCreature[] = [];

  reputations: Reputation[] = [];

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

  initReputations( value = ReputationConstant.FRIENDLY ){
    this.reputations = [];
    for(let i = 0; i < GameState.FactionManager.FACTION_COUNT; i++){
      this.reputations[i] = new Reputation(this.id, i, value);
    }
  }

  setReputation(id = -1, value = 100){
    let reputation = this.reputations[id];
    if(reputation instanceof Reputation){
      reputation.reputation = value;
    }
  }

  adjustReputation(id = -1, value = 100){
    let reputation = this.reputations[id];
    if(reputation instanceof Reputation){
      reputation.reputation = reputation.reputation + value;
      reputation.reputation = Math.max(0, Math.min(reputation.reputation, 100));
    }
  }

  getReputation(id = -1){
    let reputation = this.reputations[id];
    if(reputation instanceof Reputation){
      return reputation.reputation;
    }
    return ReputationConstant.NEUTRAL;
  }

  getCreatureReputation(oTarget: ModuleObject){
    if(oTarget instanceof ModuleCreature){
      let reputation = this.reputations[oTarget.faction.id];
      if(reputation instanceof Reputation){
        return reputation.reputation;
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
      let currentCreature: ModuleObject = undefined;
      for(let i = 0, len = this.creatures.length; i < len; i++){
        let creature = this.creatures[i];
        if(creature.faction == this){
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
      if(creature.faction == this){
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
        if(creature.faction == this){
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
      if(creature.faction == this){
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

    struct.addField( new GFFField(GFFDataType.WORD, 'FactionGlobal') ).setValue(this.global);
    struct.addField( new GFFField(GFFDataType.CEXOSTRING, 'FactionName') ).setValue(this.label);
    struct.addField( new GFFField(GFFDataType.DWORD, 'FactionParentID') ).setValue(this.parentId);

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

      faction.id = struct.getType();

      if(struct.hasField('FactionGlobal'))
        faction.global = struct.getFieldByLabel('FactionGlobal').getValue();

      if(struct.hasField('FactionName'))
        faction.label = struct.getFieldByLabel('FactionName').getValue();

      if(struct.hasField('FactionParentID'))
        faction.parentId = struct.getFieldByLabel('FactionParentID').getValue();

      return faction;
    }
    return undefined;
  }

}