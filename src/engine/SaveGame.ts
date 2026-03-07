import * as path from "path";
import { GFFObject } from "../resource/GFFObject";
import { TextureLoader } from "../loaders";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { CurrentGame } from "./CurrentGame";
import { GFFField } from "../resource/GFFField";
import { GameState } from "../GameState";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { ERFObject } from "../resource/ERFObject";
import { BinaryReader } from "../utility/binary/BinaryReader";
import { Utility } from "../utility/Utility";
import EngineLocation from "./EngineLocation";
import { GameFileSystem } from "../utility/GameFileSystem";
import { ResourceTypes } from "../KotOR";
import { exists } from "fs";

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
  /** The folder name of the save game (e.g., "000001 - AUTOSAVE") */
  folderName: string;
  /** Whether the save game has been fully loaded */
  isLoaded: boolean;
  /** The name of the area where the save was created */
  AREANAME: string;
  /** The last module that was loaded when the save was created */
  LASTMODULE: string;
  /** The custom name assigned to the save game */
  SAVEGAMENAME: string;
  /** The total time played in seconds */
  TIMEPLAYED: number;
  /** The timestamp when the save was created */
  TIMESTAMP: Date;
  /** Gameplay hint value (unused in most cases) */
  GAMEPLAYHINT: number;
  /** Story hint value (unused in most cases) */
  STORYHINT: number;
  /** The thumbnail texture for the save game */
  thumbnail: OdysseyTexture;
  /** The Player Information File Object containing player template data */
  pifo: GFFObject;
  /** The save game metadata object */
  savenfo: GFFObject;
  /** The player character data object */
  pc: GFFObject;
  /** Whether cheats were used in this save game */
  CHEATUSED: boolean;
  /** Live content string 1 (unused in most cases) */
  LIVE1: string;
  /** Live content string 2 (unused in most cases) */
  LIVE2: string;
  /** Live content string 3 (unused in most cases) */
  LIVE3: string;
  /** Live content string 4 (unused in most cases) */
  LIVE4: string;
  /** Live content string 5 (unused in most cases) */
  LIVE5: string;
  /** Live content string 6 (unused in most cases) */
  LIVE6: string;
  /** Live content data (unused in most cases) */
  LIVECONTENT: any;
  /** Portrait resource reference for party member 0 */
  PORTRAIT0: string;
  /** Portrait resource reference for party member 1 */
  PORTRAIT1: string;
  /** Portrait resource reference for party member 2 */
  PORTRAIT2: string;
  /** The global variables object */
  globalVars: GFFObject;
  /** The inventory data object */
  inventory: GFFObject;
  /** The full directory path to the save game folder */
  directory: string;
  /** The player character name */
  PCNAME: string;
  /** Whether this is a new save game being created */
  isNewSave = false;


  /** Array of all loaded save games */
  static saves: SaveGame[] = [];
  /** Base directory where save games are stored */
  static base_directory: string = 'Saves';

  /** Regular expression to validate save game folder names */
  static FolderRegexValidator: RegExp = /^(\d+) - (Game\d+)$|^(000000) - (QUICKSAVE)$|^(000001) - (AUTOSAVE)$/;
  /** Regular expression to match valid save game folder name patterns */
  static FolderNameRegex: RegExp = /^(\d+) - (QUICKSAVE|AUTOSAVE|Game\d+)$/;
  /** The next available save ID for new saves */
  static NEXT_SAVE_ID: number = 1;
  /** The ERF object containing the save game data */
  SAVEGAME: ERFObject;
  //NEXT_SAVE_ID - 0 QUICKSAVE
  //NEXT_SAVE_ID - 1 AUTOSAVE
  //NEXT_SAVE_ID - X Higher than 1 is a custom save game


  /**
   * Creates a new SaveGame instance.
   *
   * @param {string} [name=''] - The folder name or path of the save game. If a full path is provided, only the folder name will be used.
   *
   * @example
   * // Create a save game from folder name
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   *
   * // Create a save game from full path
   * const saveGame = new SaveGame('Saves/000001 - AUTOSAVE');
   */
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
   * Loads the save game metadata from the savenfo.res file.
   *
   * This method reads the savenfo.res file from the save game directory and populates
   * all the metadata properties including area name, module name, save name, time played,
   * timestamps, portraits, and other save game information.
   *
   * @async
   * @returns {Promise<void>} Resolves when the metadata has been loaded.
   *
   * @throws {Error} Throws an error if the savenfo.res file cannot be read or parsed.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.loadNFO();
   * console.log(saveGame.getAreaName()); // "Endar Spire"
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

  /**
   * Loads the Player Information File Object (PIFO) from the save game.
   *
   * The PIFO contains player character template information and is used to restore
   * the player's character data when loading a save game. This method loads the
   * pifo.ifo file and sets up the player template in the PartyManager.
   *
   * @async
   * @returns {Promise<void>} Resolves when the PIFO has been loaded and processed.
   *
   * @throws {Error} Throws an error if the pifo.ifo file cannot be read or parsed.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.loadPIFO();
   * // Player template is now available in GameState.PartyManager.PlayerTemplate
   */
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

  /**
   * Loads the Player Character (PC) data from the save game.
   *
   * This method extracts the player character data from the SAVEGAME.sav file
   * and loads it into a GFFObject for further processing. The PC data contains
   * the current state of the player character including stats, inventory, and
   * other character-specific information.
   *
   * @async
   * @returns {Promise<void>} Resolves when the PC data has been loaded.
   *
   * @throws {Error} Throws an error if the PC data cannot be extracted or parsed.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.loadPC();
   * // PC data is now available in saveGame.pc
   */
  async loadPC(){
    try{
      const buffer = await this.SAVEGAME.getResourceBufferByResRef('pc', ResourceTypes.utc);
      if(!buffer){ return; }
      this.pc = new GFFObject(buffer);
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Loads a complete save game and restores the game state.
   *
   * This is the main method for loading a save game. It performs the following operations:
   * 1. Sets up the loading state and tutorial tracking
   * 2. Restores the game time from the save
   * 3. Sets up portrait order for party members
   * 4. Initializes the save game resource loader
   * 5. Creates the game in progress folder
   * 6. Loads global variables
   * 7. Loads party table data
   * 8. Loads player information (PIFO and PC)
   * 9. Loads the last module that was being played
   *
   * @async
   * @returns {Promise<void>} Resolves when the save game has been completely loaded.
   *
   * @throws {Error} Throws an error if any part of the loading process fails.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.load();
   * // Game state is now restored and ready to play
   */
  async load(){
    localStorage.setItem(`${GameState.GameKey}_last_save_id`, SaveGame.saves.indexOf(this).toString());
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

  /**
   * Initializes the game in progress folder and extracts save game resources.
   *
   * This method creates the game in progress folder structure and extracts
   * all necessary resources from the SAVEGAME.sav file to make them available
   * for the game engine to use during gameplay.
   *
   * @async
   * @returns {Promise<void>} Resolves when the game in progress folder has been initialized.
   *
   * @throws {Error} Throws an error if the folder creation or resource extraction fails.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.initGameInProgressFolder();
   * // Game resources are now available in the game in progress folder
   */
  async initGameInProgressFolder(){
    await CurrentGame.InitGameInProgressFolder(true);
    await CurrentGame.ExtractERFToGameInProgress( this.SAVEGAME );
  }

  /**
   * Initializes the save game resource loader by loading the SAVEGAME.sav file.
   *
   * This method creates an ERFObject from the SAVEGAME.sav file and loads it,
   * making all the save game resources available for extraction and use.
   * The SAVEGAME.sav file is an ERF (Encapsulated Resource File) containing
   * all the game state data, modules, and other resources needed to restore
   * the game to its saved state.
   *
   * @async
   * @returns {Promise<void>} Resolves when the save game resource loader has been initialized.
   *
   * @throws {Error} Throws an error if the SAVEGAME.sav file cannot be loaded.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.initSaveGameResourceLoader();
   * // SAVEGAME.sav is now loaded and ready for resource extraction
   */
  async initSaveGameResourceLoader(){
    this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'));
    await this.SAVEGAME.load();
    this.isLoaded = true;
  }

  /**
   * Loads global variables from the GLOBALVARS.res file.
   *
   * This method reads and parses the global variables file, which contains
   * all the game's global state including numbers, booleans, strings, and
   * locations. These variables are used to track quest progress, story state,
   * and other persistent game data across save/load cycles.
   *
   * The method handles different data types:
   * - Numbers: Stored as byte values
   * - Booleans: Stored as bit flags in a byte array
   * - Strings: Stored as CExoString values
   * - Locations: Stored as 6 float values (x, y, z, rx, ry, rz)
   *
   * @async
   * @returns {Promise<void>} Resolves when all global variables have been loaded.
   *
   * @throws {Error} Throws an error if the GLOBALVARS.res file cannot be read or parsed.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.loadGlobalVARS();
   * // Global variables are now available in GameState.GlobalVariableManager
   */
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

  /**
   * Loads the party table data from the PARTYTABLE.res file.
   *
   * This method reads the party table file which contains information about
   * all party members, their stats, equipment, and other character data.
   * The party table is used to restore the complete state of all party
   * members when loading a save game.
   *
   * @async
   * @returns {Promise<void>} Resolves when the party table has been loaded.
   *
   * @throws {Error} Throws an error if the PARTYTABLE.res file cannot be read or parsed.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.loadPartyTable();
   * // Party data is now available in GameState.PartyManager
   */
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

  /**
   * Loads the inventory data from the inventory.res file.
   *
   * This method reads the inventory file which contains all items in the
   * player's inventory and adds them to the InventoryManager. The inventory
   * data includes item properties, quantities, and other item-specific
   * information needed to restore the player's items.
   *
   * @async
   * @returns {Promise<void>} Resolves when the inventory has been loaded.
   *
   * @throws {Error} Throws an error if the inventory.res file cannot be read or parsed.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.loadInventory();
   * // Inventory items are now available in GameState.InventoryManager
   */
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

  /**
   * Gets the area name where the save game was created.
   *
   * @returns {string} The name of the area where the game was saved.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * console.log(saveGame.getAreaName()); // "Endar Spire"
   */
  getAreaName(){
    return this.AREANAME;
  }

  /**
   * Gets the last module that was being played when the save was created.
   *
   * @returns {string} The name of the last module that was loaded.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * console.log(saveGame.getLastModule()); // "001EBO"
   */
  getLastModule(){
    return this.LASTMODULE;
  }

  /**
   * Gets the custom name assigned to the save game.
   *
   * @returns {string} The custom name of the save game, or empty string if none was set.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * console.log(saveGame.getSaveName()); // "My Save Game" or ""
   */
  getSaveName(){
    return this.SAVEGAMENAME;
  }

  /**
   * Gets the full display name of the save game.
   *
   * This combines the save type (Game, AUTOSAVE, QUICKSAVE) with the custom
   * save name if one was provided. If no custom name was set, only the
   * save type is returned.
   *
   * @returns {string} The full display name of the save game.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * console.log(saveGame.getFullName()); // "AUTOSAVE"
   *
   * const customSave = new SaveGame('000002 - Game1');
   * customSave.SAVEGAMENAME = 'My Adventure';
   * console.log(customSave.getFullName()); // "Game1 - My Adventure"
   */
  getFullName(){
    if(this.getSaveName() != ''){
      return this.folderName.split(' - ')[1] + ' - ' + this.getSaveName();
    }else{
      return this.folderName.split(' - ')[1];
    }
  }

  /**
   * Checks if this save game is an automatic save.
   *
   * @returns {boolean} True if this is an autosave, false otherwise.
   *
   * @example
   * const autoSave = new SaveGame('000001 - AUTOSAVE');
   * console.log(autoSave.getIsAutoSave()); // true
   *
   * const manualSave = new SaveGame('000002 - Game1');
   * console.log(manualSave.getIsAutoSave()); // false
   */
  getIsAutoSave(){
    return this.folderName.split(' - ')[1] == 'AUTOSAVE';
  }

  /**
   * Checks if this save game is a quick save.
   *
   * @returns {boolean} True if this is a quicksave, false otherwise.
   *
   * @example
   * const quickSave = new SaveGame('000000 - QUICKSAVE');
   * console.log(quickSave.getIsQuickSave()); // true
   *
   * const manualSave = new SaveGame('000002 - Game1');
   * console.log(manualSave.getIsQuickSave()); // false
   */
  getIsQuickSave(){
    return this.folderName.split(' - ')[1] == 'QUICKSAVE';
  }

  /**
   * Gets the save number from the folder name.
   *
   * @returns {number} The numeric ID of the save game.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * console.log(saveGame.getSaveNumber()); // 1
   *
   * const quickSave = new SaveGame('000000 - QUICKSAVE');
   * console.log(quickSave.getSaveNumber()); // 0
   */
  getSaveNumber(){
    return parseInt(this.folderName.split(' - ')[0]);
  }

  /**
   * Gets the number of hours played in this save game.
   *
   * @returns {number} The number of hours played, rounded down to the nearest integer.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * saveGame.TIMEPLAYED = 7200; // 2 hours in seconds
   * console.log(saveGame.getHoursPlayed()); // 2
   */
  getHoursPlayed(){
    return Math.floor(this.TIMEPLAYED / 3600);
  }

  /**
   * Gets the number of minutes played in this save game (excluding full hours).
   *
   * @returns {number} The number of minutes played, rounded down to the nearest integer.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * saveGame.TIMEPLAYED = 7320; // 2 hours and 2 minutes in seconds
   * console.log(saveGame.getMinutesPlayed()); // 2
   */
  getMinutesPlayed(){
    return Math.floor(60 * ((this.TIMEPLAYED / 3600) % 1));
  }

  /**
   * Gets the thumbnail texture for this save game.
   *
   * This method loads the screenshot thumbnail that was captured when the save
   * was created. It first tries to load the Screen.tga file from the save
   * directory, then falls back to a module-specific loading screen, and
   * finally to a default white fill texture if all else fails.
   *
   * @async
   * @returns {Promise<OdysseyTexture>} The thumbnail texture for the save game.
   *
   * @throws {Error} Throws an error if no thumbnail can be loaded.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * const thumbnail = await saveGame.getThumbnail();
   * // Use thumbnail in UI
   */
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

  /**
   * Gets the portrait texture for the specified party member.
   *
   * This method loads the portrait texture for a party member based on their
   * position in the party (0-based index). The portrait name is stored in
   * the PORTRAIT0, PORTRAIT1, PORTRAIT2, etc. properties.
   *
   * @async
   * @param {number} [nth=0] - The party member index (0-based).
   * @returns {Promise<OdysseyTexture|undefined>} The portrait texture, or undefined if not found.
   *
   * @throws {Error} Throws an error if the portrait texture cannot be loaded.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * const playerPortrait = await saveGame.getPortrait(0); // First party member
   * const companionPortrait = await saveGame.getPortrait(1); // Second party member
   */
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

  /**
   * Saves the current game state to this save game.
   *
   * Order matches CServerExoAppInternal::StallEventSaveGame (reva): StoreCurrentModule
   * (module.save() → gameinprogress), CSWPartyTable::Save, CSWGlobalVariableTable::Save,
   * SavePrimaryPlayerInfo (if any), savenfo.res (NFO), then CERFFile::ImportFiles from
   * GAMEINPROGRESS into SAVEGAME.sav. CServerExoAppInternal::SaveGame does CreateDirectory
   * (or CleanDirectory), optional disk-space check (HasEnoughDiskSpaceForSaveGame), then
   * DoSaveGameScreenShot before the stall event; we take the screenshot after exports.
   *
   * @async
   * @returns {Promise<void>} Resolves when the save operation is complete.
   * @throws {Error} Throws an error if the save operation fails.
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * await saveGame.Save();
   */
  async Save(): Promise<void> {
    if (!GameState.module) {
      return;
    }
    try {
      await GameFileSystem.mkdir(this.directory, { recursive: true });

      // 1. StoreCurrentModule equivalent: persist module/area to gameinprogress
      await GameState.module.save();

      // 2. CSWPartyTable::Save(save_dir, 1)
      await GameState.PartyManager.Export(this.directory);

      // 3. CSWGlobalVariableTable::Save(save_dir)
      await SaveGame.ExportGlobalVars(this.directory);

      // 4. savenfo.res (NFO V2.0): AREANAME, LASTMODULE, TIMEPLAYED, CHEATUSED, SAVEGAMENAME, GAMEPLAYHINT, STORYHINT, LIVE*, PORTRAIT*
      await SaveGame.ExportSaveNFO(this.directory, this.SAVEGAMENAME);

      // 5. Pack GAMEINPROGRESS into SAVEGAME.sav (CERFFile::ImportFiles from gameinprogress)
      await CurrentGame.ExportToSaveFolder(this.directory);

      // 6. Screenshot (binary does DoSaveGameScreenShot in SaveGame() before stall event)
      const tga = await GameState.GetScreenShot();
      await tga.export(path.join(this.directory, 'Screen.tga'));

      // 7. Refresh metadata on this instance
      this.AREANAME = GameState.module.area?.areaName?.getValue?.() ?? this.AREANAME;
      this.LASTMODULE = GameState.module.filename ? GameState.module.filename.toUpperCase() : this.LASTMODULE;
      this.TIMEPLAYED = GameState.time ?? this.TIMEPLAYED;
      this.TIMESTAMP = new Date();
      this.PCNAME = (GameState.PartyManager?.Player as any)?.getName?.() ?? this.PCNAME ?? '';
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * Creates a new save game with the current game state.
   *
   * This static method creates a complete new save game including:
   * 1. Creating the save directory structure
   * 2. Saving the current module state
   * 3. Exporting game resources to the save folder
   * 4. Creating save metadata (savenfo.res)
   * 5. Exporting global variables
   * 6. Exporting party data
   * 7. Capturing and saving a screenshot thumbnail
   *
   * @static
   * @async
   * @param {string} [name=''] - The custom name for the save game.
   * @param {number} [replace_id=0] - The ID to use for the save game. If 0 or 1, uses the next available ID.
   * @returns {Promise<void>} Resolves when the save operation is complete.
   *
   * @throws {Error} Throws an error if the save operation fails.
   *
   * @example
   * // Create a new save game
   * await SaveGame.SaveCurrentGame('My Adventure');
   *
   * // Create an autosave
   * await SaveGame.SaveCurrentGame('', 1);
   */
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
    GameState.MenuManager.LoadScreen.setProgress(35);

    await GameState.PartyManager.Export(save_dir);
    GameState.MenuManager.LoadScreen.setProgress(50);

    await SaveGame.ExportGlobalVars(save_dir);
    GameState.MenuManager.LoadScreen.setProgress(65);

    await SaveGame.ExportSaveNFO(save_dir, name);
    GameState.MenuManager.LoadScreen.setProgress(75);

    await CurrentGame.ExportToSaveFolder(save_dir);
    GameState.MenuManager.LoadScreen.setProgress(90);

    const tga = await GameState.GetScreenShot();
    await tga.export(path.join(save_dir, 'Screen.tga'));

    const newEntry = new SaveGame(save_dir_name);
    const existingIndex = SaveGame.saves.findIndex(s => s.getSaveNumber() === save_id);

    if (existingIndex >= 0) {
      SaveGame.saves[existingIndex] = newEntry;  // overwrite case
  } else {
      SaveGame.AddSaveGame(newEntry);            // new save case
            }
    await newEntry.loadNFO();
    
    //Save Complete
    GameState.MenuManager.LoadScreen.setProgress(100);
    GameState.MenuManager.LoadScreen.close();
  }

  /**
   * Exports the save game metadata to a savenfo.res file.
   *
   * This static method creates the savenfo.res file containing all the
   * metadata needed to display the save game in the save/load menu.
   * The metadata includes area name, module name, save name, time played,
   * timestamps, party portraits, and other display information.
   *
   * @static
   * @async
   * @param {string} directory - The directory where the savenfo.res file should be created.
   * @param {string} savename - The custom name for the save game.
   * @returns {Promise<void>} Resolves when the savenfo.res file has been created.
   *
   * @throws {Error} Throws an error if the file cannot be created.
   *
   * @example
   * await SaveGame.ExportSaveNFO('Saves/000001 - Game1', 'My Adventure');
   * // savenfo.res file created with metadata
   */
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

    const pcName = (GameState.PartyManager?.Player as any)?.getName?.() ?? '';
    nfo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'PCNAME')).value = pcName;

    const now = Date.now();
    const timestamp100ns = BigInt(Math.floor((now - winEpoch) * 10000));
    nfo.RootNode.addField(new GFFField(GFFDataType.DWORD64, 'TIMESTAMP')).setValue(timestamp100ns);

    await nfo.export(path.join(directory, 'savenfo.res'));
  }

  /**
   * Exports the global variables to a GLOBALVARS.res file.
   *
   * This static method creates the GLOBALVARS.res file containing all the
   * current global variables from the GlobalVariableManager. The variables
   * are stored in different formats based on their type:
   * - Numbers: Stored as byte values
   * - Booleans: Stored as bit flags in a byte array
   * - Strings: Stored as CExoString values
   * - Locations: Stored as 6 float values (x, y, z, rx, ry, rz)
   *
   * @static
   * @async
   * @param {string} directory - The directory where the GLOBALVARS.res file should be created.
   * @returns {Promise<void>} Resolves when the GLOBALVARS.res file has been created.
   *
   * @throws {Error} Throws an error if the file cannot be created.
   *
   * @example
   * await SaveGame.ExportGlobalVars('Saves/000001 - Game1');
   * // GLOBALVARS.res file created with current global variables
   */
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

  /**
   * Scans the save game directory and loads all available save games.
   *
   * This static method searches the Saves directory for all folders containing
   * SAVEGAME.sav files and creates SaveGame instances for each one found.
   * The save games are added to the static saves array and the NEXT_SAVE_ID
   * is updated based on the highest save number found.
   *
   * @static
   * @async
   * @returns {Promise<void>} Resolves when all save games have been loaded.
   *
   * @throws {Error} Throws an error if the save directory cannot be read.
   *
   * @example
   * await SaveGame.GetSaveGames();
   * console.log(SaveGame.saves.length); // Number of save games found
   * console.log(SaveGame.NEXT_SAVE_ID); // Next available save ID
   */
  static async GetSaveGames(){
    try{
      const savegamesRAW = await GameFileSystem.readdir('Saves', {list_dirs: false, recursive: true});
      const savegames = savegamesRAW.filter((path) => path.includes('SAVEGAME.sav'));

      for(let i = 0; i < savegames.length; i++){
        const saveFolder = savegames[i].replace(path.sep+'SAVEGAME.sav', '');
        SaveGame.AddSaveGame( new SaveGame(saveFolder) );
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

  /**
   * Deletes a save game from disk and removes it from the in-memory save list.
   *
   * Used by the Save/Load UI (and any other systems) to implement KotOR-style delete.
   */
  static async DeleteSave(save: SaveGame): Promise<void> {
    if (!(save instanceof SaveGame)) return;
    if (!save.directory) return;
    await GameFileSystem.rmdir(save.directory, { recursive: true });
    SaveGame.saves = SaveGame.saves.filter(s => s !== save);
  }

  /**
   * Overwrites an existing save slot without prompting for a new name (vanilla KotOR behavior).
   */
  static async OverwriteSave(save: SaveGame): Promise<void> {
    if (!(save instanceof SaveGame)) return;
    const replaceId = save.getSaveNumber();
    const existingName = save.getSaveName();
    await SaveGame.SaveCurrentGame(existingName, replaceId);
  }
  
  /** The directory path for the current save game (used internally) */
  static directory: string;

  /**
   * Adds a save game to the static saves array and updates the next save ID.
   *
   * This static method adds a SaveGame instance to the saves array and
   * updates the NEXT_SAVE_ID if the added save game has a higher ID than
   * the current next ID. This ensures that new saves get unique IDs.
   *
   * @static
   * @param {SaveGame} savegame - The SaveGame instance to add to the list.
   * @returns {void}
   *
   * @example
   * const saveGame = new SaveGame('000001 - AUTOSAVE');
   * SaveGame.AddSaveGame(saveGame);
   * // saveGame is now in SaveGame.saves array
   */
  static AddSaveGame( savegame: SaveGame ){
    if(!(savegame instanceof SaveGame)){ return; }

    const len = SaveGame.saves.push( savegame );
    const lastSave = SaveGame.saves[len - 1];
    const saveNumber = lastSave.getSaveNumber();
    if(saveNumber >= SaveGame.NEXT_SAVE_ID){
      SaveGame.NEXT_SAVE_ID = saveNumber + 1;
    }
  }

}
