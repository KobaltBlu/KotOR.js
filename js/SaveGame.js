/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The SaveGame class.
 */

class SaveGame {

  constructor(name = ''){

    this.folderName = name;
    this.directory = path.join(SaveGame.directory, this.folderName);
    this.isLoaded = false;

    this.savenfo = new GFFObject(path.join(this.directory, 'savenfo.res'), (savenfo) => {
      
    });
    this.thumbnail = null;
  }

  getAreaName(){
    if(this.savenfo.RootNode.HasField('AREANAME')){
      return this.savenfo.GetFieldByLabel('AREANAME').GetValue()
    }
    return '';
  }

  getLastModule(){
    if(this.savenfo.RootNode.HasField('LASTMODULE')){
      return this.savenfo.GetFieldByLabel('LASTMODULE').GetValue()
    }
    return null;
  }

  getSaveName(){
    if(this.savenfo.RootNode.HasField('SAVEGAMENAME')){
      return this.savenfo.GetFieldByLabel('SAVEGAMENAME').GetValue()
    }
    return '';
  }

  getFullName(){
    if(this.getSaveName() != ''){
      return this.folderName.split(' - ')[1] + ' - ' + this.getSaveName();
    }else{
      return this.folderName.split(' - ')[1];
    }
  }

  GetThumbnail( onLoad = null ){

    if(this.thumbnail == null){
      console.log(path.join(this.directory, 'Screen.tga'));
      TextureLoader.tgaLoader.load_local(
        path.join(this.directory, 'Screen.tga'),
        (texture) => {
          console.log(texture)
          this.thumbnail = texture;
          if(typeof onLoad === 'function'){
            onLoad(this.thumbnail);
          }
        },
        null,
        true
      )
    }else{
      if(typeof onLoad === 'function'){
        onLoad(this.thumbnail);
      }
    }

  }

  GetPortrait(nth = 0, onLoad = null){

    let name = '';

    if(this.savenfo.RootNode.HasField('PORTRAIT'+nth)){
      name = this.savenfo.RootNode.GetFieldByLabel(('PORTRAIT')+nth).GetValue();
    }
    if(name != ''){
      console.log(name)
      TextureLoader.Load(name, (texture) => {
        if(typeof onLoad === 'function'){
          onLoad(texture);
        }
      });
    }else{
      if(typeof onLoad === 'function'){
        onLoad(null);
      }
    }

  }

  Load( onLoad = null ){
    Game.isLoadingSave = true;
    Game.TutorialWindowTracker = [];

    try{
      Game.time = this.savenfo.GetFieldByLabel('TIMEPLAYED').GetValue();
    }catch(e){}

    this.globalVars = new GFFObject(path.join(this.directory, 'GLOBALVARS.res'), (globalVars) => {

      let catNum = new BinaryReader(globalVars.json.fields.ValNumber.value);
      for(let i = 0; i < globalVars.json.fields.CatNumber.structs.length; i++){
        let node = globalVars.json.fields.CatNumber.structs[i];
        Game.Globals.Number[node.fields.Name.value.toLowerCase()] = catNum.ReadByte();
      }

      let catBool = globalVars.json.fields.ValBoolean.value;
      let numBool = globalVars.json.fields.CatBoolean.structs.length;
      /*for(let i = 0; i < numBool; i++){
        let index = Math.round(Math.floor((i / 8.0)));
        let bit = Math.round(((i - index * 8)))
        let node = globalVars.json.fields.CatBoolean.structs[i];
        Game.Globals.Boolean[node.fields.Name.value.toLowerCase()] = (catBool[index] & bit) > 0;
      }*/

      let boolBytes = globalVars.RootNode.GetFieldByLabel('ValBoolean').GetVoid()
      let maxBits = boolBytes.length * 8;
      for(let i = 0; i < maxBits; i++){
        for(let j = 0; j < 8; j++){
          let index = (i * 8) + j;
          let bit = (boolBytes[i] >> 7-j) & 1; //reverse the bit index because of ENDIANS -_-
          
          let node = globalVars.json.fields.CatBoolean.structs[index];
          if(node){
            Game.Globals.Boolean[node.fields.Name.value.toLowerCase()] = bit;
          }
        }
      }

      for(let i = 0; i < globalVars.json.fields.CatString.structs.length; i++){
        let node = globalVars.json.fields.CatString.structs[i];
        Game.Globals.String[node.fields.Name.value] = globalVars.json.fields.ValString.structs[i].fields.String.value;
      }

      this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'), (sav) => {

        this.isLoaded = true;
        Game.SaveGame = this;

        this.SAVEGAME.getRawResource('inventory', 0, (d) => {
          this.inventory = new GFFObject(d);
          let invArr = this.inventory.RootNode.GetFieldByLabel('ItemList').GetChildStructs();

          let inventoryLoader = (i = 0, onLoad = null) => {
            if(i < invArr.length){
              InventoryManager.addItem(GFFObject.FromStruct(invArr[i]), () => {
                inventoryLoader(++i, onLoad);
              });
            }else{
              if(typeof onLoad === 'function')
                onLoad();
            }
          }
          inventoryLoader(0, () => {
            this.partytable = new GFFObject(path.join(this.directory, 'PARTYTABLE.res'), (partytable) => {

              if(partytable.RootNode.HasField('GlxyMap')){
                let GlxyMap = partytable.GetFieldByLabel('GlxyMap').GetChildStructs()[0];
                
                let planetCount = GlxyMap.GetFieldByLabel('GlxyMapNumPnts').GetValue();
                let planetBits = GlxyMap.GetFieldByLabel('GlxyMapPlntMsk').GetValue(); //Max 32?
                let currentPlanet = GlxyMap.GetFieldByLabel('GlxyMapSelPnt').GetValue();

                for(let i = 0; i < planetCount; i++){
                  Planetary.SetPlanetAvailable(i,  (planetBits>>i) % 2 != 0);
                }

                Planetary.SetCurrentPlanet(currentPlanet);
              }

              if(partytable.RootNode.HasField('PT_TUT_WND_SHOWN')){
                let tutWindBytes = partytable.RootNode.GetFieldByLabel('PT_TUT_WND_SHOWN').GetVoid();
                let maxBits = tutWindBytes.length * 8;
                for(let i = 0; i < maxBits; i++){
                  for(let j = 0; j < 8; j++){
                    let bit = (tutWindBytes[i] >> j) & 1;
                    Game.TutorialWindowTracker[ (i * 8) + j ] = bit;
                  }
                }
              }
            
              if(partytable.RootNode.HasField('PT_AVAIL_NPCS')){
                let avail = partytable.GetFieldByLabel('PT_AVAIL_NPCS').GetChildStructs();
                for(let i = 0; i < avail.length; i++){
                  console.log(PartyManager.NPCS[i]);
                  PartyManager.NPCS[i].available = avail[i].GetFieldByLabel('PT_NPC_AVAIL').GetValue();
                  PartyManager.NPCS[i].canSelect = avail[i].GetFieldByLabel('PT_NPC_SELECT').GetValue();
                }
              }

              console.log('PT_CONTROLLED_NP', partytable.RootNode.GetFieldByLabel('PT_CONTROLLED_NP').GetValue());
        
              if(partytable.RootNode.HasField('PT_MEMBERS')){
                let pms = partytable.GetFieldByLabel('PT_MEMBERS').GetChildStructs();
                let currentPartyInfo = [];
                PartyManager.CurrentMembers = [];
                for(let i = 0; i < pms.length; i++){
                  PartyManager.CurrentMembers.push(
                    {
                      isLeader: pms[i].GetFieldByLabel('PT_IS_LEADER').GetValue() ? true : false,
                      memberID: pms[i].GetFieldByLabel('PT_MEMBER_ID').GetValue()
                    }
                  )
                }
  
                let ptLoader = ( id = 0, onLoad = null ) => {
  
                  if(id < 9){
  
                    this.SAVEGAME.getRawResource('availnpc'+id, ResourceTypes.utc, (pm) => {
                      PartyManager.NPCS[id].template = null;
                      if(pm.length){
                        PartyManager.NPCS[id].template = new GFFObject(pm);
                      }
                      id++
                      ptLoader(id, onLoad);
                    });
  
                  }else{
                    if(typeof onLoad === 'function')
                      onLoad();
                  }
  
                };
                ptLoader(0, () => {
                  console.log('SaveGame loaded');
                  Game.LoadModule(this.getLastModule(), null, () => { console.log('ready to load'); })
                  if(typeof onLoad === 'function')
                    onLoad();
                });
  
              }
  
            });
  
          });
          
        });
        
      });

    });

  }

  IsModuleSaved(name=''){
    if(!this.isLoaded)
      return false;

    for(let i = 0; i < this.SAVEGAME.KeyList.length; i++){
      if(this.SAVEGAME.KeyList[i].ResRef.toLowerCase() === name.toLowerCase()){
        return true;
      }
    }
    return false;
  }

  GetModuleRim(name='', onLoad = null){
    if(!this.isLoaded)
      return false;

    for(let i = 0; i < this.SAVEGAME.KeyList.length; i++){
      if(this.SAVEGAME.KeyList[i].ResRef.toLowerCase() === name.toLowerCase()){
        this.SAVEGAME.getRawResource(this.SAVEGAME.KeyList[i].ResRef, this.SAVEGAME.KeyList[i].ResType, (sav) => {
          
          new ERFObject(sav, (rim) => {
            console.log('HI', rim);
            if(typeof onLoad === 'function')
              onLoad(rim);
          });
        });
      }
    }
  }

  Save( onSave = null ){

    //TODO
    if(Game.module instanceof Module){
      //Go ahead and run mkdir. It will silently fail if it already exists
      fs.mkdir(this.directory, { recursive: false }, (err) => {
        this.savenfo = new GFFObject();

        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'AREANAME')).Value = Game.module.area.Name.GetValue();
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'CHEATUSED')).Value = 0;
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'GAMEPLAYHINT')).Value = 0;
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LASTMODULE')).Value = Game.module.Area_Name;
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE1')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE2')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE3')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE4')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE5')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE6')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'LIVECONTENT')).Value = 0;

        //Save the portraits of the current party
        for(let i = 0; i < PartyManager.party.length; i++){
          this.savenfo.RootNode.AddField(new Field(GFFDataTypes.RESREF, 'PORTRAIT'+i)).Value = PartyManager.party[i].getPortraitResRef();
        }

        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'SAVEGAMENAME')).Value = '';
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'STORYHINT')).Value = 0;
        this.savenfo.RootNode.AddField(new Field(GFFDataTypes.DWORD, 'TIMEPLAYED')).Value = parseInt(Game.time);

        this.savenfo.FileType = 'NFO ';
        this.savenfo.Export(path.join(this.directory, 'savenfo.res'), () => {

          //Export PARTYTABLE.res
          this.partytable = new GFFObject();
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.STRUCT, 'GlxyMap'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'JNL_Entries'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'JNL_SortOrder'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_AISTATE'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_AVAIL_NPCS'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_CHEAT_USED'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_CONTROLLED_NP'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_COST_MULT_LIS'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_DLG_MSG_LIST'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_FB_MSG_LIST'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_FOLLOWSTATE'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.DWORD, 'PT_GOLD'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_LAST_GUI_PNL'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_MEMBERS'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'PT_NUM_MEMBERS'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_PAZAAKCARDS'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'PT_PAZSIDELIST'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.DWORD, 'PT_PLAYEDSECONDS'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'PT_SOLOMODE'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'PT_TUT_WND_SHOWN'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_XP_POOL'));

          this.partytable.FileType = 'PT  ';
          this.partytable.Export(path.join(this.directory, 'PARTYTABLE.res'), () => {

            //Export GLOBALVARS.res
            this.partytable = new GFFObject();
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatBoolean'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatLocation'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatNumber'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatString'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'ValBoolean'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'ValLocation'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'ValNumber'));
            this.partytable.RootNode.AddField(new Field(GFFDataTypes.LIST, 'ValString'));

            this.partytable.FileType = 'GVT ';
            this.partytable.Export(path.join(this.directory, 'GLOBALVARS.res'), () => {
              
              //Save screenshot
              //let base64 = Game.canvas.toDataURL('image/png');
              //base64 = base64.substr(22);

            });

          });

        });

      });
    }

  }

}

SaveGame.saves = [];
SaveGame.directory = path.join(Config.options.Games[GameKey].Location, 'Saves');
SaveGame.getSaveGames = function( onLoad = null ){

  fs.readdir(SaveGame.directory, (err, folders) => {
    
    for(let i = 0; i < folders.length; i++){
      SaveGame.saves.push(new SaveGame(folders[i]));
    }

    if(typeof onLoad === 'function')
      onLoad();

  });

}

module.exports = SaveGame;