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

  static SetFactionReputation(oSource = undefined, oTarget = undefined, value = 50){

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(0, Math.min(value, 100));
    fac1 = FactionManager.factions.get(oSource.faction);
    fac2 = FactionManager.factions.get(oTarget.faction);
    if(fac1 instanceof Faction && fac2 instanceof Faction){
      fac1.setReputation(oTarget.faction, value);
      return true;
    }
    return false;
  }

  static AdjustFactionReputation(oSource = undefined, oTarget = undefined, value = 50){

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    value = Math.max(-100, Math.min(value, 100));
    fac1 = FactionManager.factions.get(oSource.faction);
    fac2 = FactionManager.factions.get(oTarget.faction);
    if(fac1 instanceof Faction && fac2 instanceof Faction){
      fac1.adjustReputation(oTarget.faction, value);
      return true;
    }
    return false;
  }

  static IsHostile(oSource = undefined, oTarget = undefined){
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return false;

    if(oSource.isDead() || oTarget.isDead())
      return false;

    let sourceFaction = FactionManager.factions.get(oSource.faction);

    if(sourceFaction instanceof Faction){
      let repKey = Reputation.GetReputationKey(oSource.faction, oTarget.faction);
      if(repKey){
        let reputation = FactionManager.reputations.get(repKey);
        if(reputation instanceof Reputation){
          return reputation.reputation <= 10;
        }
      }
    }

    return false;
  }

  static IsNeutral(oSource = undefined, oTarget = undefined){
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return true;

    let sourceFaction = FactionManager.factions.get(oSource.faction);

    if(sourceFaction instanceof Faction){
      let repKey = Reputation.GetReputationKey(oSource.faction, oTarget.faction);
      if(repKey){
        let reputation = FactionManager.reputations.get(repKey);
        if(reputation instanceof Reputation){
          return (reputation.reputation >= 11) || (reputation.reputation <= 89);
        }
      }
    }

    return true;
  }

  static IsFriendly(oSource = undefined, oTarget = undefined){
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(oSource instanceof ModuleObject) || !(oTarget instanceof ModuleObject))
      return false;

    if(oSource.faction == oTarget.faction)
      return true;

    let sourceFaction = FactionManager.factions.get(oSource.faction);

    if(sourceFaction instanceof Faction){
      let repKey = Reputation.GetReputationKey(oSource.faction, oTarget.faction);
      if(repKey){
        let reputation = FactionManager.reputations.get(repKey);
        if(reputation instanceof Reputation){
          return reputation.reputation >= 90;
        }
      }
    }

    return false;
  }

  static GetReputation(oSource = undefined, oTarget = undefined){
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
    let factions = Global.kotor2DA["repute"].rows;
    for(let i = 0, len = Global.kotor2DA["repute"].RowCount; i < len; i++){
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

  static LoadFac( gff = undefined ){
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
        if(repStruct instanceof Struct){
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
    return new Promise( (resolve, reject) => {
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

    let factionList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'FactionList') );
    let repList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'RepList') );

    let facIdx = 0;
    let repIdx = 0;

    let maxFactions = FactionManager.factions.size;

    for (let id of FactionManager.factions.keys()) {
      let faction = FactionManager.factions.get(id);
      let facStruct = faction.toStruct(facIdx++);
      if(facStruct instanceof Struct){
        factionList.AddChildStruct(facStruct);
      }

      for(let i = 0; i < maxFactions; i++){
        let repKey = Reputation.GetReputationKey(id, i);
        if(repKey){
          let reputation = FactionManager.reputations.get(repKey);
          if(reputation.reputation < 100){
            let repStruct = reputation.toStruct(repIdx++, id, i);
            if(repStruct instanceof Struct){
              repList.AddChildStruct(repStruct);
            }else{
              console.log('FactionManager.save', 'invalid struct', id, i, repStruct);
            }
          }else{
            console.log('FactionManager.save', 'skipping because 100', id, i, reputation.reputation);
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
    return new Promise( (resolve, reject) => {
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

  initReputations( value = 100 ){
    for (let id of FactionManager.factions.keys()) {
      let repKey = Reputation.GetReputationKey(this.id, id);
      console.log('Faction.initReputations', this.id, id, repKey, value);
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

  toStruct(structIdx){
    let struct = new Struct(structIdx);

    struct.AddField( new Field(GFFDataTypes.WORD, 'FactionGlobal') ).SetValue(this.global);
    struct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'FactionName') ).SetValue(this.label);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'FactionParentID') ).SetValue(this.parentId);

    return struct;
  }

  static From2DARow( row = undefined ){
    if(typeof row === 'object'){
      let faction = new Faction();
      faction.id = row.__index;
      faction.label = row.label;
      faction.global = 1;
      return faction;
    }
    return undefined;
  }

  static FromStruct( struct = undefined ){
    if( struct instanceof Struct ){
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

  constructor(repKey = 0, reputation = 100){
    this.repKey = repKey;
    this.reputation = reputation;
  }

  toStruct(structIdx, id1 = -1, id2 = -1){
    let struct = new Struct(structIdx);

    struct.AddField( new Field(GFFDataTypes.DWORD, 'FactionID1') ).SetValue(id1);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'FactionID2') ).SetValue(id2);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'FactionRep') ).SetValue(this.reputation);

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

  static FromStruct( struct = undefined ){
    if(struct instanceof Struct){
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

module.exports = FactionManager;