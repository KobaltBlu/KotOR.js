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
        canSelect: 0
      },
      1: {
        available: 0,
        canSelect: 0
      },
      2: {
        available: 0,
        canSelect: 0
      },
      3: {
        available: 0,
        canSelect: 0
      },
      4: {
        available: 0,
        canSelect: 0
      },
      5: {
        available: 0,
        canSelect: 0
      },
      6: {
        available: 0,
        canSelect: 0
      },
      7: {
        available: 0,
        canSelect: 0
      },
      8: {
        available: 0,
        canSelect: 0
      },
      9: {
        available: 0,
        canSelect: 0
      },
      10: {
        available: 0,
        canSelect: 0
      },
      11: {
        available: 0,
        canSelect: 0
      }
    }

    PartyManager.CurrentMembers = [];

  }

  

  static RemoveNPCById(nID = 0){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      let mem = PartyManager.CurrentMembers[i];
      if(mem.memberID == nID){

        //Remove the partymember from the module
        for(let j = 0; j < PartyManager.party.length; j++){
          if(PartyManager.party[j].partyID == nID){
            let creature = PartyManager.party[j];
            creature.destroy();
            PartyManager.party.splice(j, 1);
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
        ResType: UTCObject.ResType,
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

  static SwitchPlayerToPartyMember(nIdx = 0, onLoad = null){
    let template = undefined;

    if(nIdx == -1){
      template = PartyManager.Player;
    }else{
      template = PartyManager.NPCS[nIdx].template;
    }

    let partyMember = new ModuleCreature(template);

    try{

      let spawn = Game.player.model.position.clone();
      let quaternion = Game.player.model.quaternion.clone();

      partyMember.partyID = 0;
      partyMember.Load( () => {
        partyMember.LoadScripts( () => {
          partyMember.LoadModel( (model) => {
            PartyManager.party[0] = partyMember;
            
            model.box = new THREE.Box3().setFromObject(model);
            model.moduleObject = partyMember;
            model.translateX(spawn.x);
            model.translateY(spawn.y);
            model.translateZ(spawn.z);
            model.quaternion.copy(quaternion);
      
            model.hasCollision = true;
            //model.buildSkeleton();
            Game.group.party.add( model );
            Game.player.destroy();
            Game.player = partyMember;

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
    let template = PartyManager.NPCS[PartyManager.CurrentMembers[nIdx].memberID].template;
    let partyMember = new ModuleCreature(template);

    let currentSlot = PartyManager.party[nIdx+1];

    if(nIdx <= 1){
      try{
        if(!(currentSlot instanceof ModuleCreature)){
          partyMember.partyID = PartyManager.CurrentMembers[nIdx].memberID;
          partyMember.Load( () => {
            PartyManager.party[nIdx+1] = partyMember;
            partyMember.LoadScripts( () => {
              partyMember.LoadModel( (model) => {
                let spawn = PartyManager.GetFollowPosition(partyMember);
                model.box = new THREE.Box3().setFromObject(model);
                model.moduleObject = partyMember;

                partyMember.position.x = spawn.x;
                partyMember.position.y = spawn.y;
                partyMember.position.z = spawn.z;
                partyMember.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
          
                model.hasCollision = true;
                //model.buildSkeleton();
                Game.group.party.add( model );

                //The follow leader action will be controlled by the heartbeat script when it is implemented
                //partyMember.actionQueue.push({object: Game.player, goal: ModuleCreature.ACTION.FOLLOWLEADER});

                if(typeof onLoad === 'function')
                  onLoad();

              });
            });
          });
        }else{
          let spawn = PartyManager.GetFollowPosition(currentSlot);
          currentSlot.position.x = spawn.x;
          currentSlot.position.y = spawn.y;
          currentSlot.position.z = spawn.z;
          currentSlot.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
          if(typeof onLoad === 'function')
            onLoad();
        }
      }catch(e){
        console.error(e);
        if(typeof onLoad === 'function')
          onLoad();
      }
    }else{
      console.error(e);
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  static GetFollowPosition(creature = null){
    let _targetOffset = -1.5;
    if(PartyManager.party.indexOf(creature) == 2){
      _targetOffset = 1.5;
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


module.exports = PartyManager;