/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The PartyManager class.
 */

class PartyManager {

  static Init(){
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

            if(leaveInWorld){
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

  static RemoveAvailableNPC(nID = 0){
    PartyManager.NPCS[nID].available = false;
    PartyManager.NPCS[nID].canSelect = false;
    delete PartyManager.NPCS[nID].template;
  }

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

  static LoadPartyMember(nIdx = 0, onLoad = null){
    let npc = PartyManager.NPCS[PartyManager.CurrentMembers[nIdx].memberID];
    let template = npc.template;
    let partyMember = new ModuleCreature(template);

    let currentSlot = PartyManager.party[nIdx+1];

    if(nIdx <= 1){
      try{
        if(!(currentSlot instanceof ModuleCreature)){
          partyMember.id = ModuleObject.GetNextPlayerId();
          partyMember.partyID = PartyManager.CurrentMembers[nIdx].memberID;
          partyMember.Load( () => {
            PartyManager.party[nIdx+1] = partyMember;

            if(PartyManager.CurrentMembers[nIdx].isLeader){
              PartyManager.party.unshift(PartyManager.party.splice(nIdx+1, 1)[0]);
            }

            partyMember.LoadScripts( () => {
              partyMember.LoadModel( (model) => {
                let spawn = PartyManager.GetSpawnLocation(partyMember);
                model.box = new THREE.Box3().setFromObject(model);
                model.moduleObject = partyMember;

                partyMember.position.copy(spawn);
                partyMember.setFacing(Game.player.GetFacing(), true);
                //partyMember.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
          
                model.hasCollision = true;
                //model.buildSkeleton();
                Game.group.party.add( model );

                //The follow leader action will be controlled by the heartbeat script when it is implemented
                //partyMember.actionQueue.push({object: Game.player, goal: ModuleCreature.ACTION.FOLLOWLEADER});
                partyMember.onSpawn();
                if(typeof onLoad === 'function')
                  onLoad();

              });
            });
          });
        }else{
          let spawn = PartyManager.GetSpawnLocation(currentSlot);
          currentSlot.position.copy(spawn);
          currentSlot.setFacing(Game.player.GetFacing(), true);
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

  static GetSpawnLocation(creature = undefined){
    if(creature instanceof ModuleCreature){
      if(Game.isLoadingSave){
        return new THREE.Vector3(
          creature.getXPosition(), 
          creature.getYPosition(), 
          creature.getZPosition()
        )
      }else if(Game.module.area.transWP){
        console.log('TransWP - PM', Game.module.area.transWP);
        return new THREE.Vector3(
          Game.module.area.transWP.RootNode.GetFieldByLabel('XPosition').GetValue(),
          Game.module.area.transWP.RootNode.GetFieldByLabel('YPosition').GetValue(),
          Game.module.area.transWP.RootNode.GetFieldByLabel('ZPosition').GetValue()
        );
      }else{
        let _targetOffset = 1.5;
        if(PartyManager.party.indexOf(creature) == 2){
          _targetOffset = -1.5;
        }

        let spawnLoc = Game.module.area.getSpawnLocation();

        let targetPos = new THREE.Vector3(spawnLoc.XPosition, spawnLoc.YPosition, spawnLoc.ZPosition).sub(
          new THREE.Vector3(
            _targetOffset*Math.cos(PartyManager.party[0].rotation.z), 
            _targetOffset*Math.sin(PartyManager.party[0].rotation.z), 
            0
          )
        );
        return targetPos;
      }
    }

    return new THREE.Vector3(0, 0, 0);

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
    return targetPos;
  }

}
PartyManager.Init();

PartyManager.party = [];
PartyManager.aiStyle = 0;

module.exports = PartyManager;