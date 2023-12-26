/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as path from "path";
import { GFFObject } from "./resource/GFFObject";
import { TextureLoader } from "./loaders";
import { OdysseyTexture } from "./resource/OdysseyTexture";
import { CurrentGame } from "./CurrentGame";
import { GFFField } from "./resource/GFFField";
import { GameState } from "./GameState";
import { GFFDataType } from "./enums/resource/GFFDataType";
import { GFFStruct } from "./resource/GFFStruct";
import { ApplicationProfile } from "./utility/ApplicationProfile";
import { ERFObject } from "./resource/ERFObject";
import { BinaryReader } from "./BinaryReader";
import { Utility } from "./utility/Utility";
import { TGAObject } from "./resource/TGAObject";
import { Module } from "./module";
import EngineLocation from "./engine/EngineLocation";
import { GameFileSystem } from "./utility/GameFileSystem";
import { PartyTableManager, PartyManager, GlobalVariableManager, InventoryManager, MenuManager } from "./managers";

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

    this.folderName = name.split('/').pop();
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
              if(pifo.RootNode.hasField('Mod_PlayerList')){
                let playerList = pifo.getFieldByLabel('Mod_PlayerList').getChildStructs();
                if(playerList.length){
                  PartyManager.PlayerTemplate = GFFObject.FromStruct(playerList[0]);
                }
              }
              resolve();
            }, () => {
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

      if(savenfo.RootNode.hasField('AREANAME')){
        this.AREANAME = savenfo.getFieldByLabel('AREANAME').getValue()
      }

      if(savenfo.RootNode.hasField('CHEATUSED')){
        this.CHEATUSED = savenfo.getFieldByLabel('CHEATUSED').getValue()
      }

      if(savenfo.RootNode.hasField('GAMEPLAYHINT')){
        this.GAMEPLAYHINT = savenfo.getFieldByLabel('GAMEPLAYHINT').getValue()
      }

      if(savenfo.RootNode.hasField('LASTMODULE')){
        this.LASTMODULE = savenfo.getFieldByLabel('LASTMODULE').getValue()
      }

      if(savenfo.RootNode.hasField('LIVE1')){
        this.LIVE1 = savenfo.getFieldByLabel('LIVE1').getValue()
      }

      if(savenfo.RootNode.hasField('LIVE2')){
        this.LIVE2 = savenfo.getFieldByLabel('LIVE2').getValue()
      }

      if(savenfo.RootNode.hasField('LIVE3')){
        this.LIVE3 = savenfo.getFieldByLabel('LIVE3').getValue()
      }

      if(savenfo.RootNode.hasField('LIVE4')){
        this.LIVE4 = savenfo.getFieldByLabel('LIVE4').getValue()
      }

      if(savenfo.RootNode.hasField('LIVE5')){
        this.LIVE5 = savenfo.getFieldByLabel('LIVE5').getValue()
      }

      if(savenfo.RootNode.hasField('LIVE6')){
        this.LIVE6 = savenfo.getFieldByLabel('LIVE6').getValue()
      }

      if(savenfo.RootNode.hasField('LIVECONTENT')){
        this.LIVECONTENT = savenfo.getFieldByLabel('LIVECONTENT').getValue()
      }

      if(savenfo.RootNode.hasField('PORTRAIT0')){
        this.PORTRAIT0 = savenfo.getFieldByLabel('PORTRAIT0').getValue()
      }

      if(savenfo.RootNode.hasField('PORTRAIT1')){
        this.PORTRAIT1 = savenfo.getFieldByLabel('PORTRAIT1').getValue()
      }

      if(savenfo.RootNode.hasField('PORTRAIT2')){
        this.PORTRAIT2 = savenfo.getFieldByLabel('PORTRAIT2').getValue()
      }

      if(savenfo.RootNode.hasField('SAVEGAMENAME')){
        this.SAVEGAMENAME = savenfo.getFieldByLabel('SAVEGAMENAME').getValue()
      }

      if(savenfo.RootNode.hasField('STORYHINT')){
        this.STORYHINT = savenfo.getFieldByLabel('STORYHINT').getValue()
      }

      if(savenfo.RootNode.hasField('TIMEPLAYED')){
        this.TIMEPLAYED = savenfo.getFieldByLabel('TIMEPLAYED').getValue()
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
    CurrentGame.InitGameInProgressFolder(true).then( () => {
      CurrentGame.ExtractERFToGameInProgress( this.SAVEGAME ).then( () => {
        if(typeof onLoad === 'function')
          onLoad();
      });
    });
  }

  InitSaveGameResourceLoader(onLoad?: Function){
    this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'));
    this.SAVEGAME.load().then((sav: ERFObject) => {
      this.isLoaded = true;
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  GlobalVARSLoader(onLoad?: Function){
    console.log('SaveGame', 'Loading GlobalVARS...');
    this.globalVars = new GFFObject(path.join(this.directory, 'GLOBALVARS.res'), (globalVars) => {

      let numBytes = new BinaryReader(globalVars.RootNode.getFieldByLabel('ValNumber').getVoid());
      let catNumbers = globalVars.getFieldByLabel('CatNumber').getChildStructs();
      for(let i = 0; i < catNumbers.length; i++){
        let numCat = catNumbers[i];
        let numLabel = numCat.getFieldByLabel('Name').getValue();
        let value = numBytes.readByte();
        if(GlobalVariableManager.Globals.Number.has(numLabel.toLowerCase())){
          GlobalVariableManager.Globals.Number.get(numLabel.toLowerCase()).value = value;
        }else{
          GlobalVariableManager.Globals.Number.set(numLabel.toLowerCase(), {name: numLabel.toLowerCase(), value: value});
          console.warn('Global Number: missing', numLabel.toLowerCase(), value);
        }
      }

      let locBytes = new BinaryReader(globalVars.RootNode.getFieldByLabel('ValLocation').getVoid());
      let catLocations = globalVars.getFieldByLabel('CatLocation').getChildStructs();
      for(let i = 0; i < catLocations.length; i++){
        let locCat = catLocations[i];
        let locLabel = locCat.getFieldByLabel('Name').getValue();

        GlobalVariableManager.Globals.Location.set(
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

      let boolBytes = globalVars.RootNode.getFieldByLabel('ValBoolean').getVoid();
      let catBooleans = globalVars.getFieldByLabel('CatBoolean').getChildStructs();
      let maxBits = boolBytes.length * 8;
      for(let i = 0; i < maxBits; i++){
        for(let j = 0; j < 8; j++){
          let index = (i * 8) + j;
          let bit = (boolBytes[i] >> 7-j) & 1; //reverse the bit index because of ENDIANS -_-

          let boolCat = catBooleans[index];
          if(boolCat){
            let boolLabel = boolCat.getFieldByLabel('Name').getValue();
            let value = !!bit;
            if(GlobalVariableManager.Globals.Boolean.has(boolLabel.toLowerCase())){
              GlobalVariableManager.Globals.Boolean.get(boolLabel.toLowerCase()).value = value;
            }else{
              GlobalVariableManager.Globals.Boolean.set(boolLabel.toLowerCase(), {name: boolLabel.toLowerCase(), value: value});
              console.warn('Global Boolean: missing', boolLabel.toLowerCase(), value);
            }
          }
        }
      }

      let stringValues = globalVars.RootNode.getFieldByLabel('ValString').getChildStructs();
      let catStrings = globalVars.getFieldByLabel('CatString').getChildStructs();
      for(let i = 0; i < catStrings.length; i++){
        let strCat = catStrings[i];
        if(strCat){
          let strLabel = strCat.getFieldByLabel('Name').getValue();
          let strValue = stringValues[i].getFieldByLabel('String').getValue();
          if(GlobalVariableManager.Globals.String.has(strLabel.toLowerCase())){
            GlobalVariableManager.Globals.String.get(strLabel.toLowerCase()).value = strValue;
          }else{
            GlobalVariableManager.Globals.String.set(strLabel.toLowerCase(), {name: strLabel.toLowerCase(), value: strValue});
            console.warn('Global String: missing', strLabel.toLowerCase(), strValue);
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
      let invArr = this.inventory.RootNode.getFieldByLabel('ItemList').getChildStructs();
      for(let i = 0; i < invArr.length; i++){
        InventoryManager.addItem(GFFObject.FromStruct(invArr[i]));
      }
      if(typeof onLoad === 'function')
        onLoad();
    }).catch((err) => {
      console.error('InventoryLoader', err)
      if(typeof onLoad === 'function')
        onLoad();
    })

  }

  ModuleLoader(onLoad?: Function){
    console.log('SaveGame', this.getLastModule(), 'Loading Module...');
    GameState.LoadModule(this.getLastModule(), null);
  }

  Save(){
    //TODO
    if(GameState.module instanceof Module){
      //Go ahead and run mkdir. It will silently fail if it already exists
      GameFileSystem.mkdir(this.directory, { recursive: false }).then( () => {
        this.savenfo = new GFFObject();

        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'AREANAME')).value = GameState.module.area.AreaName.getValue();
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'CHEATUSED')).value = 0;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'GAMEPLAYHINT')).value = 0;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LASTMODULE')).value = GameState.module.Area_Name;
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE1')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE2')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE3')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE4')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE5')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'LIVE6')).value = '';
        this.savenfo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'LIVECONTENT')).value = 0;

        //Save the portraits of the current party
        for(let i = 0; i < PartyManager.party.length; i++){
          this.savenfo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'PORTRAIT'+i)).value = PartyManager.party[i].getPortraitResRef();
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

      if(GameState.module instanceof Module){

        MenuManager.LoadScreen.open();
        MenuManager.LoadScreen.showSavingMessage();

        let save_id = replace_id >= 2 ? replace_id : SaveGame.NEXT_SAVE_ID++;

        if(!(await GameFileSystem.exists(SaveGame.base_directory))){
          await GameFileSystem.mkdir(SaveGame.base_directory);
        }

        let save_dir_name = Utility.PadInt(save_id, 6)+' - Game'+(save_id-1);
        let save_dir = path.join( SaveGame.base_directory, save_dir_name );

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
            MenuManager.LoadScreen.close();
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

      nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'AREANAME')).value = GameState.module.area.AreaName.getValue();
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
      for(let i = 0; i < PartyManager.party.length; i++){
        nfo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'PORTRAIT'+i)).value = PartyManager.party[i].getPortraitResRef();
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
        boolStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(boolean.name);
        catBooleanList.addChildStruct(boolStruct);
        i++;
      });

      //Global Locations
      let catLocationList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatLocation'));
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
        locStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name') ).setValue(location.name);
        catLocationList.addChildStruct(locStruct);
        i++;
      });

      //Global Numbers
      let catNumberList  = gvt.RootNode.addField(new GFFField(GFFDataType.LIST, 'CatNumber'));
      let numberBuffer = Buffer.alloc(GlobalVariableManager.Globals.Number.size);

      i = 0;
      GlobalVariableManager.Globals.Number.forEach( (numberObj, key: string) => {
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
      GlobalVariableManager.Globals.String.forEach( (stringObj, key: string) => {
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
