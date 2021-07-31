/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The PartyManager class.
 */

class PartyManager {

  static Init(){
    PartyManager.PortraitOrder = [];
    PartyManager.Player = undefined;
    PartyManager.MaxSize = 2;
    PartyManager.NPCS = {
      0: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      1: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      2: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      3: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      4: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      5: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      6: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      7: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      8: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      9: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      10: {
        available: 0,
        canSelect: 0,
        spawned: false
      },
      11: {
        available: 0,
        canSelect: 0,
        spawned: false
      }
    }

    PartyManager.Gold = 0;
    PartyManager.CurrentMembers = [];

  }

  

  static RemoveNPCById(nID = 0, leaveInWorld = false){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      let mem = PartyManager.CurrentMembers[i];
      if(mem.memberID == nID){

        //Remove the partymember from the module
        for(let j = 0; j < PartyManager.party.length; j++){
          if(PartyManager.party[j].partyID == nID){
            let creature = PartyManager.party[j];
            PartyManager.party.splice(j, 1);
            PartyManager.RebuildPortraitOrder();

            if(!leaveInWorld){
              creature.destroy();
            }else{
              console.log('RemoveNPCById leaveInWorld', creature);
              Game.group.party.remove(creature.model);
              Game.group.creatures.add(creature.model);
              Game.module.area.creatures.push(creature);
            }

            break;
          }
        }

        //Remove the partymember from the current members list
        PartyManager.CurrentMembers.splice(i, 1);
        break;
      }
    }
  }

  static GetPortraitByIndex(nID = 0, onLoad = null){

    if(PartyManager.NPCS[nID].template instanceof GFFObject){
      let pm = PartyManager.NPCS[nID].template;
      if(pm.RootNode.HasField('PortraitId')){
        return Global.kotor2DA.portraits.rows[pm.RootNode.GetFieldByLabel('PortraitId').GetValue()].baseresref;
      }
    }

    return null;

  }

  static RebuildPortraitOrder(){
    PartyManager.PortraitOrder = [];
    for(let i = 0; i < PartyManager.party.length; i++){
      PartyManager.PortraitOrder[i] = PartyManager.party[i].getPortraitResRef().toLowerCase();
    }
  }

  static GetPortraitByResRef( resref = '' ){
    let portraits = Global.kotor2DA.portraits.rows;
    let count = Global.kotor2DA.portraits.RowCount;
    for(let i = 0; i < count; i++){
      if(portraits[i].baseresref.toLowerCase() == resref.toLowerCase()){
        return portraits[i];
      }
    }
  }

  static AddPortraitToOrder( resref = '' ){
    if(PartyManager.PortraitOrder.indexOf(resref) == -1 )
      PartyManager.PortraitOrder.push( resref.toLowerCase() );
  }

  static SetSelectable(nID = 0, state = false){
    PartyManager.NPCS[nID].canSelect = state ? true : false;
  }

  static IsSelectable(nID = 0){
    return PartyManager.NPCS[nID].canSelect ? true : false;
  }

  static IsAvailable(nID = 0){
    return PartyManager.NPCS[nID].available ? true : false;
  }

  static IsNPCInParty(nID){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      let cpm = PartyManager.CurrentMembers[i];
      if(cpm.memberID == nID){
        return true;
      }
    }
    return false;
  }

  //Set the PartyMember to unavailable
  static RemoveAvailableNPC(nID = 0){
    PartyManager.NPCS[nID].available = false;
    PartyManager.NPCS[nID].canSelect = false;
    PartyManager.NPCS[nID].template;
  }


  //Add a creature template to the list of available PartyMembers
  static AddNPCByTemplate(nID = 0, ResRef = '', onLoad = null){

    if(typeof ResRef === 'string'){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: ResourceTypes.utc,
        onLoad: (gff) => {
          PartyManager.NPCS[nID].available = true;
          PartyManager.NPCS[nID].canSelect = true;
          PartyManager.NPCS[nID].template = gff;

          if(onLoad != null)
            onLoad();
        },
        onFail: () => {
          console.error('Failed to load character template');
        }
      });

    }else if(ResRef instanceof GFFObject){
      //We already have the template (From SAVEGAME)
      PartyManager.NPCS[nID].available = true;
      PartyManager.NPCS[nID].canSelect = true;
      PartyManager.NPCS[nID].template = gff;
      if(onLoad != null)
        onLoad();
    }

  }

  //Add a world creature to the list of Party Members and remove it from the creatures array
  static AddCreatureToParty(slot = 1, creature = null){
    if(creature instanceof ModuleCreature){
      PartyManager.NPCS[slot].available = true;
      //PartyManager.NPCS[nID].canSelect = true;
      PartyManager.NPCS[slot].template = creature.template;
      //Add the creature to the party array
      PartyManager.party.push(creature);
      //Check to see if the creature needs to be removed from the creatures array
      let cIdx = Game.module.area.creatures.indexOf(creature);
      if(cIdx > -1){
        Game.module.area.creatures.splice(cIdx, 1);
      }
    }
  }

  static SwitchPlayerToPartyMember(nIdx = 0, onLoad = null){
    let template = undefined;

    if(nIdx == -1){
      template = PartyManager.Player;
    }else{
      template = PartyManager.NPCS[nIdx].template;
    }

    let partyMember = new ModuleCreature(template);

    try{

      let spawn = Game.player.position.clone();
      let quaternion = Game.player.quaternion.clone();

      partyMember.partyID = 0;
      partyMember.Load( () => {
        partyMember.LoadScripts( () => {
          partyMember.LoadModel( (model) => {
            PartyManager.party[0] = partyMember;
            
            model.box = new THREE.Box3().setFromObject(model);
            model.moduleObject = partyMember;
            partyMember.position.copy(spawn);
            /*model.translateX(spawn.x);
            model.translateY(spawn.y);
            model.translateZ(spawn.z);*/
            partyMember.quaternion.copy(quaternion);
      
            model.hasCollision = true;
            //model.buildSkeleton();
            Game.group.party.add( model );
            Game.player.destroy();
            Game.player = partyMember;
            partyMember.onSpawn();
            if(typeof onLoad === 'function')
              onLoad();

          });
        });
      });
    }catch(e){
      console.error(e);
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  //Save the current party member templates
  static Save(){
    for(let i = 0; i < PartyManager.party.length; i++){
      let pm = PartyManager.party[i];
      if(pm.partyID >= 0){
        let gff = pm.save();
        PartyManager.NPCS[pm.partyID].template = gff;
      }
    }
  }

  //Shift the current leader to the end of the party array
  static ShiftLeader(){
    PartyManager.party.push( PartyManager.party.shift() );
    PartyManager.UpdateLeader();
  }

  //Update the party members to see if any of them is the current party leader
  static UpdateLeader(){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      if(PartyManager.party[0].partyID == PartyManager.CurrentMembers[i].memberID){
        PartyManager.CurrentMembers[i].isLeader = true;
      }else{
        PartyManager.CurrentMembers[i].isLeader = false;
      }
    }

    PartyManager.RebuildPortraitOrder();

  }

  //Check to see if the current leader is a party member and not the player
  static IsPartyMemberLeader(){
    if(PartyManager.party[0].partyID >= 0){
      return true;
    }
    return false;
  }

  //Is the player character the leader of the party
  static IsPlayerPartyLeader(){
    return !PartyManager.IsPartyMemberLeader();
  }

  //Get the index of the creature in the party array by the order of it's portrait resref in the PortraitOrder array
  static GetCreatureStartingPartyIndex(creature = undefined){

    if(PartyManager.PortraitOrder[0]?.toLowerCase() == creature.getPortraitResRef().toLowerCase()){
      return 0
    }else if(PartyManager.PortraitOrder[1]?.toLowerCase() == creature.getPortraitResRef().toLowerCase()){
      return 1;
    }else if(PartyManager.PortraitOrder[2]?.toLowerCase() == creature.getPortraitResRef().toLowerCase()){
      return 2
    }

    return PartyManager.party.length;

  }

  //Get the creatures reference in the CurrentMembers array
  static GetCreatureMemberDetails( creature ){
    if(creature instanceof ModulePlayer){
      return undefined;
    }

    if(creature instanceof ModuleCreature){
      return PartyManager.CurrentMembers[ PartyManager.CurrentMembers.indexOf(creature) ]
    }

    return undefined;
  }

  //Load the PartyMember by it's index in the CurrentMembers array.
  static LoadPartyMember(nIdx = 0, onLoad = null){
    let npc = PartyManager.NPCS[PartyManager.CurrentMembers[nIdx].memberID];
    let template = npc.template;
    let partyMember = new ModuleCreature(template);

    let currentSlot = false;//PartyManager.party[nIdx+1];

    if(nIdx == 0 || nIdx == 1){
      try{
        if(!(currentSlot instanceof ModuleCreature)){
          partyMember.id = ModuleObject.GetNextPlayerId();
          partyMember.partyID = PartyManager.CurrentMembers[nIdx].memberID;
          partyMember.Load( () => {
            //PartyManager.party[nIdx+1] = partyMember;

            /*if(PartyManager.CurrentMembers[nIdx].isLeader){
              PartyManager.party.unshift(PartyManager.party.splice(nIdx+1, 1)[0]);
            }*/
            PartyManager.AddPortraitToOrder( partyMember.getPortraitResRef() );
            PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(partyMember) ] = partyMember;

            partyMember.LoadScripts( () => {
              partyMember.LoadModel( (model) => {
                let spawn = PartyManager.GetSpawnLocation(partyMember);
                model.box = new THREE.Box3().setFromObject(model);
                model.moduleObject = partyMember;

                partyMember.position.copy(spawn.position);
                partyMember.setFacing(spawn.getFacing(), true);
                //partyMember.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
          
                model.hasCollision = true;
                //model.buildSkeleton();
                Game.group.party.add( model );

                partyMember.onSpawn();
                if(typeof onLoad === 'function')
                  onLoad();

              });
            });
          });
        }else{
          let spawn = PartyManager.GetSpawnLocation(currentSlot);
          currentSlot.position.copy(spawn.position);
          currentSlot.setFacing(spawn.getFacing(), true);
          //currentSlot.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
          if(typeof onLoad === 'function')
            onLoad();
        }
      }catch(e){
        console.error(e);
        if(typeof onLoad === 'function')
          onLoad();
      }
    }else{
      console.error('LoadPartyMember', 'Wrong index', nIdx, npc, partyMember);
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  //Used in the TSL PartySelection menu to load creature for the 3D preview of the selected party member
  static LoadPartyMemberCreature(idx = 0, onLoad = null){
    let npc = PartyManager.NPCS[idx];
    if(npc){
      if(npc.template){
        let partyMember = new ModuleCreature(npc.template);
        partyMember.Load( () => {
          partyMember.LoadModel( (model) => {
            model.box = new THREE.Box3().setFromObject(model);
            model.moduleObject = partyMember;
            partyMember.onSpawn();
            if(typeof onLoad === 'function')
              onLoad(partyMember);

          });
        });
      }else{
        if(typeof onLoad === 'function')
          onLoad(null);
      }
    }else{
      if(typeof onLoad === 'function')
        onLoad(null);
    }
    
  }

  static GetSpawnLocation( creature = undefined ){
    if( creature instanceof ModuleCreature ){
      if( Game.isLoadingSave ){
        return new Game.Location(
          creature.getXPosition(), 
          creature.getYPosition(), 
          creature.getZPosition(),
          creature.getXOrientation(), 
          creature.getYOrientation(), 
          creature.getZOrientation()
        );
      }else if( Game.module.area.transWP ){
        if( Game.module.area.transWP ){
          console.log('TransWP - PM', Game.module.area.transWP);
        }
        let index = PartyManager.PortraitOrder.indexOf( creature.getPortraitResRef().toLowerCase() );
        let spawnLoc = Game.module.area.getSpawnLocation();
        let facing = -Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y);
        switch(index){
          case 0:
            return new Game.Location(
              spawnLoc.position.x,
              spawnLoc.position.y, 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z
            );
          case 1:
            return new Game.Location(
              spawnLoc.position.x + 1.5 * Math.cos(facing), 
              spawnLoc.position.y + 1.5 * Math.sin(facing), 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z
            );
          case 2:
            return new Game.Location(
              spawnLoc.position.x + -1.5 * Math.cos(facing), 
              spawnLoc.position.y + -1.5 * Math.sin(facing), 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z
            );
        }
      }else{
        let index = PartyManager.PortraitOrder.indexOf( creature.getPortraitResRef().toLowerCase() );
        let spawnLoc = Game.module.area.getSpawnLocation();
        let facing = spawnLoc.getFacing();
        switch(index){
          case 0:
            return new Game.Location(
              spawnLoc.position.x,
              spawnLoc.position.y, 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z,
            );
          case 1:
            return new Game.Location(
              spawnLoc.position.x + 1.5 * Math.cos(facing), 
              spawnLoc.position.y + 1.5 * Math.sin(facing), 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z,
            );
          case 2:
            return new Game.Location(
              spawnLoc.position.x + -1.5 * Math.cos(facing), 
              spawnLoc.position.y + -1.5 * Math.sin(facing), 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z,
            );
        }
      }
    }
    
    return Game.module.area.getSpawnLocation();

  }

  static GetFollowPosition(creature = null){

    //I think party following is FORMATION_LINE in the formations.2da

    let _targetOffset = 1.5;
    if(PartyManager.party.indexOf(creature) == 2){
      _targetOffset = -1.5;
    }

    let targetPos = PartyManager.party[0].position.clone().sub(
      new THREE.Vector3(
        _targetOffset*Math.cos(PartyManager.party[0].rotation.z), 
        _targetOffset*Math.sin(PartyManager.party[0].rotation.z), 
        0
      )
    );
    return Game.module.area.getNearestWalkablePoint(targetPos);
  }

  static GiveXP( amount = 0){

  }

  static async ExportPartyMemberTemplate( index = 0, template = undefined ){
    return new Promise( async (resolve, reject) => {
      if(template instanceof GFFObject){
        template.Export( path.join( CurrentGame.gameinprogress_dir, 'AVAILNPC'+index+'.utc') , () => {
          resolve();
        }, () => {
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  static async ExportPartyMemberTemplates(){
    return new Promise( async (resolve, reject) => {
      let maxPartyMembers = (app_profile.key == 'kotor') ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = PartyManager.NPCS[i];
        if(pm.template instanceof GFFObject){
          await PartyManager.ExportPartyMemberTemplate(i, pm.template);
        }
      }
      resolve();
    });
  }

}
PartyManager.Init();

PartyManager.party = [];
PartyManager.aiStyle = 0;

module.exports = PartyManager;