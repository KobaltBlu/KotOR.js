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
import { TGAObject } from "./resource/TGAObject";
import EngineLocation from "./engine/EngineLocation";
import { GameFileSystem } from "./utility/GameFileSystem";
import type { PartyTableManager, PartyManager, GlobalVariableManager, InventoryManager, MenuManager } from "./managers";

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
  partytable: PartyTableManager;
  inventory: GFFObject;
  directory: string;
  

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
    }catch(e){
      console.error(e);
    }
  }

  async loadPIFO(){
    try{
      const buffer = await GameFileSystem.readFile(path.join(this.directory, 'pifo.ifo'));
      this.pifo = new GFFObject(buffer);
      if(this.pifo.RootNode.hasField('Mod_PlayerList')){
        let playerList = this.pifo.getFieldByLabel('Mod_PlayerList').getChildStructs();
        if(playerList.length){
          GameState.PartyManager.PlayerTemplate = GFFObject.FromStruct(playerList[0]);
        }
      }
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
    await this.loadInventory();
    //Load PartyTable
    await this.loadPartyTable();
    //Load PIFO if it exists
    await this.loadPIFO();
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
      this.partytable = new GameState.PartyTableManager(gff);
      await this.partytable.Load();
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

  Save(){
    //TODO
    if(GameState.module){
      //Go ahead and run mkdir. It will silently fail if it already exists
      GameFileSystem.mkdir(this.directory, { recursive: false }).then( () => {
        this.savenfo = new GFFObject();

        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'AREANAME')).value = GameState.module.area.areaName.getValue();
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'CHEATUSED')).value = 0;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'GAMEPLAYHINT')).value = 0;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LASTMODULE')).value = GameState.module.areaName;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE1')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE2')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE3')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE4')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE5')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE6')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'LIVECONTENT')).value = 0;

        //Save the portraits of the current party
        for(let i = 0; i < GameState.PartyManager.party.length; i++){
          this.savenfo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'PORTRAIT'+i)).value = GameState.PartyManager.party[i].getPortraitResRef();
        }

        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'SAVEGAMENAME')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'STORYHINT')).value = 0;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'TIMEPLAYED')).value = (GameState.time) | 0;

        this.savenfo.FileType = 'NFO ';
        this.savenfo.export(path.join(this.directory, 'savenfo.res'), () => {

          //Export PARTYTABLE.res
          let partytable = new GFFObject();
          partytable.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'GlxyMap'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'JNL_Entries'));
          partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'JNL_SortOrder'));
          partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_AISTATE'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_AVAIL_NPCS'));
          partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CHEAT_USED'));
          partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CONTROLLED_NP'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_COST_MULT_LIS'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_DLG_MSG_LIST'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_FB_MSG_LIST'));
          partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_FOLLOWSTATE'));
          partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_GOLD'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_LAST_GUI_PNL'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_MEMBERS'));
          partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_NUM_MEMBERS'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PAZAAKCARDS'));
          partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PAZSIDELIST'));
          partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_PLAYEDSECONDS'));
          partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_SOLOMODE'));
          partytable.RootNode.addField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN'));
          partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_XP_POOL'));

          partytable.FileType = 'PT  ';
          partytable.export(path.join(this.directory, 'PARTYTABLE.res'), () => {

            //Export GLOBALVARS.res
            this.globalVars = new GFFObject();
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatBoolean'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatLocation'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatNumber'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatString'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValBoolean'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValLocation'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValNumber'));
            this.globalVars.RootNode.addField(new GFFField(GFFDataType.LIST, 'ValString'));

            this.globalVars.FileType = 'GVT ';
            this.globalVars.export(path.join(this.directory, 'GLOBALVARS.res'), () => {

              //Save screenshot
              //let base64 = GameState.canvas.toDataURL('image/png');
              //base64 = base64.substr(22);

            });

          });

        });

      }).catch(() => {

      })
    }

  }

  static SaveCurrentGame( name = '', replace_id = 0 ){
    return new Promise<void>( async (resolve, reject ) => {

      if(GameState.module){

        GameState.MenuManager.LoadScreen.open();
        GameState.MenuManager.LoadScreen.showSavingMessage();

        let save_id = replace_id >= 2 ? replace_id : SaveGame.NEXT_SAVE_ID++;

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
        await GameState.PartyTableManager.export( save_dir );

        GameState.onScreenShot = (tga: TGAObject) => {
          tga.export( path.join( save_dir, 'Screen.tga')).then( (d) => {
            GameState.MenuManager.LoadScreen.setProgress(100);
            GameState.MenuManager.LoadScreen.close();
            resolve();
          });
        };

      }else{
        resolve();
      }

    });
  }

  static ExportSaveNFO( directory: string, savename: string){
    return new Promise<void>( async (resolve, reject) => {
      console.log('ExportSaveNFO')
      let nfo = new GFFObject();
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

      resolve();
    });
  }

  static ExportGlobalVars( directory: string ){
    return new Promise<void>( async (resolve, reject) => {
      console.log('ExportGlobalVars')
      let gvt = new GFFObject();
      gvt.FileType = 'GVT ';

      //Global Booleans
      let catBooleanList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatBoolean'));
      let boolBuffer = Buffer.alloc( ( GameState.GlobalVariableManager.Globals.Boolean.size / 8 ) );
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
      let catLocationList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatLocation'));
      let locationBuffer = Buffer.alloc(24 * 100);

      i = 0;
      GameState.GlobalVariableManager.Globals.Location.forEach( (location, key: string) => {
        locationBuffer.writeFloatLE( location.value.position.x, (24 * i) + 0  );
        locationBuffer.writeFloatLE( location.value.position.y, (24 * i) + 4  );
        locationBuffer.writeFloatLE( location.value.position.z, (24 * i) + 8  );
        locationBuffer.writeFloatLE( location.value.rotation.x, (24 * i) + 12 );
        locationBuffer.writeFloatLE( location.value.rotation.y, (24 * i) + 16 );
        locationBuffer.writeFloatLE( location.value.rotation.z, (24 * i) + 20 );

        let locStruct = new GFFStruct();
        locStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(location.name);
        catLocationList.addChildStruct(locStruct);
        i++;
      });

      //Global Numbers
      let catNumberList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatNumber'));
      let numberBuffer = Buffer.alloc(GameState.GlobalVariableManager.Globals.Number.size);

      i = 0;
      GameState.GlobalVariableManager.Globals.Number.forEach( (numberObj, key: string) => {
        numberBuffer[i] = (numberObj.value & 0xFF);

        let numberStruct = new GFFStruct();
        numberStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(numberObj.name);
        catNumberList.addChildStruct(numberStruct);
        i++;
      });

      
      let catStringList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatString'));

      gvt.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValBoolean')).setData( boolBuffer );
      gvt.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValLocation')).setData( locationBuffer );
      gvt.RootNode.addField(new GFFField(GFFDataType.VOID, 'ValNumber')).setData( numberBuffer );

      let valStringList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'ValString'));
      i = 0;
      GameState.GlobalVariableManager.Globals.String.forEach( (stringObj, key: string) => {
        let stringCatStruct = new GFFStruct();
        stringCatStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(stringObj.name);
        catStringList.addChildStruct(stringCatStruct);


        let stringValStruct = new GFFStruct();
        stringValStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'String') ).setValue(stringObj.value);
        valStringList.addChildStruct(stringValStruct);
        i++;
      });

      await gvt.export(path.join(directory, 'GLOBALVARS.res'));

      resolve();
    });
  }

  static GetSaveGames(){
    return new Promise<void>( (resolve, reject) => {
      GameFileSystem.readdir(SaveGame.base_directory, {list_dirs: true}).then( async (folders) => {
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

        resolve();
      }).catch( () => {
        //Make the default savegame directory
        GameFileSystem.mkdir(SaveGame.base_directory).then( () => {
          resolve();
        }).catch( () => {
          resolve();
        });
        return;
      })
    });
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
