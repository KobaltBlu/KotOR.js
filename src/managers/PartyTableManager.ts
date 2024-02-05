import { CurrentGame } from "../CurrentGame";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { Planetary } from "../Planetary";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { AsyncLoop } from "../utility/AsyncLoop";
import * as path from "path";
import { TwoDAManager } from "./TwoDAManager";
import { GameFileSystem } from "../utility/GameFileSystem";
import { JournalEntry } from "../engine/JournalEntry";
import { DialogMessageEntry } from "../engine/DialogMessageEntry";
import { FeedbackMessageEntry } from "../engine/FeedbackMessageEntry";
import { GameEngineType } from "../enums";

/**
 * PartyTableManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PartyTableManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PartyTableManager {

  constructor(gff: GFFObject){

    if(GameState.GameKey == GameEngineType.TSL){
      const partyCount = 12;
      for(let i = 0; i < partyCount; i++){
        GameState.PartyManager.InfluenceMap.set(i, -1);
      }
    }else{
      const partyCount = 9;
      for(let i = 0; i < partyCount; i++){
        GameState.PartyManager.InfluenceMap.set(i, -1);
      }
    }

    if(gff instanceof GFFObject){
      if(gff.RootNode.hasField('GlxyMap')){
        let GlxyMap = gff.getFieldByLabel('GlxyMap').getChildStructs()[0];
        
        let planetCount = GlxyMap.getFieldByLabel('GlxyMapNumPnts').getValue();
        let planetBits = GlxyMap.getFieldByLabel('GlxyMapPlntMsk').getValue(); //Max 32?
        let currentPlanet = GlxyMap.getFieldByLabel('GlxyMapSelPnt').getValue();

        for(let i = 0; i < planetCount; i++){
          Planetary.SetPlanetAvailable(i,  (planetBits>>i) % 2 != 0);
        }

        Planetary.SetSelectedPlanet(currentPlanet);
      }

      //Init the TutorialWindowTracker      
      const tutorial2DA = TwoDAManager.datatables.get('tutorial');
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
    }else{
      console.error('PartyTableManager', 'gff', gff);
      throw 'PartyTableManager expected gff to be of type GFFObject';
    }

  }

  async Load(){
    //console.log('PartyTableManager', 'Loading Party Templates')
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for(let i = 0; i < arr.length; i++){
      const id = arr[i];
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

  static export(directory = '', onSave?: Function){
    return new Promise<void>( (resolve, reject) => {
      //Export PARTYTABLE.res
      let partytable = new GFFObject();
      partytable.FileType = 'PT  ';
      partytable.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'GlxyMap')).addChildStruct( Planetary.SaveStruct() );
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
      let maxPartyMembers = (ApplicationProfile.key == 'kotor') ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = GameState.PartyManager.NPCS[i];
        let availStruct = new GFFStruct();
        availStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_NPC_AVAIL') ).setValue(pm.available ? 1 : 0);
        availStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_NPC_SELECT') ).setValue(pm.canSelect ? 1 : 0);
        availNPCSList.addChildStruct(availStruct);
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CHEAT_USED')).setValue(0);
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CONTROLLED_NP')).setValue( GameState.getCurrentPlayer() == GameState.player ? -1 : GameState.PartyManager.party.indexOf(GameState.getCurrentPlayer()) );
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
        if(member != GameState.player){
          let memberStruct = new GFFStruct();
          memberStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_IS_LEADER') ).setValue( GameState.getCurrentPlayer() == member ? 1 : 0 );
          memberStruct.addField( new GFFField(GFFDataType.INT, 'PT_MEMBER_ID') ).setValue( member.partyID );
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

      const tutorial2DA = TwoDAManager.datatables.get('tutorial');
      if(tutorial2DA){
        let byteCount = Math.ceil(tutorial2DA.RowCount / 8);
        let buffer = Buffer.alloc(byteCount);
        for(let i = 0; i < byteCount; i++){
          let byte = 0;
          for(let j = 0; j < 8; j++){
            let offset = (8 * i) + j;
            let bit = GameState.TutorialWindowTracker[offset];
            if(bit){
              byte |= 1 << j;
            }
          }
          buffer.writeUInt8(byte, i);
        }
        partytable.RootNode.addField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).setData(buffer);
      }else{
        partytable.RootNode.addField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).setData(Buffer.alloc(0));
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_XP_POOL'));

      partytable.FileType = 'PT  ';
      partytable.export(path.join(directory, 'PARTYTABLE.res'), () => {

        if(typeof onSave == 'function')
          onSave();

        resolve();
      }, () => {
        reject();
      });
    });
  }

}
