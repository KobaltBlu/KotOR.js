import * as path from "path";
import { GFFObject } from "./resource/GFFObject";
import { TextureLoader } from "./loaders";
import { OdysseyTexture } from "./three/odyssey/OdysseyTexture";
import { CurrentGame } from "./CurrentGame";
import { GFFField } from "./resource/GFFField";
import { GameState } from "./GameState";
import { GFFDataType } from "./enums/resource/GFFDataType";
import { GFFStruct } from "./resource/GFFStruct";
import { ERFObject } from "./resource/ERFObject";
import { BinaryReader } from "./BinaryReader";
import { Utility } from "./utility/Utility";
import EngineLocation from "./engine/EngineLocation";
import { GameFileSystem } from "./utility/GameFileSystem";
import { ResourceTypes } from "./KotOR";

const winEpoch = new Date("01-01-1601 UTC").getTime();

/**
 * SaveGame class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SaveGame.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SaveGame {
  folderName: string;
  isLoaded: boolean;
  AREANAME: string;
  LASTMODULE: string;
  SAVEGAMENAME: string;
  TIMEPLAYED: number;
  TIMESTAMP: Date;
  GAMEPLAYHINT: number;
  STORYHINT: number;
  thumbnail: OdysseyTexture;
  pifo: GFFObject;
  savenfo: GFFObject;
  pc: GFFObject;
  CHEATUSED: boolean;
  LIVE1: string;
  LIVE2: string;
  LIVE3: string;
  LIVE4: string;
  LIVE5: string;
  LIVE6: string;
  LIVECONTENT: any;
  PORTRAIT0: string;
  PORTRAIT1: string;
  PORTRAIT2: string;
  globalVars: GFFObject;
  // partytable: PartyTableManager;
  inventory: GFFObject;
  directory: string;
  PCNAME: string;
  isNewSave = false;
  

  static saves: SaveGame[] = [];
  static base_directory: string = 'Saves';

  static FolderRegexValidator: RegExp = /^(\d+) - (Game\d+)$|^(000000) - (QUICKSAVE)$|^(000001) - (AUTOSAVE)$/;
  static FolderNameRegex: RegExp = /^(\d+) - (QUICKSAVE|AUTOSAVE|Game\d+)$/;
  static NEXT_SAVE_ID: number = 1;
  SAVEGAME: ERFObject;
  //NEXT_SAVE_ID - 0 QUICKSAVE
  //NEXT_SAVE_ID - 1 AUTOSAVE
  //NEXT_SAVE_ID - X Higher than 1 is a custom save game


  constructor(name = ''){
    this.folderName = name.split('/').pop();
    this.directory = path.join(SaveGame.base_directory, this.folderName);
    this.isLoaded = false;

    this.AREANAME = '';
    this.LASTMODULE = '';
    this.SAVEGAMENAME = '';
    this.TIMEPLAYED = 0;
    this.GAMEPLAYHINT = 0;
    this.STORYHINT = 0;
    this.TIMESTAMP = new Date();

    this.loadNFO();
    this.thumbnail = null;
  }

  /**
   * SAVENFO contains the necessary metadata required to preview SaveGames in the Save/Load menu
   */
  async loadNFO(){
    try{
      const buffer = await GameFileSystem.readFile(path.join(this.directory, 'savenfo.res'));
      this.savenfo = new GFFObject(buffer);
      if(this.savenfo.RootNode.hasField('AREANAME')){
        this.AREANAME = this.savenfo.getFieldByLabel('AREANAME').getValue()
      }

      if(this.savenfo.RootNode.hasField('CHEATUSED')){
        this.CHEATUSED = this.savenfo.getFieldByLabel('CHEATUSED').getValue()
      }

      if(this.savenfo.RootNode.hasField('GAMEPLAYHINT')){
        this.GAMEPLAYHINT = this.savenfo.getFieldByLabel('GAMEPLAYHINT').getValue()
      }

      if(this.savenfo.RootNode.hasField('LASTMODULE')){
        this.LASTMODULE = this.savenfo.getFieldByLabel('LASTMODULE').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVE1')){
        this.LIVE1 = this.savenfo.getFieldByLabel('LIVE1').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVE2')){
        this.LIVE2 = this.savenfo.getFieldByLabel('LIVE2').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVE3')){
        this.LIVE3 = this.savenfo.getFieldByLabel('LIVE3').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVE4')){
        this.LIVE4 = this.savenfo.getFieldByLabel('LIVE4').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVE5')){
        this.LIVE5 = this.savenfo.getFieldByLabel('LIVE5').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVE6')){
        this.LIVE6 = this.savenfo.getFieldByLabel('LIVE6').getValue()
      }

      if(this.savenfo.RootNode.hasField('LIVECONTENT')){
        this.LIVECONTENT = this.savenfo.getFieldByLabel('LIVECONTENT').getValue()
      }

      if(this.savenfo.RootNode.hasField('PORTRAIT0')){
        this.PORTRAIT0 = this.savenfo.getFieldByLabel('PORTRAIT0').getValue()
      }

      if(this.savenfo.RootNode.hasField('PORTRAIT1')){
        this.PORTRAIT1 = this.savenfo.getFieldByLabel('PORTRAIT1').getValue()
      }

      if(this.savenfo.RootNode.hasField('PORTRAIT2')){
        this.PORTRAIT2 = this.savenfo.getFieldByLabel('PORTRAIT2').getValue()
      }

      if(this.savenfo.RootNode.hasField('SAVEGAMENAME')){
        this.SAVEGAMENAME = this.savenfo.getFieldByLabel('SAVEGAMENAME').getValue()
      }

      if(this.savenfo.RootNode.hasField('STORYHINT')){
        this.STORYHINT = this.savenfo.getFieldByLabel('STORYHINT').getValue()
      }

      if(this.savenfo.RootNode.hasField('TIMEPLAYED')){
        this.TIMEPLAYED = this.savenfo.getFieldByLabel('TIMEPLAYED').getValue()
      }

      if(this.savenfo.RootNode.hasField('TIMESTAMP')){
        let timestamp: bigint = this.savenfo.getFieldByLabel('TIMESTAMP').getValue();
        this.TIMESTAMP = new Date(parseInt((timestamp/10000n) as any) + winEpoch);
      }

      if(this.savenfo.RootNode.hasField('PCNAME')){
        this.PCNAME = this.savenfo.getFieldByLabel('PCNAME').getValue()
      }
    }catch(e){
      console.error(e);
    }
  }

  async loadPIFO(){
    try{
      const buffer = await GameFileSystem.readFile(path.join(this.directory, 'pifo.ifo'));
      this.pifo = new GFFObject(buffer);
      if(!this.pifo.RootNode.hasField('Mod_PlayerList')){ return; }

      const playerList = this.pifo.getFieldByLabel('Mod_PlayerList').getChildStructs();
      if(!playerList.length){ return; }

      GameState.PartyManager.PlayerTemplate = GFFObject.FromStruct(playerList[0]);
      GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
    }catch(e){
      console.error(e);
    }
  }

  async loadPC(){
    try{
      const buffer = await this.SAVEGAME.getResourceBufferByResRef('pc', ResourceTypes.utc);
      if(!buffer){ return; }
      this.pc = new GFFObject(buffer);
    }catch(e){
      console.error(e);
    }
  }

  async load(){
    GameState.isLoadingSave = true;
    GameState.TutorialWindowTracker = [];

    try{
      GameState.time = this.TIMEPLAYED;
    }catch(e){}

    GameState.SaveGame = this;

    GameState.PartyManager.PortraitOrder = [];

    if(this.PORTRAIT0)
      GameState.PartyManager.PortraitOrder[0] = this.PORTRAIT0;

    if(this.PORTRAIT1)
      GameState.PartyManager.PortraitOrder[1] = this.PORTRAIT1;

    if(this.PORTRAIT2)
      GameState.PartyManager.PortraitOrder[2] = this.PORTRAIT2;

    //Init SAVEGAME.sav
    await this.initSaveGameResourceLoader();
    //Create the gameinprogress folder
    await this.initGameInProgressFolder();
    //Load GlobalVars
    await this.loadGlobalVARS();
    //Load Inventory
    // await this.loadInventory();
    //Load PartyTable
    await this.loadPartyTable();
    //Load PIFO if it exists
    await this.loadPIFO();
    //Load pc if it exists
    await this.loadPC();
    //Load The Last Module
    console.log('SaveGame', this.getLastModule(), 'Loading Module...');
    GameState.LoadModule(this.getLastModule(), null);
    console.log('SaveGame', 'Load Complete!');
  }

  async initGameInProgressFolder(){
    await CurrentGame.InitGameInProgressFolder(true);
    await CurrentGame.ExtractERFToGameInProgress( this.SAVEGAME );
  }

  async initSaveGameResourceLoader(){
    this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'));
    await this.SAVEGAME.load();
    this.isLoaded = true;
  }

  async loadGlobalVARS(){
    console.log('SaveGame', 'Loading GlobalVARS...');
    const data = await GameFileSystem.readFile(path.join(this.directory, 'GLOBALVARS.res'));
    this.globalVars = new GFFObject(data);

    let numBytes = new BinaryReader(this.globalVars.RootNode.getFieldByLabel('ValNumber').getVoid());
    let catNumbers = this.globalVars.getFieldByLabel('CatNumber').getChildStructs();
    for(let i = 0; i < catNumbers.length; i++){
      let numCat = catNumbers[i];
      let numLabel = numCat.getFieldByLabel('Name').getValue();
      let value = numBytes.readByte();
      if(GameState.GlobalVariableManager.Globals.Number.has(numLabel.toLowerCase())){
        GameState.GlobalVariableManager.Globals.Number.get(numLabel.toLowerCase()).value = value;
      }else{
        GameState.GlobalVariableManager.Globals.Number.set(numLabel.toLowerCase(), {name: numLabel.toLowerCase(), value: value});
        console.warn('Global Number: missing', numLabel.toLowerCase(), value);
      }
    }

    let locBytes = new BinaryReader(this.globalVars.RootNode.getFieldByLabel('ValLocation').getVoid());
    let catLocations = this.globalVars.getFieldByLabel('CatLocation').getChildStructs();
    for(let i = 0; i < catLocations.length; i++){
      let locCat = catLocations[i];
      let locLabel = locCat.getFieldByLabel('Name').getValue();

      GameState.GlobalVariableManager.Globals.Location.set(
        locLabel.toLowerCase(), { 
          name: locLabel, 
          value: new EngineLocation(
            locBytes.readSingle(),
            locBytes.readSingle(),
            locBytes.readSingle(),
            locBytes.readSingle(),
            locBytes.readSingle(),
            locBytes.readSingle(),
          )
        }
      );
    }

    let boolBytes = this.globalVars.RootNode.getFieldByLabel('ValBoolean').getVoid();
    let catBooleans = this.globalVars.getFieldByLabel('CatBoolean').getChildStructs();
    let maxBits = boolBytes.length * 8;
    for(let i = 0; i < maxBits; i++){
      for(let j = 0; j < 8; j++){
        let index = (i * 8) + j;
        let bit = (boolBytes[i] >> 7-j) & 1; //reverse the bit index because of ENDIANS -_-

        let boolCat = catBooleans[index];
        if(boolCat){
          let boolLabel = boolCat.getFieldByLabel('Name').getValue();
          let value = !!bit;
          if(GameState.GlobalVariableManager.Globals.Boolean.has(boolLabel.toLowerCase())){
            GameState.GlobalVariableManager.Globals.Boolean.get(boolLabel.toLowerCase()).value = value;
          }else{
            GameState.GlobalVariableManager.Globals.Boolean.set(boolLabel.toLowerCase(), {name: boolLabel.toLowerCase(), value: value});
            console.warn('Global Boolean: missing', boolLabel.toLowerCase(), value);
          }
        }
      }
    }

    let stringValues = this.globalVars.RootNode.getFieldByLabel('ValString').getChildStructs();
    let catStrings = this.globalVars.getFieldByLabel('CatString').getChildStructs();
    for(let i = 0; i < catStrings.length; i++){
      let strCat = catStrings[i];
      if(strCat){
        let strLabel = strCat.getFieldByLabel('Name').getValue();
        let strValue = stringValues[i].getFieldByLabel('String').getValue();
        if(GameState.GlobalVariableManager.Globals.String.has(strLabel.toLowerCase())){
          GameState.GlobalVariableManager.Globals.String.get(strLabel.toLowerCase()).value = strValue;
        }else{
          GameState.GlobalVariableManager.Globals.String.set(strLabel.toLowerCase(), {name: strLabel.toLowerCase(), value: strValue});
          console.warn('Global String: missing', strLabel.toLowerCase(), strValue);
        }
      }
    }
  }

  async loadPartyTable(){
    console.log('SaveGame', 'Loading Partytable...');
    try{
      const data = await GameFileSystem.readFile(path.join(this.directory, 'PARTYTABLE.res'));
      const gff = new GFFObject(data);
      await GameState.PartyManager.Load(gff);
      // this.partytable = new GameState.PartyTableManager(gff);
      // await this.partytable.Load();
    }catch(e){
      console.error(e);
    }
  }

  async loadInventory(){
    console.log('SaveGame', 'Loading Inventory...');

    try{
      const buffer = await GameFileSystem.readFile( path.join( CurrentGame.gameinprogress_dir, 'inventory.res'));
      this.inventory = new GFFObject(buffer);
      let invArr = this.inventory.RootNode.getFieldByLabel('ItemList').getChildStructs();
      for(let i = 0; i < invArr.length; i++){
        GameState.InventoryManager.addItem(GFFObject.FromStruct(invArr[i]));
      }
    }catch(e){
      console.error(e);
    }
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

  getHoursPlayed(){
    return Math.floor(this.TIMEPLAYED / 3600);
  }

  getMinutesPlayed(){
    return Math.floor(60 * ((this.TIMEPLAYED / 3600) % 1));
  }

  async getThumbnail(){
    if(this.thumbnail){ return this.thumbnail; }
    
    try{
      this.thumbnail = await TextureLoader.tgaLoader.fetchLocal(path.join(this.directory, 'Screen.tga'));
    }catch(e){
      console.error(e);
      try{
        this.thumbnail = await TextureLoader.Load('load_'+this.getLastModule());
      }catch(e){
        try{
          this.thumbnail = await TextureLoader.Load('whitefill');
        }catch(e){
          console.error(e);
        }
      }
    }

    return this.thumbnail;
  }

  async getPortrait(nth = 0){

    let name = undefined;

    if(typeof (this as any)['PORTRAIT'+nth] === 'string'){
      name = (this as any)['PORTRAIT'+nth];
    }

    if(typeof name === 'string'){
      return await TextureLoader.Load(name);
    }
    
    return undefined
  }

  async Save(){
    //TODO
    if(!GameState.module){ return; }
    try{
      //Go ahead and run mkdir. It will silently fail if it already exists
      await GameFileSystem.mkdir(this.directory, { recursive: false });
        
      await SaveGame.ExportSaveNFO(this.directory, this.SAVEGAMENAME);
      await GameState.PartyManager.Export( this.directory );
      await SaveGame.ExportGlobalVars( this.directory );
    }catch(e){
      console.error(e);
    }
  }

  static async SaveCurrentGame( name = '', replace_id = 0 ){
    if(!GameState.module){ return; }

    GameState.MenuManager.LoadScreen.open();
    GameState.MenuManager.LoadScreen.showSavingMessage();

    let save_id = replace_id >= 2 ? replace_id : SaveGame.NEXT_SAVE_ID++;

    //Prepare SaveGame directory
    if(!(await GameFileSystem.exists(SaveGame.base_directory))){
      await GameFileSystem.mkdir(SaveGame.base_directory);
    }

    let save_dir_name = Utility.PadInt(save_id, 6)+' - Game'+(save_id-1);
    let save_dir = path.join( SaveGame.base_directory, save_dir_name );

    if(!(await GameFileSystem.exists(save_dir))){
      await GameFileSystem.mkdir(save_dir);
    }

    GameState.MenuManager.LoadScreen.setProgress(25);

    await GameState.module.save();
    GameState.MenuManager.LoadScreen.setProgress(50);

    await CurrentGame.ExportToSaveFolder( save_dir );
    GameState.MenuManager.LoadScreen.setProgress(75);

    await SaveGame.ExportSaveNFO(save_dir, name);
    await SaveGame.ExportGlobalVars( save_dir );
    await GameState.PartyManager.Export( save_dir );

    //Get Screenshot
    const tga = await GameState.GetScreenShot();
    await tga.export( path.join( save_dir, 'Screen.tga'));

    //Save Complete
    GameState.MenuManager.LoadScreen.setProgress(100);
    GameState.MenuManager.LoadScreen.close();
  }

  static async ExportSaveNFO( directory: string, savename: string){
    console.log('ExportSaveNFO', directory, savename);
    const nfo = new GFFObject();
    nfo.FileType = 'NFO ';

    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'AREANAME')).value = GameState.module.area.areaName.getValue();
    nfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'CHEATUSED')).value = 0;
    nfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'GAMEPLAYHINT')).value = 0;
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LASTMODULE')).value = GameState.module.filename.toUpperCase();
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE1')).value = '';
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE2')).value = '';
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE3')).value = '';
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE4')).value = '';
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE5')).value = '';
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE6')).value = '';
    nfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'LIVECONTENT')).value = 0;

    //Save the portraits of the current party
    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      nfo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'PORTRAIT'+i)).value = GameState.PartyManager.party[i].getPortraitResRef();
    }

    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'SAVEGAMENAME')).value = savename;
    nfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'STORYHINT')).value = 0;
    nfo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'TIMEPLAYED')).value = GameState.time | 0;

    await nfo.export(path.join(directory, 'savenfo.res'));
  }

  static async ExportGlobalVars( directory: string ){
    console.log('ExportGlobalVars')
    let gvt = new GFFObject();
    gvt.FileType = 'GVT ';

    //Global Booleans
    const catBooleanList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatBoolean'));
    const boolBuffer =  new Uint8Array( ( GameState.GlobalVariableManager.Globals.Boolean.size / 8 ) );
    let i = 0;
    GameState.GlobalVariableManager.Globals.Boolean.forEach( (globBool, key: string) => {
      let boolean = globBool;
      let byte_offset = Math.floor( i / 8 );
      let bit_index = (i % 8);

      if(boolean.value){
        boolBuffer[byte_offset] |= 1 << bit_index;
      }

      let boolStruct = new GFFStruct();
      boolStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(boolean.name);
      catBooleanList.addChildStruct(boolStruct);
      i++;
    });

    //Global Locations
    const catLocationList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatLocation'));
    const locationBuffer = new Uint8Array(24 * 100);
    const locationDataView = new DataView(locationBuffer.buffer);

    i = 0;
    GameState.GlobalVariableManager.Globals.Location.forEach( (location, key: string) => {
      locationDataView.setFloat32( (24 * i) + 0, location.value.position.x, true );
      locationDataView.setFloat32( (24 * i) + 4, location.value.position.y, true );
      locationDataView.setFloat32( (24 * i) + 8, location.value.position.z, true );
      locationDataView.setFloat32( (24 * i) + 12, location.value.rotation.x, true );
      locationDataView.setFloat32( (24 * i) + 16, location.value.rotation.y, true );
      locationDataView.setFloat32( (24 * i) + 20, location.value.rotation.z, true );

      let locStruct = new GFFStruct();
      locStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(location.name);
      catLocationList.addChildStruct(locStruct);
      i++;
    });

    //Global Numbers
    const catNumberList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatNumber'));
    const numberBuffer = new Uint8Array(GameState.GlobalVariableManager.Globals.Number.size);

    i = 0;
    GameState.GlobalVariableManager.Globals.Number.forEach( (numberObj, key: string) => {
      numberBuffer[i] = (numberObj.value & 0xFF);

      const numberStruct = new GFFStruct();
      numberStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(numberObj.name);
      catNumberList.addChildStruct(numberStruct);
      i++;
    });

    
    const catStringList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatString'));

    gvt.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValBoolean')).setData( boolBuffer );
    gvt.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValLocation')).setData( locationBuffer );
    gvt.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValNumber')).setData( numberBuffer );

    const valStringList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'ValString'));
    i = 0;
    GameState.GlobalVariableManager.Globals.String.forEach( (stringObj, key: string) => {
      const stringCatStruct = new GFFStruct();
      stringCatStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(stringObj.name);
      catStringList.addChildStruct(stringCatStruct);


      const stringValStruct = new GFFStruct();
      stringValStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'String') ).setValue(stringObj.value);
      valStringList.addChildStruct(stringValStruct);
      i++;
    });

    await gvt.export(path.join(directory, 'GLOBALVARS.res'));
  }

  static async GetSaveGames(){
    try{
      const folders = await GameFileSystem.readdir(SaveGame.base_directory, {list_dirs: true});
      //Loop through and detect the possible savegame paths
      for(let i = 0; i < folders.length; i++){
        // if(SaveGame.FolderRegexValidator.test(folders[i])){
          if(await GameFileSystem.exists(path.join(folders[i], 'SAVEGAME.sav'))){
            SaveGame.AddSaveGame( new SaveGame(folders[i]) );
          }else{
            //console.log('SaveGame', 'Folder Missing SAVEGAME.sav', folders[i]);
          }
        // }else{
          //console.log('SaveGame', 'Folder Invalid', folders[i]);
        // }
      }
    }catch(e){
      try{
        //Make the default savegame directory
        await GameFileSystem.mkdir(SaveGame.base_directory);
      }catch(e){
        console.error(e);
      }
    }
  }

  static directory: string;

  static AddSaveGame( savegame: SaveGame ){
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
