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

    this.AREANAME = '';
    this.LASTMODULE = '';
    this.SAVEGAMENAME = '';
    this.TIMEPLAYED = 0;
    this.GAMEPLAYHINT = 0;
    this.STORYHINT = 0;

    this.InitSaveNFO();
    this.thumbnail = null;
  }

  InitSaveNFO(){
    this.savenfo = new GFFObject(path.join(this.directory, 'savenfo.res'), (savenfo) => {
      
      if(savenfo.RootNode.HasField('AREANAME')){
        this.AREANAME = savenfo.GetFieldByLabel('AREANAME').GetValue()
      }
      
      if(savenfo.RootNode.HasField('CHEATUSED')){
        this.CHEATUSED = savenfo.GetFieldByLabel('CHEATUSED').GetValue()
      }
      
      if(savenfo.RootNode.HasField('GAMEPLAYHINT')){
        this.GAMEPLAYHINT = savenfo.GetFieldByLabel('GAMEPLAYHINT').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LASTMODULE')){
        this.LASTMODULE = savenfo.GetFieldByLabel('LASTMODULE').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LIVE1')){
        this.LIVE1 = savenfo.GetFieldByLabel('LIVE1').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LIVE2')){
        this.LIVE2 = savenfo.GetFieldByLabel('LIVE2').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LIVE3')){
        this.LIVE3 = savenfo.GetFieldByLabel('LIVE3').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LIVE4')){
        this.LIVE4 = savenfo.GetFieldByLabel('LIVE4').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LIVE5')){
        this.LIVE5 = savenfo.GetFieldByLabel('LIVE5').GetValue()
      }
      
      if(savenfo.RootNode.HasField('LIVE6')){
        this.LIVE6 = savenfo.GetFieldByLabel('LIVE6').GetValue()
      }

      if(savenfo.RootNode.HasField('LIVECONTENT')){
        this.LIVECONTENT = savenfo.GetFieldByLabel('LIVECONTENT').GetValue()
      }
      
      if(savenfo.RootNode.HasField('PORTRAIT0')){
        this.PORTRAIT0 = savenfo.GetFieldByLabel('PORTRAIT0').GetValue()
      }
      
      if(savenfo.RootNode.HasField('PORTRAIT1')){
        this.PORTRAIT1 = savenfo.GetFieldByLabel('PORTRAIT1').GetValue()
      }
      
      if(savenfo.RootNode.HasField('PORTRAIT2')){
        this.PORTRAIT2 = savenfo.GetFieldByLabel('PORTRAIT2').GetValue()
      }
      
      if(savenfo.RootNode.HasField('SAVEGAMENAME')){
        this.SAVEGAMENAME = savenfo.GetFieldByLabel('SAVEGAMENAME').GetValue()
      }
      
      if(savenfo.RootNode.HasField('STORYHINT')){
        this.STORYHINT = savenfo.GetFieldByLabel('STORYHINT').GetValue()
      }
      
      if(savenfo.RootNode.HasField('TIMEPLAYED')){
        this.TIMEPLAYED = savenfo.GetFieldByLabel('TIMEPLAYED').GetValue()
      }
      
    });
  }

  getAreaName(){
    return this.AREANAME;
  }

  getLastModule(){
    return this.LASTMODULE;
  }

  getSaveName(){
    return this.SAVEGAMENAME;
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
      TextureLoader.tgaLoader.load_local(
        path.join(this.directory, 'Screen.tga'),
        (texture) => {
          this.thumbnail = texture;
          if(typeof onLoad === 'function'){
            onLoad(this.thumbnail);
          }
        },
        () => {
          TextureLoader.Load('load_'+this.getLastModule(), (texture) => {
            if(texture){
              this.thumbnail = texture;
              if(typeof onLoad === 'function'){
                onLoad(this.thumbnail);
              }
            }else{
              TextureLoader.Load('whitefill', (texture) => {
                if(texture){
                  this.thumbnail = texture;
                  if(typeof onLoad === 'function'){
                    onLoad(this.thumbnail);
                  }
                }else{
                  
                }
              });
            }
          });
        }
      );
    }else{
      if(typeof onLoad === 'function'){
        onLoad(this.thumbnail);
      }
    }

  }

  GetPortrait(nth = 0, onLoad = null){

    let name = undefined;

    if(typeof this['PORTRAIT'+nth] === 'string'){
      name = this['PORTRAIT'+nth];
    }
    if(typeof name === 'string'){
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
      Game.time = this.TIMEPLAYED;
    }catch(e){}

    Game.SaveGame = this;

    if(Game.player instanceof ModuleObject){
      Game.player.destroy();
      Game.player = undefined;
    }
    
    //Init SAVEGAME.sav
    this.InitSaveGameResourceLoader( ()=> {
      //Load GlobalVars
      this.GlobalVARSLoader( () => {  
        //Load Inventory
        this.InventoryLoader( () => {
          //Load PartyTable
          this.PartyTableLoader( () => {
            //Load The Last Module
            this.ModuleLoader( () => {
              console.log('SaveGame', 'Load Complete!');
              if(typeof onLoad === 'function')
                onLoad();
            });
          });
        });
      });
    });

  }

  InitSaveGameResourceLoader(onLoad = null){
    this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'), (sav) => {
      this.isLoaded = true;
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  GlobalVARSLoader(onLoad = null){
    console.log('SaveGame', 'Loading GlobalVARS...');
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

      if(typeof onLoad === 'function')
        onLoad();

    });
  }

  PartyTableLoader(onLoad = null){
    console.log('SaveGame', 'Loading Partytable...');
    try{
      new GFFObject(path.join(this.directory, 'PARTYTABLE.res'), (gff) => {
        this.partytable = new PartyTableManager(gff, () => {
          if(typeof onLoad === 'function')
            onLoad();
        });
      });
    }catch(e){
      console.error(e);
    }  
  }

  InventoryLoader(onLoad = null){
    console.log('SaveGame', 'Loading Inventory...');
    this.SAVEGAME.getRawResource('inventory', 0, (d) => {
      this.inventory = new GFFObject(d);
      let invArr = this.inventory.RootNode.GetFieldByLabel('ItemList').GetChildStructs();

      this.LoadInventoryItems(invArr, 0, () => {
        if(typeof onLoad === 'function')
          onLoad();
      });
    });
  }

  LoadInventoryItems(invArr = null, i = 0, onLoad = null){
    if(i < invArr.length){
      InventoryManager.addItem(GFFObject.FromStruct(invArr[i]), () => {
        this.LoadInventoryItems(invArr, ++i, onLoad);
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  ModuleLoader(onLoad = null){
    console.log('SaveGame', this.getLastModule(), 'Loading Module...');
    Game.LoadModule(this.getLastModule(), null, () => {
      console.log('SaveGame', 'Module loaded!');

      if(typeof onLoad === 'function')
        onLoad();
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

  GetModuleRim(name=''){
    // if(!this.isLoaded)
    //   return false;

    return new Promise( (resolve, reject) => {
      for(let i = 0; i < this.SAVEGAME.KeyList.length; i++){
        if(this.SAVEGAME.KeyList[i].ResRef.toLowerCase() === name.toLowerCase()){
          this.SAVEGAME.getRawResource(this.SAVEGAME.KeyList[i].ResRef, this.SAVEGAME.KeyList[i].ResType, (sav) => {
            new ERFObject(sav, (rim) => {
              console.log('SaveGame', 'GetModuleRum', rim);
              resolve(rim);
            });
          });
        }
      }
    });
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
            this.globalVars = new GFFObject();
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatBoolean'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatLocation'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatNumber'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatString'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'ValBoolean'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'ValLocation'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.BINARY, 'ValNumber'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'ValString'));

            this.globalVars.FileType = 'GVT ';
            this.globalVars.Export(path.join(this.directory, 'GLOBALVARS.res'), () => {
              
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

    if(err){
      if(typeof onLoad === 'function')
        onLoad();

      //Make the default savegame directory
      fs.mkdirSync(SaveGame.directory);

      return;
    }

    //Loop through and detect the possible savegame paths
    for(let i = 0; i < folders.length; i++){
      if(fs.existsSync(path.join(SaveGame.directory, folders[i], 'SAVEGAME.sav'))){
        SaveGame.saves.push(new SaveGame(folders[i]));
      }
    }

    if(typeof onLoad === 'function')
      onLoad();

  });

}

module.exports = SaveGame;