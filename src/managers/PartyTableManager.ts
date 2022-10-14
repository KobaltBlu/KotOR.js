import { CurrentGame } from "../CurrentGame";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { Planetary } from "../Planetary";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { AsyncLoop } from "../utility/AsyncLoop";
import { PartyManager } from "./PartyManager";
import * as fs from "fs";
import * as path from "path";
import { TwoDAManager } from "./TwoDAManager";

export class PartyTableManager {

  constructor(gff: GFFObject, onLoad?: Function){

    if(gff instanceof GFFObject){
      if(gff.RootNode.HasField('GlxyMap')){
        let GlxyMap = gff.GetFieldByLabel('GlxyMap').GetChildStructs()[0];
        
        let planetCount = GlxyMap.GetFieldByLabel('GlxyMapNumPnts').GetValue();
        let planetBits = GlxyMap.GetFieldByLabel('GlxyMapPlntMsk').GetValue(); //Max 32?
        let currentPlanet = GlxyMap.GetFieldByLabel('GlxyMapSelPnt').GetValue();

        for(let i = 0; i < planetCount; i++){
          Planetary.SetPlanetAvailable(i,  (planetBits>>i) % 2 != 0);
        }

        Planetary.SetCurrentPlanet(currentPlanet);
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

      if(gff.RootNode.HasField('PT_TUT_WND_SHOWN')){
        let tutWindBytes = gff.RootNode.GetFieldByLabel('PT_TUT_WND_SHOWN').GetVoid();
        let maxBits = tutWindBytes.length * 8;
        for(let i = 0; i < maxBits; i++){
          for(let j = 0; j < 8; j++){
            let bit = (tutWindBytes[i] >> j) & 1;
            GameState.TutorialWindowTracker[ (i * 8) + j ] = bit;
          }
        }
      }
    
      if(gff.RootNode.HasField('PT_AVAIL_NPCS')){
        let avail = gff.GetFieldByLabel('PT_AVAIL_NPCS').GetChildStructs();
        for(let i = 0; i < avail.length; i++){
          //console.log(PartyManager.NPCS[i]);
          PartyManager.NPCS[i].available = avail[i].GetFieldByLabel('PT_NPC_AVAIL').GetValue();
          PartyManager.NPCS[i].canSelect = avail[i].GetFieldByLabel('PT_NPC_SELECT').GetValue();
        }
      }

      PartyManager.Gold = gff.RootNode.GetFieldByLabel('PT_GOLD').GetValue();

      //console.log('PT_CONTROLLED_NP', gff.RootNode.GetFieldByLabel('PT_CONTROLLED_NP').GetValue());

      if(gff.RootNode.HasField('PT_MEMBERS')){
        let pms = gff.GetFieldByLabel('PT_MEMBERS').GetChildStructs();
        let currentPartyInfo = [];
        PartyManager.CurrentMembers = [];
        for(let i = 0; i < pms.length; i++){
          PartyManager.CurrentMembers.push({
            isLeader: pms[i].GetFieldByLabel('PT_IS_LEADER').GetValue() ? true : false,
            memberID: pms[i].GetFieldByLabel('PT_MEMBER_ID').GetValue()
          })
        }
        //console.log('PartyTableManager', 'Loading Party Templates')
        let ptLoader = new AsyncLoop({
          array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          onLoop: (id: number, asyncLoop: AsyncLoop) => {
            fs.readFile( path.join( CurrentGame.gameinprogress_dir, 'availnpc'+id+'.utc'), (error, pm) => {
              PartyManager.NPCS[id].template = null;
              if(!error){
                if(pm.length){
                  PartyManager.NPCS[id].template = new GFFObject(pm);
                }
              }
              asyncLoop.next();
            });
          }
        });
        ptLoader.iterate( () => {
          if(typeof onLoad == 'function')
            onLoad();
        });

      }
    }else{
      console.error('PartyTableManager', 'gff', gff);
      throw 'PartyTableManager expected gff to be of type GFFObject';
    }

  }

  static export(directory = '', onSave?: Function){
    return new Promise<void>( (resolve, reject) => {
      //Export PARTYTABLE.res
      let partytable = new GFFObject();
      partytable.FileType = 'PT  ';
      partytable.RootNode.AddField(new GFFField(GFFDataType.STRUCT, 'GlxyMap')).AddChildStruct( Planetary.SaveStruct() );
      partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'JNL_Entries'));

      //TODO: Journal Entries

      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'JNL_SortOrder')).SetValue(0);
      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_AISTATE')).SetValue(0);
      let availNPCSList = partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_AVAIL_NPCS'));

      //TODO: Party Available NPCS
      let maxPartyMembers = (ApplicationProfile.key == 'kotor') ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = PartyManager.NPCS[i];
        let availStruct = new GFFStruct();
        availStruct.AddField( new GFFField(GFFDataType.BYTE, 'PT_NPC_AVAIL') ).SetValue(pm.available ? 1 : 0);
        availStruct.AddField( new GFFField(GFFDataType.BYTE, 'PT_NPC_SELECT') ).SetValue(pm.canSelect ? 1 : 0);
        availNPCSList.AddChildStruct(availStruct);
      }

      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_CHEAT_USED')).SetValue(0);
      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_CONTROLLED_NP')).SetValue( GameState.getCurrentPlayer() == GameState.player ? -1 : PartyManager.party.indexOf(GameState.getCurrentPlayer()) );
      partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_COST_MULT_LIS'));

      //TODO: COST MULT LIST

      partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_DLG_MSG_LIST'));

      //TODO: Dialog Messages LIST

      partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_FB_MSG_LIST'));

      //TODO: Feedback Messages LIST

      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_FOLLOWSTATE')).SetValue(0);
      partytable.RootNode.AddField(new GFFField(GFFDataType.DWORD, 'PT_GOLD')).SetValue(PartyManager.Gold);
      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_LAST_GUI_PNL')).SetValue(0);
      let ptMembersList = partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_MEMBERS'));

      let numMembers = 0;
      for(let i = 0; i < PartyManager.party.length; i++){
        let member = PartyManager.party[i];
        if(member != GameState.player){
          let memberStruct = new GFFStruct();
          memberStruct.AddField( new GFFField(GFFDataType.BYTE, 'PT_IS_LEADER') ).SetValue( GameState.getCurrentPlayer() == member ? 1 : 0 );
          memberStruct.AddField( new GFFField(GFFDataType.INT, 'PT_MEMBER_ID') ).SetValue( member.partyID );
          ptMembersList.AddChildStruct( memberStruct );
          numMembers++;
        }
      }

      partytable.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'PT_NUM_MEMBERS')).SetValue(numMembers);
      partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_PAZAAKCARDS'));

      //TODO: Pazaak Cards LIST

      partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_PAZSIDELIST'));

      //TODO: Pazaak Side LIST

      partytable.RootNode.AddField(new GFFField(GFFDataType.DWORD, 'PT_PLAYEDSECONDS')).SetValue(0);
      partytable.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'PT_SOLOMODE')).SetValue(0);

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
        partytable.RootNode.AddField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).SetData(buffer);
      }else{
        partytable.RootNode.AddField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).SetData(Buffer.alloc(0));
      }

      partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_XP_POOL'));

      partytable.FileType = 'PT  ';
      partytable.Export(path.join(directory, 'PARTYTABLE.res'), () => {

        if(typeof onSave == 'function')
          onSave();

        resolve();
      }, () => {
        reject();
      });
    });
  }

}
