class PartyTableManager {

  constructor(gff = undefined, onLoad = undefined){

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

      if(gff.RootNode.HasField('PT_TUT_WND_SHOWN')){
        let tutWindBytes = gff.RootNode.GetFieldByLabel('PT_TUT_WND_SHOWN').GetVoid();
        let maxBits = tutWindBytes.length * 8;
        for(let i = 0; i < maxBits; i++){
          for(let j = 0; j < 8; j++){
            let bit = (tutWindBytes[i] >> j) & 1;
            Game.TutorialWindowTracker[ (i * 8) + j ] = bit;
          }
        }
      }
    
      if(gff.RootNode.HasField('PT_AVAIL_NPCS')){
        let avail = gff.GetFieldByLabel('PT_AVAIL_NPCS').GetChildStructs();
        for(let i = 0; i < avail.length; i++){
          console.log(PartyManager.NPCS[i]);
          PartyManager.NPCS[i].available = avail[i].GetFieldByLabel('PT_NPC_AVAIL').GetValue();
          PartyManager.NPCS[i].canSelect = avail[i].GetFieldByLabel('PT_NPC_SELECT').GetValue();
        }
      }

      PartyManager.Gold = gff.RootNode.GetFieldByLabel('PT_GOLD').GetValue();

      console.log('PT_CONTROLLED_NP', gff.RootNode.GetFieldByLabel('PT_CONTROLLED_NP').GetValue());

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
        console.log('PartyTableManager', 'Loading Party Templates')
        let ptLoader = new AsyncLoop({
          array: [0, 1, 2, 3, 4, 5, 6, 7, 8],
          onLoop: (id, asyncLoop) => {
            Game.SaveGame.SAVEGAME.getRawResource('availnpc'+id, ResourceTypes.utc, (pm) => {
              PartyManager.NPCS[id].template = null;
              if(pm.length){
                PartyManager.NPCS[id].template = new GFFObject(pm);
              }
              asyncLoop._Loop();
            });
          }
        });
        ptLoader.Begin( () => {
          if(typeof onLoad == 'function')
            onLoad();
        });

      }
    }else{
      console.error('PartyTableManager', 'gff', gff);
      throw 'PartyTableManager expected gff to be of type GFFObject';
    }

  }

  export(directory = '', onSave = undefined){
    //Export PARTYTABLE.res
    let partytable = new GFFObject();
    partytable.RootNode.AddField(new Field(GFFDataTypes.STRUCT, 'GlxyMap'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'JNL_Entries'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'JNL_SortOrder'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_AISTATE'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_AVAIL_NPCS'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_CHEAT_USED'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_CONTROLLED_NP'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_COST_MULT_LIS'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_DLG_MSG_LIST'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_FB_MSG_LIST'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_FOLLOWSTATE'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.DWORD, 'PT_GOLD'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_LAST_GUI_PNL'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_MEMBERS'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'PT_NUM_MEMBERS'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_PAZAAKCARDS'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_PAZSIDELIST'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.DWORD, 'PT_PLAYEDSECONDS'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'PT_SOLOMODE'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'PT_TUT_WND_SHOWN'));
    partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_XP_POOL'));

    partytable.FileType = 'PT  ';
    partytable.Export(path.join(directory, 'PARTYTABLE.res'), () => {

      if(typeof onSave == 'function')
        onSave();

    });
  }

}

module.exports = PartyTableManager;