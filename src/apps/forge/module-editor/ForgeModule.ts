import * as KotOR from "@/apps/forge/KotOR";
import type { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import type { UI3DRenderer } from "@/apps/forge/UI3DRenderer";


type ModuleScriptKeys = 'Mod_OnAcquirItem'|'Mod_OnActvtItem'|'Mod_OnClientEntr'|'Mod_OnClientLeav'|'Mod_OnHeartbeat'|'Mod_OnModLoad'|'Mod_OnModStart'|'Mod_OnPlrDeath'|'Mod_OnPlrDying'|'Mod_OnPlrLvlUp'|'Mod_OnPlrRest'|'Mod_OnSpawnBtnDn'|'Mod_OnUnAqreItem'|'Mod_OnUsrDefined';

export class ForgeModule {

  ifo: KotOR.GFFObject;
  context: UI3DRenderer;

  area: ForgeArea;
  areas: ForgeArea[] = [];
  entryArea: string = 'm01aa';
  entryDirectionX: number = 0.00;
  entryDirectionY: number = 1.00;
  entryX: number = 0.00;
  entryY: number = 0.00;
  entryZ: number = 0.00;
  
  scriptResRefs: Map<ModuleScriptKeys, string> = new Map<ModuleScriptKeys, string>();

  timeManager: KotOR.ModuleTimeManager = new KotOR.ModuleTimeManager();

  archives: (KotOR.RIMObject|KotOR.ERFObject)[] = [];
  customTokens: Map<number, string>;
  transition: any;
  transWP: string;

  /**
   * Description of module
   */
  description: KotOR.CExoLocString = new KotOR.CExoLocString(-1);

  /**
   * Game hour at which dawn begins (0-23). Area lighting will begin transitioning from Night to Day colors over the course of 1 game hour.
   */
  dawnHour: number = 6;

  /**
   * Game hour at which dusk begins (0-23). Area lighting will begin transitioning from Day to Night colors over the course of 1 game hour
   */
  duskHour: number = 18;

  /**
   * Bit flags specifying what expansion packs are required to run this module. Once a bit is set, it is never unset. Bit 0 = Expansion 1, Bit 1 = Expansion 2, etc
   */
  expansionPack: number = 0;

  /**
   * Arbitrarily generated 16-byte number sequence assigned when toolset creates a new module. It is never
   * modified afterward by toolset. The game saves out 32 bytes instead of 16. Applications other than the toolset
   * can set this to all null bytes when creating a new IFO file.
   */
  id: Uint8Array = new Uint8Array(16);

  /**
   * Name of module
   */
  name: KotOR.CExoLocString = new KotOR.CExoLocString(-1);

  /**
   * Module's Tag
   */
  tag: string = '';

  /**
   * Name of the modules Voice Over folder
   */
  voId: string = 'm1an';

  /**
   * Module version. Is always set to 3. 
   */
  version: number = 3;

  /**
   * Percentage by which to multiply all XP gained through killing creatures.
   */
  xpScale: number = 10;

  /**
   * ResRef of movie in 'movies' folder to play when starting module
   */
  startMovie: string = '';
  
  /**
   * @deprecated Deprecated: since NWN
   */
  expansionList: KotOR.GFFStruct[] = [];

  /**
   * @deprecated Deprecated: since NWN
   */
  globalVariableList: KotOR.GFFStruct[] = [];

  /**
   * @deprecated Obsolete: since NWN
   */
  hak: string = '';

  /**
   * @deprecated Deprecated: since NWN
   */
  cutSceneList: KotOR.GFFStruct[] = [];

  /** 
   * always set to 2
   * @deprecated Deprecated: since NWN
   */
  creatorId: number = 2;

  isSaveGame: boolean = false;

  constructor(ifo: KotOR.GFFObject = new KotOR.GFFObject()){
    this.setFromIFO(ifo);
  }

  setContext(context: UI3DRenderer){
    this.context = context;
    this.context.setModule(this);
    this.area.setContext(context);
  }

  setFromIFO(ifo: KotOR.GFFObject){
    this.ifo = ifo;
  }

  async load(){
    await this.area.load();
  }

  exportToIFO(){
    const ifo = new KotOR.GFFObject();
    ifo.FileType = 'IFO ';

    // Expansion_Pack
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Expansion_Pack', this.expansionPack));

    // Mod_Area_list - KotOR only supports one Area per module
    const areaList = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_Area_list'))!;
    const areaStruct = new KotOR.GFFStruct(6);
    areaStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Area_Name', this.areas[0].name.getValue()));
    areaList.addChildStruct(areaStruct);

    // Mod_Creator_ID
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Mod_Creator_ID', this.creatorId));

    // Mod_CutSceneList
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_CutSceneList'));

    // Mod_DawnHour
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_DawnHour', this.dawnHour));

    // Mod_Description
    const modDescriptionField = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Mod_Description'))!;
    modDescriptionField.setCExoLocString(this.description);

    // Mod_DuskHour
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_DuskHour', this.duskHour));

    // Mod_Entry_Area
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_Entry_Area', this.entryArea));

    // Mod_Entry_Dir_X, Mod_Entry_Dir_Y
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Dir_X', this.entryDirectionX));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Dir_Y', this.entryDirectionY));

    // Mod_Entry_X, Mod_Entry_Y, Mod_Entry_Z
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_X', this.entryX));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Y', this.entryY));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Z', this.entryZ));

    // Mod_Expan_List
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_Expan_List'));

    // Mod_GVar_List
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_GVar_List'));

    // Mod_Hak
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Mod_Hak', ''));

    // Mod_ID (BINARY/VOID)
    const modIdField = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.VOID, 'Mod_ID'))!;
    modIdField.setData(this.id);

    // Mod_IsSaveGame
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_IsSaveGame', this.isSaveGame ? 1 : 0));

    // Mod_MinPerHour
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_MinPerHour', this.timeManager.minutesPerHour));

    // Mod_Name
    const modNameField = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Mod_Name'))!;
    // const modNameLocString = new KotOR.CExoLocString();
    // modNameLocString.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)
    // modNameField.setCExoLocString(modNameLocString);
    modNameField.setCExoLocString(this.name);

    // Event Handler Scripts (all RESREF)
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnAcquirItem', this.scriptResRefs.get('Mod_OnAcquirItem') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnActvtItem', this.scriptResRefs.get('Mod_OnActvtItem') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnClientEntr', this.scriptResRefs.get('Mod_OnClientEntr') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnClientLeav', this.scriptResRefs.get('Mod_OnClientLeav') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnHeartbeat', this.scriptResRefs.get('Mod_OnHeartbeat') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnModLoad', this.scriptResRefs.get('Mod_OnModLoad') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnModStart', this.scriptResRefs.get('Mod_OnModStart') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrDeath', this.scriptResRefs.get('Mod_OnPlrDeath') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrDying', this.scriptResRefs.get('Mod_OnPlrDying') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrLvlUp', this.scriptResRefs.get('Mod_OnPlrLvlUp') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrRest', this.scriptResRefs.get('Mod_OnPlrRest') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnSpawnBtnDn', this.scriptResRefs.get('Mod_OnSpawnBtnDn') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnUnAqreItem', this.scriptResRefs.get('Mod_OnUnAqreItem') || ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnUsrDefined', this.scriptResRefs.get('Mod_OnUsrDefined') || ''));

    // Start Date/Time
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_StartDay', this.timeManager.day));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_StartHour', this.timeManager.hour));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_StartMonth', this.timeManager.month));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_StartMovie', this.startMovie));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Mod_StartYear', this.timeManager.year));

    // Mod_Tag
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Mod_Tag', this.tag));

    // Mod_VO_ID
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Mod_VO_ID', this.voId));

    // Mod_Version
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Mod_Version', this.version));

    // Mod_XPScale
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_XPScale', this.xpScale));

    return ifo;
  }

}