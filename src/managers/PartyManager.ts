/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameState } from "../GameState";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import * as path from "path";
import * as THREE from "three";
import EngineLocation from "../engine/EngineLocation";
import { CurrentGame } from "../CurrentGame";
import { TwoDAManager } from "./TwoDAManager";
import { TwoDAObject } from "../resource/TwoDAObject";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { ModuleCreature, ModuleObject, ModulePlayer } from "../module";
import { OdysseyModel3D } from "../three/odyssey";
import { PartyTableManager } from "./PartyTableManager";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { ResourceLoader } from "../loaders";

/* @file
 * The PartyManager class.
 */

export interface CurrentMember {
  isLeader: boolean,
  memberID: number
}

export interface PartyNPC {
  available: boolean;
  canSelect: boolean;
  spawned: boolean;
  template?: GFFObject;
  moduleObject?: ModuleCreature;
}

export interface PartyNPCList {
  [key: string]: PartyNPC;
}

export class PartyManager {

  static party: ModuleCreature[] = [];
  static aiStyle = 0;
  static PlayerTemplate: GFFObject;
  static Player: ModuleObject;
  static PortraitOrder: any[] = [];
  static MaxSize = 2;
  static NPCS: PartyNPCList = {
    0: {
      available: false,
      canSelect: false,
      spawned: false
    },
    1: {
      available: false,
      canSelect: false,
      spawned: false
    },
    2: {
      available: false,
      canSelect: false,
      spawned: false
    },
    3: {
      available: false,
      canSelect: false,
      spawned: false
    },
    4: {
      available: false,
      canSelect: false,
      spawned: false
    },
    5: {
      available: false,
      canSelect: false,
      spawned: false
    },
    6: {
      available: false,
      canSelect: false,
      spawned: false
    },
    7: {
      available: false,
      canSelect: false,
      spawned: false
    },
    8: {
      available: false,
      canSelect: false,
      spawned: false
    },
    9: {
      available: false,
      canSelect: false,
      spawned: false
    },
    10: {
      available: false,
      canSelect: false,
      spawned: false
    },
    11: {
      available: false,
      canSelect: false,
      spawned: false
    }
  }

  static Gold = 0;
  static CurrentMembers: CurrentMember[] = [];

  static Init(){

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
              //console.log('RemoveNPCById leaveInWorld', creature);
              GameState.group.party.remove(creature.model);
              GameState.group.creatures.add(creature.model);
              GameState.module.area.creatures.push(creature);
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

  static GetPortraitByIndex(nID = 0, onLoad?: Function){

    if(PartyManager.NPCS[nID].template instanceof GFFObject){
      let pm = PartyManager.NPCS[nID].template;
      if(pm.RootNode.HasField('PortraitId')){
        const portrait2DA = TwoDAManager.datatables.get('portraits');
        const portraitId = pm.RootNode.GetFieldByLabel('PortraitId').GetValue();
        if(portrait2DA.rows[portraitId]){
          return TwoDAManager.datatables.get('portraits').rows[portraitId].baseresref;
        }
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
    const portrait2DA = TwoDAManager.datatables.get('portraits');
    if(portrait2DA instanceof TwoDAObject){
      for(let i = 0, len = portrait2DA.RowCount; i < len; i++){
        if(portrait2DA.rows[i].baseresref.toLowerCase() == resref.toLowerCase()){
          return portrait2DA.rows[i];
        }
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

  static IsNPCInParty(nID: number){
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
  static AddAvailableNPCByTemplate(nID = 0, template: string|GFFObject = ''){
    if(typeof template === 'string'){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], template);
      if(buffer){
        PartyManager.NPCS[nID].available = true;
        PartyManager.NPCS[nID].canSelect = true;
        PartyManager.NPCS[nID].template = new GFFObject(buffer);
      }else{
        console.error('Failed to load character template');
      }
    }else if(template instanceof GFFObject){
      //We already have the template (From SAVEGAME)
      PartyManager.NPCS[nID].available = true;
      PartyManager.NPCS[nID].canSelect = true;
      PartyManager.NPCS[nID].template = template;
      return;
    }else{
      console.error('Failed to load character template');
      return;
    }
  }

  //Add a world creature to the list of Party Members and remove it from the creatures array
  static AddCreatureToParty(slot = 1, creature: ModuleCreature){
    if(creature instanceof ModuleCreature){
      PartyManager.NPCS[slot].available = true;
      //PartyManager.NPCS[nID].canSelect = true;
      PartyManager.NPCS[slot].template = creature.template;
      PartyManager.NPCS[slot].moduleObject = creature;
      //Add the creature to the party array
      PartyManager.party.push(creature);
      //Check to see if the creature needs to be removed from the creatures array
      let cIdx = GameState.module.area.creatures.indexOf(creature);
      if(cIdx > -1){
        GameState.module.area.creatures.splice(cIdx, 1);
      }
    }
  }

  static SwitchPlayerToPartyMember(nIdx = 0){
    let template: GFFObject = (nIdx == -1) ?
      PartyManager.PlayerTemplate : PartyManager.NPCS[nIdx].template;
    const partyMember = new ModuleCreature(template);
    const player = this.party[0];

    try{
      const spawn = player.position.clone();
      const quaternion = player.quaternion.clone();

      partyMember.partyID = 0;
      partyMember.Load();
      partyMember.position.copy(spawn);
      partyMember.quaternion.copy(quaternion);
      partyMember.LoadScripts();
      partyMember.LoadModel().then( (model: OdysseyModel3D) => {
        PartyManager.party[0] = partyMember;
        
        model.userData.moduleObject = partyMember;
        partyMember.position.copy(spawn);
        partyMember.quaternion.copy(quaternion);
        model.hasCollision = true;
        
        GameState.group.party.add( partyMember.container );
        player.destroy();
        PartyManager.Player = partyMember;
        partyMember.onSpawn();
      });
      return partyMember;
    }catch(e){
      console.error(e);
      return undefined;
    }
  }

  //Save the current party member templates
  static Save(){
    const npcs = PartyManager.party.filter( (pm) => pm.partyID >= 0 );
    for(let i = 0; i < npcs.length; i++){
      let pm = npcs[i];
      PartyManager.CurrentMembers[i] = {
        isLeader: i == 0 ? true : false,
        memberID: pm.partyID
      };
      PartyManager.SavePartyMember(pm.partyID);
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
  static GetCreatureStartingPartyIndex(creature: ModuleCreature){

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
  // static GetCreatureMemberDetails( creature: ModuleObject ){
  //   if(creature instanceof ModulePlayer){
  //     return undefined;
  //   }

  //   if(creature instanceof ModuleCreature){
  //     return PartyManager.CurrentMembers[ PartyManager.CurrentMembers.indexOf(creature.partyID) ]
  //   }

  //   return undefined;
  // }

  //Load the PartyMember by it's index in the CurrentMembers array.
  static LoadPartyMember(nIdx = 0, onLoad?: Function){
    let npc = PartyManager.NPCS[PartyManager.CurrentMembers[nIdx].memberID];
    let template = npc.template;
    let partyMember = new ModuleCreature(template);

    let currentSlot: ModuleCreature;//PartyManager.party[nIdx+1];

    if(nIdx == 0 || nIdx == 1){
      try{
        if(!(currentSlot instanceof ModuleCreature)){
          partyMember.id = ModuleObject.GetNextPlayerId();
          partyMember.partyID = PartyManager.CurrentMembers[nIdx].memberID;
          partyMember.Load();
            //PartyManager.party[nIdx+1] = partyMember;

            /*if(PartyManager.CurrentMembers[nIdx].isLeader){
              PartyManager.party.unshift(PartyManager.party.splice(nIdx+1, 1)[0]);
            }*/
            PartyManager.AddPortraitToOrder( partyMember.getPortraitResRef() );
            PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(partyMember) ] = partyMember;
            let spawn = PartyManager.GetSpawnLocation(partyMember);
            partyMember.position.copy(spawn.position);
            partyMember.setFacing(spawn.getFacing(), true);
            
            partyMember.LoadModel().then( (model: OdysseyModel3D) => {
              model.userData.moduleObject = partyMember;

              partyMember.position.copy(spawn.position);
              partyMember.setFacing(spawn.getFacing(), true);
              //partyMember.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
        
              model.hasCollision = true;
              GameState.group.party.add( partyMember.container );

              partyMember.onSpawn();
              if(typeof onLoad === 'function')
                onLoad();
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
  static LoadPartyMemberCreature(idx = 0, onLoad?: Function){
    let npc = PartyManager.NPCS[idx];
    if(npc){
      if(npc.template){
        let partyMember = new ModuleCreature(npc.template);
        partyMember.Load();
        partyMember.LoadModel().then( (model: OdysseyModel3D) => {
          model.userData.moduleObject = partyMember;
          partyMember.onSpawn();
          if(typeof onLoad === 'function')
            onLoad(partyMember);

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

  static GetSpawnLocation( creature: ModuleCreature ){
    if( creature instanceof ModuleCreature ){
      if( GameState.isLoadingSave ){
        return new EngineLocation(
          creature.position.x, 
          creature.position.y, 
          creature.position.z,
          creature.getXOrientation(), 
          creature.getYOrientation(), 
          creature.getZOrientation()
        );
      }else if( GameState.module.area.transWP ){
        if( GameState.module.area.transWP ){
          //console.log('TransWP - PM', GameState.module.area.transWP);
        }
        let index = PartyManager.PortraitOrder.indexOf( creature.getPortraitResRef().toLowerCase() );
        let spawnLoc = GameState.module.area.getSpawnLocation();
        let facing = -Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y);
        switch(index){
          case 0:
            return new EngineLocation(
              spawnLoc.position.x,
              spawnLoc.position.y, 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z
            );
          case 1:
            return new EngineLocation(
              spawnLoc.position.x + 1.5 * Math.cos(facing), 
              spawnLoc.position.y + 1.5 * Math.sin(facing), 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z
            );
          case 2:
            return new EngineLocation(
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
        let spawnLoc = GameState.module.area.getSpawnLocation();
        let facing = spawnLoc.getFacing();
        switch(index){
          case 0:
            return new EngineLocation(
              spawnLoc.position.x,
              spawnLoc.position.y, 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z,
            );
          case 1:
            return new EngineLocation(
              spawnLoc.position.x + 1.5 * Math.cos(facing), 
              spawnLoc.position.y + 1.5 * Math.sin(facing), 
              spawnLoc.position.z,
              spawnLoc.rotation.x,
              spawnLoc.rotation.y, 
              spawnLoc.rotation.z,
            );
          case 2:
            return new EngineLocation(
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
    
    return GameState.module.area.getSpawnLocation();

  }

  static GetFollowPosition(creature: ModuleCreature){

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
    if(GameState.module.area.isPointWalkable(targetPos)){
      return targetPos;
    }
    return GameState.module.area.getNearestWalkablePoint(targetPos);
  }

  static GiveXP( amount = 0){

  }

  static async ExportPartyMemberTemplate( index = 0, template: GFFObject ){
    return new Promise<void>( async (resolve, reject) => {
      if(template instanceof GFFObject){
        template.RemoveFieldByLabel('TemplateResRef');
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
    return new Promise<void>( async (resolve, reject) => {
      let maxPartyMembers = (ApplicationProfile.key == 'kotor') ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = PartyManager.NPCS[i];
        if(pm.template instanceof GFFObject){
          await PartyManager.ExportPartyMemberTemplate(i, pm.template);
        }
      }
      resolve();
    });
  }

  public static async SavePartyMember(index: number = 0){
    const pm = PartyManager.party.find( (pm) => pm.partyID == index );
    if(pm) pm.save();
    const npc = PartyManager.NPCS[index];
    if(npc){
      if(npc.template instanceof GFFObject){
        await PartyManager.ExportPartyMemberTemplate(index, npc.template);
      }
    }
  }

  public static GetNPCResRefById(nId: number){
    switch(nId){
      case 0:
        return 'p_bastilla'
      break;
      case 1:
        return 'p_cand'
      break;
      case 2:
        return 'p_carth'
      break;
      case 3:
        return 'p_hk47'
      break;
      case 4:
        return 'p_jolee'
      break;
      case 5:
        return 'p_juhani'
      break;
      case 6:
        return 'p_mission'
      break;
      case 7:
        return 'p_t3m4'
      break;
      case 8:
        return 'p_zaalbar'
      break;
    }
    return '';
  }

  public static ResetPlayerTemplate(): GFFObject {
    let pTPL = new GFFObject();

    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).SetValue(GameState.GameKey == 'TSL' ? 134 : 177);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).SetValue(GameState.GameKey == 'TSL' ? 'Leia Organa' : 'Luke Skywalker');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.INT, 'Age') ).SetValue(0);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).SetValue(10);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).SetValue(0);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).SetValue(0);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'FactionID') ).SetValue(0);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') ).SetValue(GameState.GameKey == 'TSL' ? 10 : 26);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'HitPoints') ).SetValue(100);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'MaxHitPoints') ).SetValue(100);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'CurrentHitPoints') ).SetValue(70);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'ForcePoints') ).SetValue(15);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'MaxForcePoints') ).SetValue(15);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Commandable') ).SetValue(1);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'CurrentForce') ).SetValue(10);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'DeadSelectable') ).SetValue(1);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'DetectMode') ).SetValue(1);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Disarmable') ).SetValue(1);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'IsDestroyable') ).SetValue(1);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'IsPC') ).SetValue(1);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'IsRaiseable') ).SetValue(1);
    let equipment = pTPL.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).SetValue('k_hen_attacked01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).SetValue('k_def_damage01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).SetValue('');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).SetValue('k_hen_dialogue01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).SetValue('');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).SetValue('');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).SetValue('k_hen_combend01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).SetValue('k_hen_heartbt01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).SetValue('k_def_blocked01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).SetValue('k_hen_percept01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).SetValue('');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).SetValue('k_hen_spawn01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).SetValue('k_def_spellat01');
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).SetValue('k_def_userdef01');

    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).SetValue(50);

    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).SetValue(0);

    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Con') ).SetValue(10);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Dex') ).SetValue(14);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Str') ).SetValue(10);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Wis') ).SetValue(10);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Cha') ).SetValue(10);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Int') ).SetValue(10);

    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'fortbonus') ).SetValue(0);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'refbonus') ).SetValue(0);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'willbonus') ).SetValue(0);

    pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') ).SetValue(12);

    let classList = pTPL.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ClassList') );
    for(let i = 0; i < 1; i++){
      let _class = new GFFStruct();
      _class.AddField( new GFFField(GFFDataType.INT, 'Class') ).SetValue(0);
      _class.AddField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).SetValue(1);
      _class.AddField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      classList.AddChildStruct(_class);
    }

    let skillList = pTPL.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SkillList') );

    for(let i = 0; i < 8; i++){
      let _skill = new GFFStruct();
      _skill.AddField( new GFFField(GFFDataType.RESREF, 'Rank') ).SetValue(0);
      skillList.AddChildStruct(_skill);
    }

    let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armorStruct.AddField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).SetValue('g_a_jedirobe01');
    let rhStruct = new GFFStruct(ModuleCreatureArmorSlot.RIGHTHAND);
    rhStruct.AddField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).SetValue('g_w_lghtsbr01');

    equipment.AddChildStruct( armorStruct );
    equipment.AddChildStruct( rhStruct );

    // SoundSetFile
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).SetValue(85);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Race') ).SetValue(6);

    /*let spawnLoc = this.getSpawnLocation();
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'XPosition') ).SetValue(spawnLoc.XPosition);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'YPosition') ).SetValue(spawnLoc.YPosition);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'ZPosition') ).SetValue(spawnLoc.ZPosition);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'XOrientation') ).SetValue(spawnLoc.XOrientation);
    pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'YOrientation') ).SetValue(spawnLoc.YOrientation);*/
    PartyManager.PlayerTemplate = pTPL;
    PartyManager.PlayerTemplate.json = PartyManager.PlayerTemplate.ToJSON();
    return PartyManager.PlayerTemplate;
  }

}
PartyManager.Init();
