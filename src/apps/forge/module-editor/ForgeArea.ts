import * as KotOR from "../KotOR";

interface AreaMap {
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
  mapResX: number;
  mapZoom: number;
  northAxis: number;
  worldPt1X: number;
  worldPt1Y: number;
  worldPt2X: number;
  worldPt2Y: number;
}

export class ForgeArea {

  git: KotOR.GFFObject;
  are: KotOR.GFFObject;

  /**
   * ARE Fields
   */

  alphaTest: number = 0.200000002980232;

  cameraStyle: number = 0;

  chanceLightning: number = 0;

  chanceRain: number = 0;

  chanceSnow: number = 0;

  comments: string = '';

  creatorId: number = 0;

  dayNightCycle: boolean = false;

  defaultEnvMap: string = '';

  dynamicAmbientColor: number = 0;

  expansionList: any[] = [];

  flags: number = 0;

  grassAmbient: number = 0;

  grassDensity: number = 0.0;

  grassDiffuse: number = 0;

  grassProbLL: number = 0.0;

  grassProbLR: number = 0.0;

  grassProbUL: number = 0.0;

  grassProbUR: number = 0.0;

  grassQuadSize: number = 0.0;

  grassTexName: string = '';

  id: number = 0;

  isNight: boolean = false;

  lightingScheme: number = 0;

  loadScreenId: number = 0;

  map: AreaMap = {
    mapPt1X: 0.0,
    mapPt1Y: 0.0,
    mapPt2X: 0.0,
    mapPt2Y: 0.0,
    mapResX: 0,
    mapZoom: 0,
    northAxis: 0,
    worldPt1X: 0.0,
    worldPt1Y: 0.0,
    worldPt2X: 0.0,
    worldPt2Y: 0.0,
  };

  modListenCheck: number = 0;

  modSpotCheck: number = 0;

  moonAmbientColor: number = 0;

  moonDiffuseColor: number = 0;

  moonFogColor: number = 0;

  moonFogFar: number = 0.0;

  moonFogNear: number = 0.0;

  moonFogOn: boolean = false;

  moonShadows: boolean = false;

  name: KotOR.CExoLocString = new KotOR.CExoLocString(-1);

  noHangBack: boolean = false;

  noRest: boolean = false;

  onEnter: string = '';

  onExit: string = '';

  onHeartbeat: string = '';

  onUserDefined: string = '';

  playerOnly: boolean = false;

  playerVsPlayer: boolean = false;

  shadowOpacity: number = 0;

  stealthXPEnabled: boolean = false;

  stealthXPLoss: number = 0;

  stealthXPMax: number = 0;

  sunAmbientColor: number = 0;

  sunDiffuseColor: number = 0;

  sunFogColor: number = 0;

  sunFogFar: number = 0.0;

  sunFogNear: number = 0.0;

  sunFogOn: boolean = false;

  sunShadows: boolean = false;

  tag: string = '';

  unescapable: boolean = false;

  version: number = 0;

  windPower: number = 0;

  /**
   * GIT Fields
   */

  areaProperties = {
    ambientSndDay: 0,
    ambientSndDayVol: 0,
    ambientSndNight: 0,
    ambientSndNitVol: 0,
    envAudio: 0,
    musicBattle: 0,
    musicDay: 0,
    musicDelay: 0,
    musicNight: 0,
  }

  cameraList: KotOR.ModuleCamera[] = [];
  creatureList: KotOR.ModuleCreature[] = [];
  doorList: KotOR.ModuleDoor[] = [];
  encounterList: KotOR.ModuleEncounter[] = [];
  itemList: KotOR.ModuleItem[] = [];
  mgEnemyList: KotOR.ModuleMGEnemy[] = [];
  mgObstacleList: KotOR.ModuleMGObstacle[] = [];
  mgPlayerList: KotOR.ModuleMGPlayer[] = [];
  mgTrackList: KotOR.ModuleMGTrack[] = [];
  miniGameList: KotOR.ModuleMiniGame[] = [];
  pathList: KotOR.ModulePath[] = [];
  placeableList: KotOR.ModulePlaceable[] = [];
  playerList: KotOR.ModulePlayer[] = [];
  roomList: KotOR.ModuleRoom[] = [];
  soundList: KotOR.ModuleSound[] = [];
  storeList: KotOR.ModuleStore[] = [];
  triggerList: KotOR.ModuleTrigger[] = [];
  waypointList: KotOR.ModuleWaypoint[] = [];
  useTemplate: boolean = false;

  constructor(git: KotOR.GFFObject, are: KotOR.GFFObject){
    this.git = git;
    this.are = are;
  }

  exportToARE(){
    const are = new KotOR.GFFObject();
    are.FileType = 'ARE ';

    // AlphaTest
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AlphaTest', this.alphaTest));

    // CameraStyle
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'CameraStyle', this.cameraStyle));

    // ChanceLightning
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceLightning', this.chanceLightning));

    // ChanceRain
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceRain', this.chanceRain));

    // ChanceSnow
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceSnow', this.chanceSnow));

    // Comments
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comments', this.comments));

    // Creator_ID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Creator_ID', this.creatorId));

    // DayNightCycle
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DayNightCycle', this.dayNightCycle ? 1 : 0));

    // DefaultEnvMap
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'DefaultEnvMap', this.defaultEnvMap));

    // DynAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'DynAmbientColor', this.dynamicAmbientColor));

    // Expansion_List
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Expansion_List'));

    // Flags
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Flags', this.flags));

    // Grass_Ambient
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Grass_Ambient', this.grassAmbient));

    // Grass_Density
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Density', this.grassDensity));

    // Grass_Diffuse
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Grass_Diffuse', this.grassDiffuse));

    // Grass_Prob_LL
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_LL', this.grassProbLL));

    // Grass_Prob_LR
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_LR', this.grassProbLR));

    // Grass_Prob_UL
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_UL', this.grassProbUL));

    // Grass_Prob_UR
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_UR', this.grassProbUR));

    // Grass_QuadSize
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_QuadSize', this.grassQuadSize));

    // Grass_TexName
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Grass_TexName', this.grassTexName));

    // ID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ID', this.id));

    // IsNight
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'IsNight', this.isNight ? 1 : 0));

    // LightingScheme
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LightingScheme', this.lightingScheme));

    // LoadScreenID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', this.loadScreenId));

    // Map (STRUCT with nested structure)
    const mapField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Map');
    const mapStruct = new KotOR.GFFStruct(0);
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt1X', this.map.mapPt1X));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt1Y', this.map.mapPt1Y));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt2X', this.map.mapPt2X));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt2Y', this.map.mapPt2Y));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MapResX', this.map.mapResX));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MapZoom', this.map.mapZoom));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'NorthAxis', this.map.northAxis));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt1X', this.map.worldPt1X));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt1Y', this.map.worldPt1Y));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt2X', this.map.worldPt2X));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt2Y', this.map.worldPt2Y));
    mapField.addChildStruct(mapStruct);
    are.RootNode.addField(mapField);

    // ModListenCheck
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ModListenCheck', this.modListenCheck));

    // ModSpotCheck
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ModSpotCheck', this.modSpotCheck));

    // MoonAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonAmbientColor', this.moonAmbientColor));

    // MoonDiffuseColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonDiffuseColor', this.moonDiffuseColor));

    // MoonFogColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonFogColor', this.moonFogColor));

    // MoonFogFar
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MoonFogFar', this.moonFogFar));

    // MoonFogNear
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MoonFogNear', this.moonFogNear));

    // MoonFogOn
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MoonFogOn', this.moonFogOn ? 1 : 0));

    // MoonShadows
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MoonShadows', this.moonShadows ? 1 : 0));

    // Name
    const nameField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Name'))!;
    // const nameLocString = new KotOR.CExoLocString();
    // nameLocString.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)
    // nameField.setCExoLocString(nameLocString);
    nameField.setCExoLocString(this.name);

    // NoHangBack
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoHangBack', this.noHangBack ? 1 : 0));

    // NoRest
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoRest', this.noRest ? 1 : 0));

    // OnEnter
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnEnter', this.onEnter));

    // OnExit
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExit', this.onExit));

    // OnHeartbeat
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat));

    // OnUserDefined
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined));

    // PlayerOnly
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerOnly', this.playerOnly ? 1 : 0));

    // PlayerVsPlayer
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerVsPlayer', this.playerVsPlayer ? 1 : 0));

    // Rooms
    const roomsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Rooms');
    for(let i = 0, len = this.roomList.length; i < len; i++){
      const roomStruct = new KotOR.GFFStruct(3);
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'RoomName', this.roomList[i].roomName));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', this.roomList[i].envAudio));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AmbientScale', this.roomList[i].ambientScale));
      roomsField.addChildStruct(roomStruct);
    }
    are.RootNode.addField(roomsField);

    // ShadowOpacity
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ShadowOpacity', this.shadowOpacity));

    // StealthXPEnabled
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'StealthXPEnabled', this.stealthXPEnabled ? 1 : 0));

    // StealthXPLoss
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'StealthXPLoss', this.stealthXPLoss));

    // StealthXPMax
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'StealthXPMax', this.stealthXPMax));

    // SunAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunAmbientColor', this.sunAmbientColor));

    // SunDiffuseColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunDiffuseColor', this.sunDiffuseColor));

    // SunFogColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunFogColor', this.sunFogColor));

    // SunFogFar
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'SunFogFar', this.sunFogFar));

    // SunFogNear
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'SunFogNear', this.sunFogNear));

    // SunFogOn
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SunFogOn', this.sunFogOn ? 1 : 0));

    // SunShadows
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SunShadows', this.sunShadows ? 1 : 0));

    // Tag
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag));

    // Unescapable
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Unescapable', this.unescapable ? 1 : 0));

    // Version
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Version', this.version));

    // WindPower
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'WindPower', this.windPower));

    return are;
  }

  exportToGIT(){
    const git = new KotOR.GFFObject();
    git.FileType = 'GIT ';

    // AreaProperties (STRUCT)
    const areaPropertiesField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'AreaProperties');
    const areaPropertiesStruct = new KotOR.GFFStruct(100);
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndDay', this.areaProperties.ambientSndDay));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndDayVol', this.areaProperties.ambientSndDayVol));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndNight', this.areaProperties.ambientSndNight));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndNitVol', this.areaProperties.ambientSndNitVol));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', this.areaProperties.envAudio));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicBattle', this.areaProperties.musicBattle));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicDay', this.areaProperties.musicDay));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicDelay', this.areaProperties.musicDelay));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicNight', this.areaProperties.musicNight));
    areaPropertiesField.addChildStruct(areaPropertiesStruct);
    git.RootNode.addField(areaPropertiesField);

    // CameraList
    const cameraListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'CameraList');
    for(let i = 0, len = this.cameraList.length; i < len; i++){
      cameraListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.cameraList[i]));
    }
    git.RootNode.addField(cameraListField);

    // Creature List
    const creatureListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Creature List');
    for(let i = 0, len = this.creatureList.length; i < len; i++){
      creatureListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.creatureList[i]));
    }
    git.RootNode.addField(creatureListField);

    // Door List
    const doorListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Door List');
    for(let i = 0, len = this.doorList.length; i < len; i++){
      doorListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.doorList[i]));
    }
    git.RootNode.addField(doorListField);

    // Encounter List
    const encounterListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Encounter List');
    for(let i = 0, len = this.encounterList.length; i < len; i++){
      encounterListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.encounterList[i]));
    }
    git.RootNode.addField(encounterListField);

    // List (generic/unnamed list for items)
    const listField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'List');
    for(let i = 0, len = this.itemList.length; i < len; i++){
      listField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.itemList[i]));
    }
    git.RootNode.addField(listField);

    // Placeable List
    const placeableListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Placeable List');
    for(let i = 0, len = this.placeableList.length; i < len; i++){
      placeableListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.placeableList[i]));
    }
    git.RootNode.addField(placeableListField);

    // SoundList
    const soundListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SoundList');
    for(let i = 0, len = this.soundList.length; i < len; i++){
      soundListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.soundList[i]));
    }
    git.RootNode.addField(soundListField);

    // StoreList
    const storeListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'StoreList');
    for(let i = 0, len = this.storeList.length; i < len; i++){
      storeListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.storeList[i]));
    }
    git.RootNode.addField(storeListField);

    // TriggerList
    const triggerListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'TriggerList');
    for(let i = 0, len = this.triggerList.length; i < len; i++){
      triggerListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.triggerList[i]));
    }
    git.RootNode.addField(triggerListField);

    // UseTemplates
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'UseTemplates', this.useTemplate ? 1 : 0));

    // WaypointList
    const waypointListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'WaypointList');
    for(let i = 0, len = this.waypointList.length; i < len; i++){
      waypointListField.addChildStruct(ForgeArea.exportGameObjectToGITInstance(this.waypointList[i]));
    }
    git.RootNode.addField(waypointListField);

    return git;
  }

  static exportGameObjectToGITInstance(gameObject: KotOR.ModuleCamera | KotOR.ModuleCreature | KotOR.ModuleDoor | KotOR.ModuleEncounter | KotOR.ModuleItem | KotOR.ModulePlaceable | KotOR.ModuleSound | KotOR.ModuleStore | KotOR.ModuleTrigger | KotOR.ModuleWaypoint): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(0);

    let structID = 0;

    if(gameObject instanceof KotOR.ModuleCamera){
      structID = 14;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'CameraID', gameObject.cameraID));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'FieldOfView', gameObject.fov));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Height', gameObject.height));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MicRange', gameObject.micRange));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.ORIENTATION, 'Orientation', gameObject.orientation));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Pitch', gameObject.pitch));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.VECTOR, 'Position', gameObject.position));
    }else if(gameObject instanceof KotOR.ModuleCreature){
      structID = 4;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', gameObject.position.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', gameObject.rotation.z));
    }else if(gameObject instanceof KotOR.ModuleDoor){
      structID = 8;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Bearing', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', gameObject.linkedTo));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LinkedToFlags', gameObject.linkedToFlags));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'LinkedToModule', gameObject.linkedToModule));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', gameObject.tag));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'TransitionDestin', gameObject.transitionDestin));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModuleEncounter){
      structID = 7;
      const geometryField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Geometry'));
      for(let i = 0, len = gameObject.vertices.length; i < len; i++){
        const geometryStruct = new KotOR.GFFStruct(3);
        geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', gameObject.vertices[i].x));
        geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', gameObject.vertices[i].y));
        geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', gameObject.vertices[i].z));
        geometryField?.addChildStruct(geometryStruct);
      }
      const spawnPointListField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SpawnPointList'));
      for(let i = 0, len = gameObject.spawnPointList.length; i < len; i++){
        const spawnPointStruct = new KotOR.GFFStruct(3);
        spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', gameObject.spawnPointList[i].position.x));
        spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', gameObject.spawnPointList[i].position.y));
        spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', gameObject.spawnPointList[i].position.z));
        spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Orientation', gameObject.spawnPointList[i].orientation));
        spawnPointListField?.addChildStruct(spawnPointStruct);
      }
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModuleItem){
      structID = 0;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModulePlaceable){
      structID = 9;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Bearing', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModuleSound){
      structID = 6;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'GeneratedType', gameObject.generatedType));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModuleStore){
      structID = 11;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ResRef', gameObject.resref));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModuleTrigger){
      structID = 1;
      const geometryField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Geometry'));
      for(let i = 0, len = gameObject.vertices.length; i < len; i++){
        const geometryStruct = new KotOR.GFFStruct(3);
        geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', gameObject.vertices[i].x));
        geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', gameObject.vertices[i].y));
        geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', gameObject.vertices[i].z));
        geometryField?.addChildStruct(geometryStruct);
      }
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', gameObject.position.z));
    }else if(gameObject instanceof KotOR.ModuleWaypoint){
      structID = 5;
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Appearance', gameObject.appearance));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', gameObject.description));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'HasMapNote', gameObject.hasMapNote ? 1 : 0));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', gameObject.linkedTo));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'MapNote', gameObject.mapNote));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MapNoteEnabled', gameObject.mapNoteEnabled ? 1 : 0));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Tag', gameObject.tag));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', gameObject.getTemplateResRef()));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', gameObject.position.x));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', gameObject.rotation.z));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', gameObject.position.y));
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', gameObject.position.z));
    }

    return instance;

  }

  
}