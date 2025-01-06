import { GameState } from "../GameState";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import * as path from "path";
import * as THREE from "three";
import EngineLocation from "../engine/EngineLocation";
import { CurrentGame } from "../CurrentGame";
import { TwoDAObject } from "../resource/TwoDAObject";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { ModuleCreature } from "../module/ModuleCreature";
import { OdysseyModel3D } from "../three/odyssey";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { ResourceLoader } from "../loaders";
import { GameEngineType } from "../enums/engine";
import { PartyManagerEvent } from "../types/PartyManagerEvent";
import { ModulePlayer } from "../module/ModulePlayer";
import { GameFileSystem } from "../utility/GameFileSystem";
import { JournalEntry } from "../engine/JournalEntry";
import { DialogMessageEntry } from "../engine/DialogMessageEntry";
import { FeedbackMessageEntry } from "../engine/FeedbackMessageEntry";

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

export interface PartyPuppet {
  available: boolean;
  select: boolean;
}

export interface PartyPuppetList {
  [key: string]: PartyPuppet;
}

/**
 * PartyManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PartyManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PartyManager {

  static partyTableTemplate: GFFObject;

  static party: ModuleCreature[] = [];
  static aiStyle = 0;

  /**
   * Current Player Creature (Can be overridden by with an NPC)
   * This object will be stored in the Module's PlayList on Save
   */
  static Player: ModuleCreature;
  static PlayerTemplate: GFFObject;

  /**
   * Actual Player Creature (This is the player create that was created by the player)
   * If Player is not Equal to ActualPlayer export pc.utc on Save
   */
  // static ActualPlayer: ModulePlayer;
  static ActualPlayerTemplate: GFFObject;

  static PortraitOrder: any[] = [];
  static MaxSize = 3;
  static MaxNPCCount = 2;
  static MaxPartyCount = 12;
  static NPCS: PartyNPCList = {};

  static Puppets: PartyPuppetList = {};

  static PuppetCount: number = 0;
  static MaxPuppetCount = 3;

  static Gold = 0;
  static CurrentMembers: CurrentMember[] = [];

  static InfluenceMap: Map<number, number> = new Map<number, number>();
  static ChemicalCount: number = 0;
  static ComponentCount: number = 0;

  static SwoopUpgrade1: number = -1;
  static SwoopUpgrade2: number = -1;
  static SwoopUpgrade3: number = -1;

  static #eventListeners: Map<PartyManagerEvent, Function[]> = new Map();

  static async Load(gff: GFFObject){
    if(!(gff instanceof GFFObject)){
      console.error('PartyManager.Load', gff);
      throw 'PartyManager expected gff to be of type GFFObject';
    }

    PartyManager.partyTableTemplate = gff;

    PartyManager.MaxPartyCount = GameState.GameKey == GameEngineType.TSL ? 12 : 9;
    PartyManager.MaxPuppetCount = GameState.GameKey == GameEngineType.TSL ? 3 : 0;
    
    for(let i = 0; i < PartyManager.MaxPartyCount; i++){
      GameState.PartyManager.InfluenceMap.set(i, -1);
      GameState.PartyManager.NPCS[i] = {
        available: false,
        canSelect: false,
        spawned: false
      };
    }

    for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
      GameState.PartyManager.Puppets[i] = {
        available: false,
        select: true
      };
    }

    if(gff.RootNode.hasField('GlxyMap')){
      let GlxyMap = gff.getFieldByLabel('GlxyMap').getChildStructs()[0];
      
      let planetCount = GlxyMap.getFieldByLabel('GlxyMapNumPnts').getValue();
      let planetBits = GlxyMap.getFieldByLabel('GlxyMapPlntMsk').getValue(); //Max 32?
      let currentPlanet = GlxyMap.getFieldByLabel('GlxyMapSelPnt').getValue();

      for(let i = 0; i < planetCount; i++){
        GameState.Planetary.SetPlanetAvailable(i,  !!((planetBits>>i) & 0x01));
      }

      GameState.Planetary.SetSelectedPlanet(currentPlanet);
    }

    //Init the TutorialWindowTracker      
    const tutorial2DA = GameState.TwoDAManager.datatables.get('tutorial');
    let bitCount = 0;
    if(tutorial2DA){
      bitCount = Math.ceil(tutorial2DA.RowCount / 8) * 8;
      for(let i = 0; i < bitCount; i++){
        GameState.TutorialWindowTracker[i] = 0;
      }
    }

    if(gff.RootNode.hasField('PT_TUT_WND_SHOWN')){
      let tutWindBytes = gff.RootNode.getFieldByLabel('PT_TUT_WND_SHOWN').getVoid();
      let maxBits = tutWindBytes.length * 8;
      for(let i = 0; i < maxBits; i++){
        for(let j = 0; j < 8; j++){
          let bit = (tutWindBytes[i] >> j) & 1;
          GameState.TutorialWindowTracker[ (i * 8) + j ] = bit;
        }
      }
    }
  
    if(gff.RootNode.hasField('PT_AVAIL_NPCS')){
      let avail = gff.getFieldByLabel('PT_AVAIL_NPCS').getChildStructs();
      for(let i = 0; i < avail.length; i++){
        //console.log(PartyManager.NPCS[i]);
        GameState.PartyManager.NPCS[i].available = avail[i].getFieldByLabel('PT_NPC_AVAIL').getValue();
        GameState.PartyManager.NPCS[i].canSelect = avail[i].getFieldByLabel('PT_NPC_SELECT').getValue();
      }
    }
  
    //TSL: PT_AVAIL_PUPS
    if(gff.RootNode.hasField('PT_AVAIL_PUPS')){
      let avail = gff.getFieldByLabel('PT_AVAIL_PUPS').getChildStructs();
      for(let i = 0; i < avail.length; i++){
        GameState.PartyManager.Puppets[i].available = !!avail[i].getFieldByLabel('PT_PUP_AVAIL').getValue();
        GameState.PartyManager.Puppets[i].select = !!avail[i].getFieldByLabel('PT_PUP_SELECT').getValue();
      }
    }

    //TSL: PT_ITEM_CHEMICAL
    if(gff.RootNode.hasField('PT_ITEM_CHEMICAL')){
      GameState.PartyManager.ChemicalCount = gff.RootNode.getFieldByLabel('PT_ITEM_CHEMICAL').getValue();
    }

    //TSL: PT_ITEM_COMPONEN
    if(gff.RootNode.hasField('PT_ITEM_COMPONEN')){
      GameState.PartyManager.ComponentCount = gff.RootNode.getFieldByLabel('PT_ITEM_COMPONEN').getValue();
    }
  
    //TSL: PT_AVAIL_PUPS
    if(gff.RootNode.hasField('PT_INFLUENCE')){
      const list = gff.getFieldByLabel('PT_INFLUENCE').getChildStructs();
      for(let i = 0; i < list.length; i++){
        GameState.PartyManager.InfluenceMap.set(i, list[i].getFieldByLabel('PT_NPC_INFLUENCE').getValue());
      }
    }
  
    //TSL: PT_AVAIL_PUPS
    if(gff.RootNode.hasField('PT_PUPPETS')){
      const list = gff.getFieldByLabel('PT_PUPPETS').getChildStructs();
      for(let i = 0; i < list.length; i++){
        //todo
      }
    }

    GameState.PartyManager.Gold = gff.RootNode.getFieldByLabel('PT_GOLD').getValue();

    if(gff.RootNode.hasField('PT_CONTROLLED_NP')){
      console.log('PT_CONTROLLED_NP', gff.RootNode.getFieldByLabel('PT_CONTROLLED_NP').getValue());
    }

    if(gff.RootNode.hasField('PT_MEMBERS')){
      let pms = gff.getFieldByLabel('PT_MEMBERS').getChildStructs();
      let currentPartyInfo = [];
      GameState.PartyManager.CurrentMembers = [];
      for(let i = 0; i < pms.length; i++){
        GameState.PartyManager.CurrentMembers.push({
          isLeader: pms[i].getFieldByLabel('PT_IS_LEADER').getValue() ? true : false,
          memberID: pms[i].getFieldByLabel('PT_MEMBER_ID').getValue()
        })
      }
    }

    if(gff.RootNode.hasField('JNL_Entries')){
      const entries = gff.RootNode.getFieldByLabel('JNL_Entries').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        GameState.JournalManager.AddEntry(JournalEntry.FromStruct(entries[i]));
      }
    }

    if(gff.RootNode.hasField('PT_DLG_MSG_LIST')){
      const entries = gff.RootNode.getFieldByLabel('PT_DLG_MSG_LIST').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        GameState.DialogMessageManager.AddEntry(DialogMessageEntry.FromStruct(entries[i]));
      }
    }

    if(gff.RootNode.hasField('PT_FB_MSG_LIST')){
      const entries = gff.RootNode.getFieldByLabel('PT_FB_MSG_LIST').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        GameState.FeedbackMessageManager.AddEntry(FeedbackMessageEntry.FromStruct(entries[i]));
      }
    }

    for(let i = 0; i < PartyManager.MaxPartyCount; i++){
      const id = i;
      try{
        const buffer = await GameFileSystem.readFile( path.join( CurrentGame.gameinprogress_dir, 'availnpc'+id+'.utc') );
        GameState.PartyManager.NPCS[id].template = null;
        if(buffer.length){
          GameState.PartyManager.NPCS[id].template = new GFFObject(buffer);
        }
      }catch(e){
        console.log(e);
      }
    }
  }

  static async Export(directory = ''){
    return new Promise<void>( (resolve, reject) => {
      //Export PARTYTABLE.res
      let partytable = new GFFObject();
      partytable.FileType = 'PT  ';
      partytable.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'GlxyMap')).addChildStruct( GameState.Planetary.SaveStruct() );
      const jnl_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'JNL_Entries'));

      for(let i = 0; i <  GameState.JournalManager.Entries.length; i++){
        jnl_list.addChildStruct(
          GameState.JournalManager.Entries[i].toStruct()
        );
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'JNL_SortOrder')).setValue(0);
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_AISTATE')).setValue(0);
      let availNPCSList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_AVAIL_NPCS'));

      //TODO: Party Available NPCS
      let maxPartyMembers = (GameState.GameKey == GameEngineType.KOTOR) ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = GameState.PartyManager.NPCS[i];
        let availStruct = new GFFStruct();
        availStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_NPC_AVAIL') ).setValue(pm.available ? 1 : 0);
        availStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_NPC_SELECT') ).setValue(pm.canSelect ? 1 : 0);
        availNPCSList.addChildStruct(availStruct);
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CHEAT_USED')).setValue(0);
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CONTROLLED_NP')).setValue( GameState.getCurrentPlayer() == GameState.PartyManager.Player ? -1 : GameState.PartyManager.party.indexOf(GameState.getCurrentPlayer()) );
      partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_COST_MULT_LIS'));

      //TODO: COST MULT LIST

      const dlg_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_DLG_MSG_LIST'));

      for(let i = 0; i <  GameState.DialogMessageManager.Entries.length; i++){
        dlg_list.addChildStruct(
          GameState.DialogMessageManager.Entries[i].toStruct()
        );
      }

      const fb_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_FB_MSG_LIST'));

      for(let i = 0; i <  GameState.FeedbackMessageManager.Entries.length; i++){
        fb_list.addChildStruct(
          GameState.FeedbackMessageManager.Entries[i].toStruct()
        );
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_FOLLOWSTATE')).setValue(0);
      partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_GOLD')).setValue(GameState.PartyManager.Gold);
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_LAST_GUI_PNL')).setValue(0);
      let ptMembersList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_MEMBERS'));

      let numMembers = 0;
      for(let i = 0; i < GameState.PartyManager.party.length; i++){
        let member = GameState.PartyManager.party[i];
        if(member != GameState.PartyManager.Player){
          let memberStruct = new GFFStruct();
          memberStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_IS_LEADER') ).setValue( GameState.getCurrentPlayer() == member ? 1 : 0 );
          memberStruct.addField( new GFFField(GFFDataType.INT, 'PT_MEMBER_ID') ).setValue( member.npcId );
          ptMembersList.addChildStruct( memberStruct );
          numMembers++;
        }
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_NUM_MEMBERS')).setValue(numMembers);
      partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PAZAAKCARDS'));

      //TODO: Pazaak Cards LIST

      partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PAZSIDELIST'));

      //TODO: Pazaak Side LIST

      partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_PLAYEDSECONDS')).setValue(0);
      partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_SOLOMODE')).setValue(0);

      const tutorial2DA = GameState.TwoDAManager.datatables.get('tutorial');
      if(tutorial2DA){
        let byteCount = Math.ceil(tutorial2DA.RowCount / 8);
        let buffer = new Uint8Array(byteCount);
        for(let i = 0; i < byteCount; i++){
          let byte = 0;
          for(let j = 0; j < 8; j++){
            let offset = (8 * i) + j;
            let bit = GameState.TutorialWindowTracker[offset];
            if(bit){
              byte |= 1 << j;
            }
          }
          buffer[i] = byte;
        }
        partytable.RootNode.addField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).setData(buffer);
      }else{
        partytable.RootNode.addField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).setData(new Uint8Array(0));
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_XP_POOL'));

      partytable.FileType = 'PT  ';
      partytable.export(path.join(directory, 'PARTYTABLE.res'), () => {
        resolve();
      }, () => {
        reject();
      });
    });
  }

  static SwitchLeaderAtIndex(index: number = 0){
    index = Math.abs(index);

    if(index >= PartyManager.party.length){
      console.warn(`Index out of range: ${index}/${PartyManager.party.length}`);
      return;
    }

    if(index == 0){
      console.warn(`Party Member at index 0 is already the party leader.`);
      return PartyManager.party[0];
    }

    const pm = PartyManager.party.splice(index, 1)[0];
    PartyManager.party.unshift(pm);
    PartyManager.ProcessEventListener('change', [pm]);
    PartyManager.UpdateLeader();
    return pm;
  }

  static RemoveNPCById(nID = 0, leaveInWorld = false){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      let mem = PartyManager.CurrentMembers[i];
      if(mem.memberID == nID){

        //Remove the partymember from the module
        for(let j = 0; j < PartyManager.party.length; j++){
          if(PartyManager.party[j].npcId == nID){
            let creature = PartyManager.party[j];
            creature.isPM = false;
            PartyManager.party.splice(j, 1);
            PartyManager.RebuildPortraitOrder();

            if(!leaveInWorld){
              creature.destroy();
            }else{
              //console.log('RemoveNPCById leaveInWorld', creature);
              GameState.group.party.remove(creature.model);
              GameState.group.creatures.add(creature.model);
              GameState.module.area.attachObject(creature);
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
      if(pm.RootNode.hasField('PortraitId')){
        const portrait2DA = GameState.TwoDAManager.datatables.get('portraits');
        const portraitId = pm.RootNode.getFieldByLabel('PortraitId').getValue();
        if(portrait2DA.rows[portraitId]){
          return GameState.TwoDAManager.datatables.get('portraits').rows[portraitId].baseresref;
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
    const portrait2DA = GameState.TwoDAManager.datatables.get('portraits');
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
      creature.isPM = true;
      creature.clearAllActions();
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

  static SwitchPlayerCharacter(npcId = 0){
    let partyMember: ModuleCreature;
    if(npcId == -1){
      partyMember = new ModulePlayer(PartyManager.ActualPlayerTemplate);
      PartyManager.PlayerTemplate = PartyManager.ActualPlayerTemplate;
    }else{
      partyMember = new ModuleCreature(PartyManager.NPCS[npcId].template);
    }
     
    const oldPC = PartyManager.Player;
    PartyManager.Player = partyMember;

    if(PartyManager.Player.isPlayer && npcId >= 0){
      PartyManager.ActualPlayerTemplate = PartyManager.Player.save();
      CurrentGame.WriteFile('pc.utc', PartyManager.ActualPlayerTemplate.getExportBuffer());
    }

    try{
      const spawn = oldPC.position.clone();
      const quaternion = oldPC.quaternion.clone();

      partyMember.isPM = true;
      partyMember.isPC = 1;
      partyMember.npcId = npcId;
      partyMember.load();
      partyMember.clearAllActions();
      partyMember.position.copy(spawn);
      partyMember.quaternion.copy(quaternion);
      partyMember.loadScripts();
      partyMember.loadModel().then( (model: OdysseyModel3D) => {
        PartyManager.party[0] = partyMember;
        
        model.userData.moduleObject = partyMember;
        partyMember.position.copy(spawn);
        partyMember.quaternion.copy(quaternion);
        model.hasCollision = true;
        
        GameState.group.party.add( partyMember.container );
        oldPC.destroy();
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
    const npcs = PartyManager.party.filter( (pm) => pm.npcId >= 0 );
    for(let i = 0; i < npcs.length; i++){
      let pm = npcs[i];
      PartyManager.CurrentMembers[i] = {
        isLeader: i == 0 ? true : false,
        memberID: pm.npcId
      };
      PartyManager.SavePartyMember(pm.npcId);
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
      if(PartyManager.party[0].npcId == PartyManager.CurrentMembers[i].memberID){
        PartyManager.CurrentMembers[i].isLeader = true;
      }else{
        PartyManager.CurrentMembers[i].isLeader = false;
      }
    }

    PartyManager.RebuildPortraitOrder();

  }

  //Check to see if the current leader is a party member and not the player
  static IsPartyMemberLeader(){
    if(PartyManager.party[0].npcId >= 0){
      return true;
    }
    return false;
  }

  //Is the player character the leader of the party
  static IsPlayerPartyLeader(){
    return !PartyManager.IsPartyMemberLeader();
  }

  static GetPMByNPCId(npcId: number = -1){
    return PartyManager.party.find( (obj) => obj.npcId == npcId);
  }

  static MakePlayerLeader(swapWorldPositions: boolean = true){
    const idx = PartyManager.party.indexOf(PartyManager.Player);
    if(idx <= 0){ return; }

    const old_pm = PartyManager.party[0];
    const old_pm_pos = PartyManager.party[0].position.clone();
    const old_player_pos = PartyManager.Player.position.clone();
    PartyManager.SwitchLeaderAtIndex(idx);
    if(swapWorldPositions){
      PartyManager.Player.setPosition(old_pm_pos);
      old_pm.setPosition(old_player_pos);
    }
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
  //     return PartyManager.CurrentMembers[ PartyManager.CurrentMembers.indexOf(creature.npcId) ]
  //   }

  //   return undefined;
  // }

  //Load the PartyMember by it's index in the CurrentMembers array.
  static async LoadPartyMember(nIdx = 0){
    let npc = PartyManager.NPCS[PartyManager.CurrentMembers[nIdx].memberID];
    const template = npc.template;
    template.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( GameState.ModuleObjectManager.GetNextPlayerId() );
    let partyMember = new ModuleCreature(template);

    let currentSlot: ModuleCreature;//PartyManager.party[nIdx+1];

    if(nIdx == 0 || nIdx == 1){
      try{
        if(!(currentSlot instanceof ModuleCreature)){
          partyMember.isPM = true;
          partyMember.npcId = PartyManager.CurrentMembers[nIdx].memberID;
          partyMember.load();
          partyMember.clearAllActions();
          //PartyManager.party[nIdx+1] = partyMember;

          /*if(PartyManager.CurrentMembers[nIdx].isLeader){
            PartyManager.party.unshift(PartyManager.party.splice(nIdx+1, 1)[0]);
          }*/
          PartyManager.AddPortraitToOrder( partyMember.getPortraitResRef() );
          PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(partyMember) ] = partyMember;
          let spawn = PartyManager.GetSpawnLocation(partyMember);
          partyMember.position.copy(spawn.position);
          partyMember.setFacing(spawn.getFacing(), true);
          
          const model = await partyMember.loadModel();
          model.userData.moduleObject = partyMember;

          partyMember.position.copy(spawn.position);
          partyMember.setFacing(spawn.getFacing(), true);
          //partyMember.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
    
          model.hasCollision = true;
          GameState.group.party.add( partyMember.container );

          partyMember.onSpawn();
        }else{
          let spawn = PartyManager.GetSpawnLocation(currentSlot);
          currentSlot.position.copy(spawn.position);
          currentSlot.setFacing(spawn.getFacing(), true);
          //currentSlot.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(0, 0));
        }
      }catch(e){
        console.error(e);
      }
    }else{
      console.log('LoadPartyMember', 'Wrong index', nIdx, npc, partyMember);
    }
  }

  //Used in the TSL PartySelection menu to load creature for the 3D preview of the selected party member
  static LoadPartyMemberCreature(npcId = 0, onLoad?: Function){
    const npc = PartyManager.NPCS[npcId];
    if(!npc){
      if(typeof onLoad === 'function')
        onLoad(null);

      return;
    }

    if(!npc.template){
      if(typeof onLoad === 'function')
        onLoad(null);

      return;
    }
    
    const partyMember = new ModuleCreature(npc.template);
    partyMember.npcId = npcId;
    partyMember.isPM = true;
    partyMember.load();
    partyMember.clearAllActions();
    partyMember.loadModel().then( (model: OdysseyModel3D) => {
      model.userData.moduleObject = partyMember;
      partyMember.onSpawn();
      if(typeof onLoad === 'function')
        onLoad(partyMember);

    });
    
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

  static #tmpFollowPositionTarget = new THREE.Vector3();
  static #tmpFollowPosition = new THREE.Vector3();
  static GetFollowPosition(creature: ModuleCreature){

    //I think party following is FORMATION_LINE in the formations.2da

    const leader = PartyManager.party[0];
    const targetOffset = (PartyManager.party.indexOf(creature) == 2) ? -1.5 :1.5;

    this.#tmpFollowPositionTarget.set(
      targetOffset * Math.cos(leader.rotation.z), 
      targetOffset * Math.sin(leader.rotation.z), 
      0
    );
    this.#tmpFollowPosition.copy(leader.position).sub(this.#tmpFollowPositionTarget);

    return (creature.area.isPointWalkable(this.#tmpFollowPosition)) ?
      this.#tmpFollowPosition : creature.area.getNearestWalkablePoint(this.#tmpFollowPosition, creature.getHitDistance());
  }

  static GiveXP(nXP = 0){

  }

  static async ExportPartyMemberTemplate( index = 0, template: GFFObject ){
    if(!(template instanceof GFFObject)){ return; }
    template.removeFieldByLabel('TemplateResRef');
    await template.export( path.join( CurrentGame.gameinprogress_dir, 'AVAILNPC'+index+'.utc'));
  }

  static async ExportPartyMemberTemplates(){
    return new Promise<void>( async (resolve, reject) => {
      let maxPartyMembers = (GameState.GameKey == GameEngineType.KOTOR) ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = PartyManager.NPCS[i];
        if(!pm){
          console.warn(`ExportPartyMemberTemplates: Failed to export template for NPC at index [${i}]. pm was undefined.`);
          continue;
        }

        if(!(pm.template instanceof GFFObject)){
          console.warn(`ExportPartyMemberTemplates: Failed to export template for NPC at index [${i}]. template was not an instance of GFFObject`);
          continue;
        }

        await PartyManager.ExportPartyMemberTemplate(i, pm.template);
      }
      await PartyManager.ExportPlayerCharacter();
      resolve();
    });
  }

  static async ExportPlayerCharacter(){
    if(!GameState.PartyManager.ActualPlayerTemplate){ return; }
    const gff = GameState.PartyManager.ActualPlayerTemplate;
    await gff.export( path.join( CurrentGame.gameinprogress_dir, 'pc.utc'));
  }

  public static async SavePartyMember(npcId: number = 0){
    const pm = PartyManager.party.find( (pm) => pm.npcId == npcId );
    if(pm) pm.save();
    const npc = PartyManager.NPCS[npcId];
    if(!npc){ return; }
    if(npc.template instanceof GFFObject){
      await PartyManager.ExportPartyMemberTemplate(npcId, npc.template);
    }
  }

  public static GeneratePlayerTemplate(): GFFObject {
    let pTPL = new GFFObject();

    pTPL.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( GameState.ModuleObjectManager.GetNextPlayerId() );
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).setValue(GameState.GameKey == GameEngineType.TSL ? 134 : 177);
    pTPL.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).setValue(GameState.GameKey == GameEngineType.TSL ? 'Leia Organa' : 'Luke Skywalker');
    pTPL.RootNode.addField( new GFFField(GFFDataType.INT, 'Age') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'FactionID') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(GameState.GameKey == GameEngineType.TSL ? 10 : 26);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'HitPoints') ).setValue(100);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'MaxHitPoints') ).setValue(100);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'CurrentHitPoints') ).setValue(70);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'ForcePoints') ).setValue(15);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'MaxForcePoints') ).setValue(15);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'Commandable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'CurrentForce') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'DeadSelectable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'DetectMode') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'Disarmable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'IsDestroyable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'IsPC') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'IsRaiseable') ).setValue(1);
    let equipment = pTPL.RootNode.addField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).setValue('k_hen_attacked01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).setValue('k_def_damage01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).setValue('k_hen_dialogue01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).setValue('k_hen_combend01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).setValue('k_hen_heartbt01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).setValue('k_def_blocked01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).setValue('k_hen_percept01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).setValue('k_hen_spawn01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).setValue('k_def_spellat01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).setValue('k_def_userdef01');

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).setValue(50);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).setValue(0);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Con') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Dex') ).setValue(14);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Str') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wis') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cha') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Int') ).setValue(10);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'fortbonus') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'refbonus') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'willbonus') ).setValue(0);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') ).setValue(12);

    let classList = pTPL.RootNode.addField( new GFFField(GFFDataType.LIST, 'ClassList') );
    for(let i = 0; i < 1; i++){
      let _class = new GFFStruct();
      _class.addField( new GFFField(GFFDataType.INT, 'Class') ).setValue(0);
      _class.addField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).setValue(1);
      _class.addField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      classList.addChildStruct(_class);
    }

    let skillList = pTPL.RootNode.addField( new GFFField(GFFDataType.LIST, 'SkillList') );

    for(let i = 0; i < 8; i++){
      let _skill = new GFFStruct();
      _skill.addField( new GFFField(GFFDataType.RESREF, 'Rank') ).setValue(0);
      skillList.addChildStruct(_skill);
    }

    let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armorStruct.addField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).setValue('g_a_jedirobe01');
    let rhStruct = new GFFStruct(ModuleCreatureArmorSlot.RIGHTHAND);
    rhStruct.addField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).setValue('g_w_lghtsbr01');

    equipment.addChildStruct( armorStruct );
    equipment.addChildStruct( rhStruct );

    // SoundSetFile
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).setValue(85);
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Race') ).setValue(6);

    /*let spawnLoc = this.getSpawnLocation();
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'XPosition') ).setValue(spawnLoc.XPosition);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'YPosition') ).setValue(spawnLoc.YPosition);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'ZPosition') ).setValue(spawnLoc.ZPosition);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'XOrientation') ).setValue(spawnLoc.XOrientation);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'YOrientation') ).setValue(spawnLoc.YOrientation);*/
    PartyManager.PlayerTemplate = pTPL;
    PartyManager.PlayerTemplate.json = PartyManager.PlayerTemplate.toJSON();
    return PartyManager.PlayerTemplate;
  }

  static AddEventListener(type: PartyManagerEvent, cb: Function){
    if(typeof cb !== 'function'){ return; }

    const events: Function[] = PartyManager.#eventListeners.get(type) || [];
    if(events.indexOf(cb) === -1){
      events.push(cb);
    }

    if(!PartyManager.#eventListeners.has(type)){
      PartyManager.#eventListeners.set(type, events);
    }
  }

  static RemoveEventListener(type: PartyManagerEvent, cb: Function){
    if(!PartyManager.#eventListeners.has(type)){ return; }

    const events: Function[] = PartyManager.#eventListeners.get(type) || [];
    const idx = events.indexOf(cb);
    if(idx >= -1){
      events.splice(idx, 1);
    }
  }

  static ProcessEventListener(type: PartyManagerEvent, args: any[]){
    const events: Function[] = PartyManager.#eventListeners.get(type) || [];
    for(let i = 0; i < events.length; i++){
      events[i](...args);
    }
  }

}
