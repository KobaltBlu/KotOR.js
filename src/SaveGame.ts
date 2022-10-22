/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as path from "path";
import { GFFObject } from "./resource/GFFObject";
import { TextureLoader } from "./loaders/TextureLoader";
import { OdysseyTexture } from "./resource/OdysseyTexture";
import { CurrentGame } from "./CurrentGame";
import { GFFField } from "./resource/GFFField";
import { PartyTableManager } from "./managers/PartyTableManager";
import { GameState } from "./GameState";
import { PartyManager } from "./managers/PartyManager";
import { GFFDataType } from "./enums/resource/GFFDataType";
import { GFFStruct } from "./resource/GFFStruct";
import { ApplicationProfile } from "./utility/ApplicationProfile";
import { ERFObject } from "./resource/ERFObject";
import { BinaryReader } from "./BinaryReader";
import { InventoryManager } from "./managers/InventoryManager";
import { Utility } from "./utility/Utility";
import { TGAObject } from "./resource/TGAObject";
import { Module } from "./module/Module";
import { ModuleObject } from "./module";
import EngineLocation from "./engine/EngineLocation";
import { GameFileSystem } from "./utility/GameFileSystem";
import { MenuManager } from "./gui";
import { GlobalVariableManager } from "./managers/GlobalVariableManager";

/* @file
 * The SaveGame class.
 */

export class SaveGame {
  folderName: string;
  isLoaded: boolean;
  AREANAME: string;
  LASTMODULE: string;
  SAVEGAMENAME: string;
  TIMEPLAYED: number;
  GAMEPLAYHINT: number;
  STORYHINT: number;
  thumbnail: any;
  pifo: GFFObject;
  savenfo: GFFObject;
  CHEATUSED: any;
  LIVE1: any;
  LIVE2: any;
  LIVE3: any;
  LIVE4: any;
  LIVE5: any;
  LIVE6: any;
  LIVECONTENT: any;
  PORTRAIT0: any;
  PORTRAIT1: any;
  PORTRAIT2: any;
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

    this.folderName = name;
    this.directory = path.join(SaveGame.base_directory, this.folderName);
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
    return new Promise<void>( (resolve, reject) => {
      try{
        GameFileSystem.exists(path.join(this.directory, 'pifo.ifo')).then( (exists) => {
          if(exists){
            this.pifo = new GFFObject(path.join(this.directory, 'pifo.ifo'), (pifo: GFFObject) => {
      
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
        })
      }catch(e){
        resolve();
      }
    });
  }

  InitSaveNFO(){
    this.savenfo = new GFFObject(path.join(this.directory, 'savenfo.res'), (savenfo: GFFObject) => {

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

  GetThumbnail( onLoad?: Function ){

    if(this.thumbnail == null){
      TextureLoader.tgaLoader.load_local(
        path.join(this.directory, 'Screen.tga'),
        (texture: OdysseyTexture) => {
          this.thumbnail = texture;
          if(typeof onLoad === 'function'){
            onLoad(this.thumbnail);
          }
        },
        () => {
          TextureLoader.Load('load_'+this.getLastModule(), (texture: OdysseyTexture) => {
            if(texture){
              this.thumbnail = texture;
              if(typeof onLoad === 'function'){
                onLoad(this.thumbnail);
              }
            }else{
              TextureLoader.Load('whitefill', (texture: OdysseyTexture) => {
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

  GetPortrait(nth = 0, onLoad?: Function){

    let name = undefined;

    if(typeof (this as any)['PORTRAIT'+nth] === 'string'){
      name = (this as any)['PORTRAIT'+nth];
    }
    if(typeof name === 'string'){
      TextureLoader.Load(name, (texture: OdysseyTexture) => {
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

  Load( onLoad?: Function ){
    GameState.isLoadingSave = true;
    GameState.TutorialWindowTracker = [];

    try{
      GameState.time = this.TIMEPLAYED;
    }catch(e){}

    GameState.SaveGame = this;

    if(GameState.player instanceof ModuleObject){
      GameState.player.destroy();
      GameState.player = undefined;
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

  InitGameInProgressFolder( onLoad?: Function ){
    CurrentGame.InitGameInProgressFolder().then( () => {
      CurrentGame.ExtractERFToGameInProgress( this.SAVEGAME ).then( () => {
        if(typeof onLoad === 'function')
          onLoad();
      });
    });
  }

  InitSaveGameResourceLoader(onLoad?: Function){
    this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'), (sav: ERFObject) => {
      this.isLoaded = true;
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  GlobalVARSLoader(onLoad?: Function){
    console.log('SaveGame', 'Loading GlobalVARS...');
    this.globalVars = new GFFObject(path.join(this.directory, 'GLOBALVARS.res'), (globalVars) => {

      let numBytes = new BinaryReader(globalVars.RootNode.GetFieldByLabel('ValNumber').GetVoid());
      let catNumbers = globalVars.GetFieldByLabel('CatNumber').GetChildStructs();
      for(let i = 0; i < catNumbers.length; i++){
        let numCat = catNumbers[i];
        let numLabel = numCat.GetFieldByLabel('Name').GetValue();
        if(GlobalVariableManager.Globals.Number.has(numLabel.toLowerCase())){
          GlobalVariableManager.Globals.Number.get(numLabel.toLowerCase()).value = numBytes.ReadByte();
        }
      }

      let locBytes = new BinaryReader(globalVars.RootNode.GetFieldByLabel('ValLocation').GetVoid());
      let catLocations = globalVars.GetFieldByLabel('CatLocation').GetChildStructs();
      for(let i = 0; i < catLocations.length; i++){
        let locCat = catLocations[i];
        let locLabel = locCat.GetFieldByLabel('Name').GetValue();

        GlobalVariableManager.Globals.Location.set(
          locLabel.toLowerCase(), { 
            name: locLabel, 
            value: new EngineLocation(
              locBytes.ReadSingle(),
              locBytes.ReadSingle(),
              locBytes.ReadSingle(),
              locBytes.ReadSingle(),
              locBytes.ReadSingle(),
              locBytes.ReadSingle(),
            )
          }
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
            if(GlobalVariableManager.Globals.Boolean.has(boolLabel.toLowerCase())){
              GlobalVariableManager.Globals.Boolean.get(boolLabel.toLowerCase()).value = !!bit;
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
          if(GlobalVariableManager.Globals.String.has(strLabel.toLowerCase())){
            GlobalVariableManager.Globals.String.get(strLabel.toLowerCase()).value = strValue;
          }
        }
      }

      if(typeof onLoad === 'function')
        onLoad();

    });
  }

  PartyTableLoader(onLoad?: Function){
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

  InventoryLoader(onLoad?: Function){
    console.log('SaveGame', 'Loading Inventory...');

    GameFileSystem.readFile( path.join( CurrentGame.gameinprogress_dir, 'inventory.res')).then( (buffer: Buffer) => {
      this.inventory = new GFFObject(buffer);
      let invArr = this.inventory.RootNode.GetFieldByLabel('ItemList').GetChildStructs();

      this.LoadInventoryItems(invArr, 0, () => {
        if(typeof onLoad === 'function')
          onLoad();
      });
    }).catch((err) => {
      console.error('InventoryLoader', err)
    })

  }

  LoadInventoryItems(invArr: any[], i = 0, onLoad?: Function){
    if(i < invArr.length){
      InventoryManager.addItem(GFFObject.FromStruct(invArr[i]), () => {
        this.LoadInventoryItems(invArr, ++i, onLoad);
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  ModuleLoader(onLoad?: Function){
    console.log('SaveGame', this.getLastModule(), 'Loading Module...');
    GameState.LoadModule(this.getLastModule(), null);
  }

  Save( onSave?: Function ){

    //TODO
    if(GameState.module instanceof Module){
      //Go ahead and run mkdir. It will silently fail if it already exists
      GameFileSystem.mkdir(this.directory, { recursive: false }).then( () => {
        this.savenfo = new GFFObject();

        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'AREANAME')).Value = GameState.module.area.AreaName.GetValue();
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'CHEATUSED')).Value = 0;
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'GAMEPLAYHINT')).Value = 0;
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LASTMODULE')).Value = GameState.module.Area_Name;
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE1')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE2')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE3')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE4')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE5')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE6')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'LIVECONTENT')).Value = 0;

        //Save the portraits of the current party
        for(let i = 0; i < PartyManager.party.length; i++){
          this.savenfo.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'PORTRAIT'+i)).Value = PartyManager.party[i].getPortraitResRef();
        }

        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'SAVEGAMENAME')).Value = '';
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'STORYHINT')).Value = 0;
        this.savenfo.RootNode.AddField(new GFFField(GFFDataType.DWORD, 'TIMEPLAYED')).Value = (GameState.time) | 0;

        this.savenfo.FileType = 'NFO ';
        this.savenfo.Export(path.join(this.directory, 'savenfo.res'), () => {

          //Export PARTYTABLE.res
          let partytable = new GFFObject();
          partytable.RootNode.AddField(new GFFField(GFFDataType.STRUCT, 'GlxyMap'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'JNL_Entries'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'JNL_SortOrder'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_AISTATE'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_AVAIL_NPCS'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_CHEAT_USED'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_CONTROLLED_NP'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_COST_MULT_LIS'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_DLG_MSG_LIST'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_FB_MSG_LIST'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_FOLLOWSTATE'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.DWORD, 'PT_GOLD'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_LAST_GUI_PNL'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_MEMBERS'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'PT_NUM_MEMBERS'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_PAZAAKCARDS'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.LIST, 'PT_PAZSIDELIST'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.DWORD, 'PT_PLAYEDSECONDS'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'PT_SOLOMODE'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN'));
          partytable.RootNode.AddField(new GFFField(GFFDataType.INT, 'PT_XP_POOL'));

          partytable.FileType = 'PT  ';
          partytable.Export(path.join(this.directory, 'PARTYTABLE.res'), () => {

            //Export GLOBALVARS.res
            this.globalVars = new GFFObject();
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatBoolean'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatLocation'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatNumber'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatString'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.VOID, 'ValBoolean'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.VOID, 'ValLocation'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.VOID, 'ValNumber'));
            this.globalVars.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ValString'));

            this.globalVars.FileType = 'GVT ';
            this.globalVars.Export(path.join(this.directory, 'GLOBALVARS.res'), () => {

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

      if(GameState.module instanceof Module){

        MenuManager.LoadScreen.Open();
        MenuManager.LoadScreen.showSavingMessage();

        let base_dir = 'Saves';
        let save_id = replace_id >= 2 ? replace_id : SaveGame.NEXT_SAVE_ID++;

        if(!(await GameFileSystem.exists(base_dir))){
          await GameFileSystem.mkdir(base_dir);
        }

        let save_dir_name = Utility.PadInt(save_id, 6)+' - Game'+(save_id-1);
        let save_dir = path.join( base_dir, save_dir_name );

        if(!(await GameFileSystem.exists(save_dir))){
          await GameFileSystem.mkdir(save_dir);
        }

        MenuManager.LoadScreen.setProgress(25);

        await GameState.module.save();
        MenuManager.LoadScreen.setProgress(50);

        await CurrentGame.ExportToSaveFolder( save_dir );
        MenuManager.LoadScreen.setProgress(75);

        await SaveGame.ExportSaveNFO(save_dir, name);
        await SaveGame.ExportGlobalVars( save_dir );
        await PartyTableManager.export( save_dir );

        GameState.onScreenShot = (tga: TGAObject) => {
          tga.export( path.join( save_dir, 'Screen.tga')).then( (d) => {
            MenuManager.LoadScreen.setProgress(100);
            MenuManager.LoadScreen.Close();
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

      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'AREANAME')).Value = GameState.module.area.AreaName.GetValue();
      nfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'CHEATUSED')).Value = 0;
      nfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'GAMEPLAYHINT')).Value = 0;
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LASTMODULE')).Value = GameState.module.filename.toUpperCase();
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE1')).Value = '';
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE2')).Value = '';
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE3')).Value = '';
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE4')).Value = '';
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE5')).Value = '';
      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE6')).Value = '';
      nfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'LIVECONTENT')).Value = 0;

      //Save the portraits of the current party
      for(let i = 0; i < PartyManager.party.length; i++){
        nfo.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'PORTRAIT'+i)).Value = PartyManager.party[i].getPortraitResRef();
      }

      nfo.RootNode.AddField(new GFFField(GFFDataType.CEXOSTRING, 'SAVEGAMENAME')).Value = savename;
      nfo.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'STORYHINT')).Value = 0;
      nfo.RootNode.AddField(new GFFField(GFFDataType.DWORD, 'TIMEPLAYED')).Value = GameState.time | 0;

      await nfo.Export(path.join(directory, 'savenfo.res'));

      resolve();
    });
  }

  static ExportGlobalVars( directory: string ){
    return new Promise<void>( async (resolve, reject) => {
      console.log('ExportGlobalVars')
      let gvt = new GFFObject();
      gvt.FileType = 'GVT ';

      //Global Booleans
      let catBooleanList  = gvt.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatBoolean'));
      let boolBuffer = Buffer.alloc( ( GlobalVariableManager.Globals.Boolean.size / 8 ) );
      let i = 0;
      GlobalVariableManager.Globals.Boolean.forEach( (globBool, key: string) => {
        let boolean = globBool;
        let byte_offset = Math.floor( i / 8 );
        let bit_index = (i % 8);

        if(boolean.value){
          boolBuffer[byte_offset] |= 1 << bit_index;
        }

        let boolStruct = new GFFStruct();
        boolStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).SetValue(boolean.name);
        catBooleanList.AddChildStruct(boolStruct);
        i++;
      });

      //Global Locations
      let catLocationList  = gvt.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatLocation'));
      let locationBuffer = Buffer.alloc(24 * 100);

      i = 0;
      GlobalVariableManager.Globals.Location.forEach( (location, key: string) => {
        locationBuffer.writeFloatLE( location.value.position.x, (24 * i) + 0  );
        locationBuffer.writeFloatLE( location.value.position.y, (24 * i) + 4  );
        locationBuffer.writeFloatLE( location.value.position.z, (24 * i) + 8  );
        locationBuffer.writeFloatLE( location.value.rotation.x, (24 * i) + 12 );
        locationBuffer.writeFloatLE( location.value.rotation.y, (24 * i) + 16 );
        locationBuffer.writeFloatLE( location.value.rotation.z, (24 * i) + 20 );

        let locStruct = new GFFStruct();
        locStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).SetValue(location.name);
        catLocationList.AddChildStruct(locStruct);
        i++;
      });

      //Global Numbers
      let catNumberList  = gvt.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatNumber'));
      let numberBuffer = Buffer.alloc(GlobalVariableManager.Globals.Number.size);

      i = 0;
      GlobalVariableManager.Globals.Number.forEach( (numberObj, key: string) => {
        numberBuffer[i] = (numberObj.value & 0xFF);

        let numberStruct = new GFFStruct();
        numberStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).SetValue(numberObj.name);
        catNumberList.AddChildStruct(numberStruct);
        i++;
      });

      
      let catStringList  = gvt.RootNode.AddField(new GFFField(GFFDataType.LIST, 'CatString'));

      gvt.RootNode.AddField(new GFFField(GFFDataType.VOID, 'ValBoolean')).SetData( boolBuffer );
      gvt.RootNode.AddField(new GFFField(GFFDataType.VOID, 'ValLocation')).SetData( locationBuffer );
      gvt.RootNode.AddField(new GFFField(GFFDataType.VOID, 'ValNumber')).SetData( numberBuffer );

      let valStringList  = gvt.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ValString'));
      i = 0;
      GlobalVariableManager.Globals.String.forEach( (stringObj, key: string) => {
        let stringCatStruct = new GFFStruct();
        stringCatStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).SetValue(stringObj.name);
        catStringList.AddChildStruct(stringCatStruct);


        let stringValStruct = new GFFStruct();
        stringValStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'String') ).SetValue(stringObj.value);
        valStringList.AddChildStruct(stringValStruct);
        i++;
      });

      await gvt.Export(path.join(directory, 'GLOBALVARS.res'));

      resolve();
    });
  }

  static GetSaveGames(){
    return new Promise<void>( (resolve, reject) => {
      GameFileSystem.readdir(SaveGame.base_directory).then( async (folders) => {
        //Loop through and detect the possible savegame paths
        for(let i = 0; i < folders.length; i++){
          if(SaveGame.FolderRegexValidator.test(folders[i])){
            if(GameFileSystem.exists(path.join(SaveGame.base_directory, folders[i], 'SAVEGAME.sav'))){
              SaveGame.AddSaveGame( new SaveGame(folders[i]) );
            }else{
              //console.log('SaveGame', 'Folder Missing SAVEGAME.sav', folders[i]);
            }
          }else{
            //console.log('SaveGame', 'Folder Invalid', folders[i]);
          }
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

//Clean up the gameinprogress folder on startup
try{
  GameFileSystem.rmdir( CurrentGame.gameinprogress_dir, {recursive: true});
}catch(e){
  console.error('SaveGame', 'delete gameinprogress directory error', e);
}
