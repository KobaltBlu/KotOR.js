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

  async InitSavePIFO(){
    return new Promise( (resolve, reject) => {
      try{
        if(fs.existsSync(path.join(this.directory, 'pifo.ifo'))){
          this.pifo = new GFFObject(path.join(this.directory, 'pifo.ifo'), (pifo) => {
      
            if(pifo.RootNode.HasField('Mod_PlayerList')){
              let playerList = pifo.GetFieldByLabel('Mod_PlayerList').GetChildStructs();
              if(playerList.length){
                PartyManager.Player = GFFObject.FromStruct(playerList[0]);
              }
            }

            resolve();
      
          });
        }else{
          resolve();
        }
      }catch(e){
        resolve();
      }
    });
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

  getIsAutoSave(){
    return this.folderName.split(' - ')[1] == 'AUTOSAVE';
  }

  getIsQuickSave(){
    return this.folderName.split(' - ')[1] == 'QUICKSAVE';
  }

  getSaveNumber(){
    return parseInt(this.folderName.split(' - ')[0]);
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

    PartyManager.PortraitOrder = [];

    if(this.PORTRAIT0)
      PartyManager.PortraitOrder[0] = this.PORTRAIT0;

    if(this.PORTRAIT1)
      PartyManager.PortraitOrder[1] = this.PORTRAIT1;

    if(this.PORTRAIT2)
      PartyManager.PortraitOrder[2] = this.PORTRAIT2;

    //Init SAVEGAME.sav
    this.InitSaveGameResourceLoader( ()=> {
      //Create the gameinprogress folder
      this.InitGameInProgressFolder( () => {
        //Load GlobalVars
        this.GlobalVARSLoader( () => {
          //Load Inventory
          this.InventoryLoader( () => {
            //Load PartyTable
            this.PartyTableLoader( () => {
              //Load PIFO if it exists
              this.InitSavePIFO().then( () => {
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
      });
    });

  }

  InitGameInProgressFolder( onLoad = undefined ){
    CurrentGame.InitGameInProgressFolder();
    CurrentGame.ExtractERFToGameInProgress( this.SAVEGAME ).then( () => {
      if(typeof onLoad === 'function')
        onLoad();
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

      let numBytes = new BinaryReader(globalVars.RootNode.GetFieldByLabel('ValNumber').GetVoid());
      let catNumbers = globalVars.GetFieldByLabel('CatNumber').GetChildStructs();
      for(let i = 0; i < catNumbers.length; i++){
        let numCat = catNumbers[i];
        let numLabel = numCat.GetFieldByLabel('Name').GetValue();
        if(Game.Globals.Number[numLabel.toLowerCase()]){
          Game.Globals.Number[numLabel.toLowerCase()].value = numBytes.ReadByte();
        }
      }

      let locBytes = new BinaryReader(globalVars.RootNode.GetFieldByLabel('ValLocation').GetVoid());
      let catLocations = globalVars.GetFieldByLabel('CatLocation').GetChildStructs();
      for(let i = 0; i < catLocations.length; i++){
        let locCat = catLocations[i];
        let locLabel = locCat.GetFieldByLabel('Name').GetValue();

        Game.Globals.Location[locLabel.toLowerCase()].value = new Game.Location(
          locBytes.ReadSingle(),
          locBytes.ReadSingle(),
          locBytes.ReadSingle(),
          locBytes.ReadSingle(),
          locBytes.ReadSingle(),
          locBytes.ReadSingle(),
        );
      }

      let boolBytes = globalVars.RootNode.GetFieldByLabel('ValBoolean').GetVoid();
      let catBooleans = globalVars.GetFieldByLabel('CatBoolean').GetChildStructs();
      let maxBits = boolBytes.length * 8;
      for(let i = 0; i < maxBits; i++){
        for(let j = 0; j < 8; j++){
          let index = (i * 8) + j;
          let bit = (boolBytes[i] >> 7-j) & 1; //reverse the bit index because of ENDIANS -_-

          let boolCat = catBooleans[index];
          if(boolCat){
            let boolLabel = boolCat.GetFieldByLabel('Name').GetValue();
            if(Game.Globals.Boolean[boolLabel.toLowerCase()]){
              Game.Globals.Boolean[boolLabel.toLowerCase()].value = bit;
            }
          }
        }
      }

      let stringValues = globalVars.RootNode.GetFieldByLabel('ValString').GetChildStructs();
      let catStrings = globalVars.GetFieldByLabel('CatString').GetChildStructs();
      for(let i = 0; i < catStrings.length; i++){
        let strCat = catStrings[i];
        if(strCat){
          let strLabel = strCat.GetFieldByLabel('Name').GetValue();
          let strValue = stringValues[i].GetFieldByLabel('String').GetValue();
          if(Game.Globals.String[strLabel.toLowerCase()]){
            Game.Globals.String[strLabel.toLowerCase()].value = strValue;
          }
        }
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

    fs.readFile( path.join( CurrentGame.gameinprogress_dir, 'inventory.res'), (error, data) => {
      if(!error){
        this.inventory = new GFFObject(data);
        let invArr = this.inventory.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
  
        this.LoadInventoryItems(invArr, 0, () => {
          if(typeof onLoad === 'function')
            onLoad();
        });
      }else{
        console.error('InventoryLoader', e)
      }
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
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.VOID, 'PT_TUT_WND_SHOWN'));
          this.partytable.RootNode.AddField(new Field(GFFDataTypes.INT, 'PT_XP_POOL'));

          this.partytable.FileType = 'PT  ';
          this.partytable.Export(path.join(this.directory, 'PARTYTABLE.res'), () => {

            //Export GLOBALVARS.res
            this.globalVars = new GFFObject();
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatBoolean'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatLocation'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatNumber'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatString'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.VOID, 'ValBoolean'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.VOID, 'ValLocation'));
            this.globalVars.RootNode.AddField(new Field(GFFDataTypes.VOID, 'ValNumber'));
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

  static SaveCurrentGame( name = '', replace_id = 0 ){
    return new Promise( async (resolve, reject ) => {

      if(Game.module instanceof Module){

        Game.LoadScreen.Open();
        Game.LoadScreen.showSavingMessage();

        let base_dir = path.join( app.getAppPath(), 'Saves' );
        let save_id = replace_id >= 2 ? replace_id : SaveGame.NEXT_SAVE_ID++;

        if(!fs.existsSync(base_dir)){
          fs.mkdirSync(base_dir);
        }

        let save_dir_name = pad(save_id, 6)+' - Game'+(save_id-1);
        let save_dir = path.join( base_dir, save_dir_name );

        if(!fs.existsSync(save_dir)){
          fs.mkdirSync(save_dir);
        }
        Game.LoadScreen.setProgress(25);

        await Game.module.save();
        Game.LoadScreen.setProgress(50);

        await CurrentGame.ExportToSaveFolder( save_dir );
        Game.LoadScreen.setProgress(75);

        await SaveGame.ExportSaveNFO(save_dir, name);
        await SaveGame.ExportGlobalVars( save_dir );
        await PartyTableManager.export( save_dir );

        Game.onScreenShot = (tga) => {
          tga.export( path.join( save_dir, 'Screen.tga')).then( (d) => {
            Game.LoadScreen.setProgress(100);
            Game.LoadScreen.Close();
            resolve();
          });
        };

      }else{
        resolve();
      }

    });
  }

  static ExportSaveNFO( directory, savename){
    return new Promise( async (resolve, reject) => {
      console.log('ExportSaveNFO')
      let nfo = new GFFObject();
      nfo.FileType = 'NFO ';

      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'AREANAME')).Value = Game.module.area.Name.GetValue();
      nfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'CHEATUSED')).Value = 0;
      nfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'GAMEPLAYHINT')).Value = 0;
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LASTMODULE')).Value = Game.module.filename.toUpperCase();
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE1')).Value = '';
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE2')).Value = '';
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE3')).Value = '';
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE4')).Value = '';
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE5')).Value = '';
      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'LIVE6')).Value = '';
      nfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'LIVECONTENT')).Value = 0;

      //Save the portraits of the current party
      for(let i = 0; i < PartyManager.party.length; i++){
        nfo.RootNode.AddField(new Field(GFFDataTypes.RESREF, 'PORTRAIT'+i)).Value = PartyManager.party[i].getPortraitResRef();
      }

      nfo.RootNode.AddField(new Field(GFFDataTypes.CEXOSTRING, 'SAVEGAMENAME')).Value = savename;
      nfo.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'STORYHINT')).Value = 0;
      nfo.RootNode.AddField(new Field(GFFDataTypes.DWORD, 'TIMEPLAYED')).Value = parseInt(Game.time);

      await nfo.Export(path.join(directory, 'savenfo.res'));

      resolve();
    });
  }

  static ExportGlobalVars( directory ){
    return new Promise( async (resolve, reject) => {
      console.log('ExportGlobalVars')
      let gvt = new GFFObject();
      gvt.FileType = 'GVT ';

      //Global Booleans
      let catBooleanList  = gvt.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatBoolean'));
      let boolKeys = Object.keys(Game.Globals.Boolean);
      let boolBuffer = Buffer.alloc( Math.ceil( boolKeys.length / 8 ) );

      for(let i = 0; i < boolKeys.length; i++){
        let boolean = Game.Globals.Boolean[boolKeys[i]];
        let byte_offset = Math.floor( i / 8 );
        let bit_index = (i % 8);

        if(boolean.value){
          boolBuffer[byte_offset] |= 1 << bit_index;
        }

        let boolStruct = new Struct();
        boolStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Name') ).SetValue(boolean.name);
        catBooleanList.AddChildStruct(boolStruct);
      }

      //Global Locations
      let catLocationList  = gvt.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatLocation'));
      let locKeys = Object.keys(Game.Globals.Location);
      let locationBuffer = Buffer.alloc(24 * 100);

      for(let i = 0; i < locKeys.length; i++){
        let location = Game.Globals.Location[locKeys[i]];
        locationBuffer.writeFloatLE( location.value.position.x, (24 * i) + 0  );
        locationBuffer.writeFloatLE( location.value.position.y, (24 * i) + 4  );
        locationBuffer.writeFloatLE( location.value.position.z, (24 * i) + 8  );
        locationBuffer.writeFloatLE( location.value.rotation.x, (24 * i) + 12 );
        locationBuffer.writeFloatLE( location.value.rotation.y, (24 * i) + 16 );
        locationBuffer.writeFloatLE( location.value.rotation.z, (24 * i) + 20 );

        let locStruct = new Struct();
        locStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Name') ).SetValue(location.name);
        catLocationList.AddChildStruct(locStruct);
      }

      //Global Numbers
      let catNumberList  = gvt.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatNumber'));
      let numberKeys = Object.keys(Game.Globals.Number);
      let numberBuffer = Buffer.alloc(numberKeys.length);

      for(let i = 0; i < numberKeys.length; i++){
        let numberObj = Game.Globals.Number[numberKeys[i]];

        numberBuffer[i] = (numberObj.value % 256);

        let numberStruct = new Struct();
        numberStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Name') ).SetValue(numberObj.name);
        catNumberList.AddChildStruct(numberStruct);
      }

      
      let catStringList  = gvt.RootNode.AddField(new Field(GFFDataTypes.LIST, 'CatString'));

      gvt.RootNode.AddField(new Field(GFFDataTypes.VOID, 'ValBoolean')).SetData( boolBuffer );
      gvt.RootNode.AddField(new Field(GFFDataTypes.VOID, 'ValLocation')).SetData( locationBuffer );
      gvt.RootNode.AddField(new Field(GFFDataTypes.VOID, 'ValNumber')).SetData( numberBuffer );

      let valStringList  = gvt.RootNode.AddField(new Field(GFFDataTypes.LIST, 'ValString'));
      let stringKeys = Object.keys(Game.Globals.String);
      for(let i = 0; i < stringKeys.length; i++){
        let stringObj = Game.Globals.String[stringKeys[i]];

        let stringCatStruct = new Struct();
        stringCatStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Name') ).SetValue(stringObj.name);
        catStringList.AddChildStruct(stringCatStruct);


        let stringValStruct = new Struct();
        stringValStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'String') ).SetValue(stringObj.value);
        valStringList.AddChildStruct(stringValStruct);
      }

      await gvt.Export(path.join(directory, 'GLOBALVARS.res'));

      resolve();
    });
  }

  static GetSaveGames(){
    return new Promise( (resolve, reject) => {
      fs.readdir(SaveGame.directory, (err, folders) => {

        if(err){
          if(typeof onLoad === 'function')
            resolve();
    
          //Make the default savegame directory
          fs.mkdirSync(SaveGame.directory);
    
          return;
        }
    
        //Loop through and detect the possible savegame paths
        for(let i = 0; i < folders.length; i++){
          if(SaveGame.FolderRegexValidator.test(folders[i])){
            if(fs.existsSync(path.join(SaveGame.directory, folders[i], 'SAVEGAME.sav'))){
              SaveGame.AddSaveGame( new SaveGame(folders[i]) );
            }else{
              //console.log('SaveGame', 'Folder Missing SAVEGAME.sav', folders[i]);
            }
          }else{
            //console.log('SaveGame', 'Folder Invalid', folders[i]);
          }
        }
    
        resolve();
    
      });
    });
  }

  static AddSaveGame( savegame = undefined ){
    if(savegame instanceof SaveGame){
      let len = SaveGame.saves.push( savegame );
      let lastSave = SaveGame.saves[len - 1];
      let saveNumber = lastSave.getSaveNumber();
      if(saveNumber >= SaveGame.NEXT_SAVE_ID){
        SaveGame.NEXT_SAVE_ID = saveNumber + 1;
      }
    }
  }

}

SaveGame.saves = [];
SaveGame.directory = path.join(app_profile.directory, 'Saves');
CurrentGame.gameinprogress_dir = path.join(app_profile.directory, 'gameinprogress');

SaveGame.FolderRegexValidator = /^(\d+) - (Game\d+)$|^(000000) - (QUICKSAVE)$|^(000001) - (AUTOSAVE)$/;
SaveGame.FolderNameRegex = /^(\d+) - (QUICKSAVE|AUTOSAVE|Game\d+)$/;
SaveGame.NEXT_SAVE_ID = 1;
//NEXT_SAVE_ID - 0 QUICKSAVE
//NEXT_SAVE_ID - 1 AUTOSAVE
//NEXT_SAVE_ID - X Higher than 1 is a custom save game


//Clean up the gameinprogress folder on startup
try{
  fs.rmdirSync( CurrentGame.gameinprogress_dir, { recursive: true } );
}catch(e){
  console.error('SaveGame', 'delete gameinprogress directory error', e);
}

module.exports = SaveGame;
