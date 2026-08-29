import * as KotOR from "@/apps/forge/KotOR";
import type { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";
import { AreaMap } from "@/module/AreaMap";
import { GroupType, type UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ForgeMiniGame } from "@/apps/forge/module-editor/ForgeMiniGame";
import { ForgeCreature } from "@/apps/forge/module-editor/ForgeCreature";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { ForgeCamera } from "@/apps/forge/module-editor/ForgeCamera";
import { ForgeDoor } from "@/apps/forge/module-editor/ForgeDoor";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { ForgePlaceable } from "@/apps/forge/module-editor/ForgePlaceable";
import { ForgeItem } from "@/apps/forge/module-editor/ForgeItem";
import { ForgeSound } from "@/apps/forge/module-editor/ForgeSound";
import { ForgeStore } from "@/apps/forge/module-editor/ForgeStore";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import * as THREE from 'three';

export class ForgeArea extends ForgeGameObject{

  git: KotOR.GFFObject;
  are: KotOR.GFFObject;
  /** Present only when loaded from disk/game or created via `ensureLayout` (user room edits). */
  layout?: KotOR.LYTObject;
  visObject?: KotOR.VISObject;
  /** True when `${layoutResRef}.lyt` was read from the project on load. */
  layoutPresentOnDisk = false;
  /** True when layout was Demanded from retail game KEY/BIF (not in the project). */
  layoutLoadedFromGame = false;
  /** True when the editor invented a layout because the user edited rooms/visibility. */
  layoutEnsuredByEditor = false;

  module: ForgeModule;

  nextCameraId = 0;

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

  areaMap: AreaMap = new AreaMap();

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

  miniGame: ForgeMiniGame | undefined;
  cameras: ForgeCamera[] = [];
  creatures: ForgeCreature[] = [];
  doors: ForgeDoor[] = [];
  encounters: ForgeEncounter[] = [];
  items: ForgeItem[] = [];
  miniGameList: ForgeMiniGame[] = [];
  placeables: ForgePlaceable[] = [];
  rooms: ForgeRoom[] = [];
  sounds: ForgeSound[] = [];
  stores: ForgeStore[] = [];
  triggers: ForgeTrigger[] = [];
  waypoints: ForgeWaypoint[] = [];
  useTemplate: boolean = true;

  // Cached walkmesh objects for performance
  private cachedWalkmeshObjects: THREE.Object3D[] = [];
  private walkmeshCacheValid: boolean = false;
  private cachedRoomKey: string = '';

  constructor(git: KotOR.GFFObject = new KotOR.GFFObject(), are: KotOR.GFFObject = new KotOR.GFFObject()){
    super();
    this.git = git;
    this.are = are;
  }

  setContext(context: UI3DRenderer){
    this.context = context;
  }

  private areField(label: string, fields?: KotOR.GFFField[]): KotOR.GFFField | undefined {
    if(fields){
      return this.are.getFieldByLabel(label, fields) || undefined;
    }
    if(!this.are?.RootNode?.hasField(label)){
      return undefined;
    }
    return this.are.getFieldByLabel(label) || undefined;
  }

  private readAreValue<T>(label: string, fallback: T, fields?: KotOR.GFFField[]): T {
    const field = this.areField(label, fields);
    if(!field){
      return fallback;
    }
    try{
      const value = field.getValue();
      return (value === undefined || value === null) ? fallback : (value as T);
    }catch{
      return fallback;
    }
  }

  private readAreLocString(label: string, fallback: KotOR.CExoLocString = new KotOR.CExoLocString(-1)): KotOR.CExoLocString {
    const field = this.areField(label);
    if(!field){
      return fallback;
    }
    try{
      return field.getCExoLocString() || fallback;
    }catch{
      return fallback;
    }
  }

  async load(){
    //BEGIN AREA LOAD

    this.id = this.readAreValue('ObjectId', this.id);

    const rooms = this.areField('Rooms');

    this.alphaTest = this.readAreValue('AlphaTest', this.alphaTest);
    this.cameraStyle = this.readAreValue('CameraStyle', this.cameraStyle);
    this.chanceLightning = this.readAreValue('ChanceLightning', this.chanceLightning);
    this.chanceRain = this.readAreValue('ChanceRain', this.chanceRain);
    this.chanceSnow = this.readAreValue('ChanceSnow', this.chanceSnow);
    this.comments = this.readAreValue('Comments', this.comments) || '';
    this.creatorId = this.readAreValue('Creator_ID', this.creatorId);
    this.dayNightCycle = !!this.readAreValue('DayNightCycle', this.dayNightCycle);
    this.defaultEnvMap = this.readAreValue('DefaultEnvMap', this.defaultEnvMap) || '';
    this.dynamicAmbientColor = this.readAreValue('DynAmbientColor', this.dynamicAmbientColor);
    this.expansionList = [];

    this.flags = this.readAreValue('Flags', this.flags);
    this.grassAmbient = this.readAreValue('Grass_Ambient', this.grassAmbient);
    this.grassDensity = this.readAreValue('Grass_Density', this.grassDensity);
    this.grassDiffuse = this.readAreValue('Grass_Diffuse', this.grassDiffuse);
    this.grassProbLL = this.readAreValue('Grass_Prob_LL', this.grassProbLL);
    this.grassProbLR = this.readAreValue('Grass_Prob_LR', this.grassProbLR);
    this.grassProbUL = this.readAreValue('Grass_Prob_UL', this.grassProbUL);
    this.grassProbUR = this.readAreValue('Grass_Prob_UR', this.grassProbUR);
    this.grassQuadSize = this.readAreValue('Grass_QuadSize', this.grassQuadSize);
    this.grassTexName = this.readAreValue('Grass_TexName', this.grassTexName) || '';

    this.id = this.readAreValue('ID', this.id);
    this.isNight = !!this.readAreValue('IsNight', this.isNight);
    this.lightingScheme = this.readAreValue('LightingScheme', this.lightingScheme);
    this.loadScreenId = this.readAreValue('LoadScreenID', this.loadScreenId);

    if(this.areField('Map')){
      const map = this.areField('Map')?.getChildStructs()?.[0];
      const loadedMap = map ? AreaMap.FromStruct(map) : undefined;
      if(loadedMap){
        this.areaMap = loadedMap;
      }
    }

    if(this.areField('MiniGame')){
      const miniGameStruct = this.areField('MiniGame')?.getChildStructs()?.[0];
      if(miniGameStruct){
        this.miniGame = new ForgeMiniGame(miniGameStruct);
      }
    }

    this.modListenCheck = this.readAreValue('ModListenCheck', this.modListenCheck);
    this.modSpotCheck = this.readAreValue('ModSpotCheck', this.modSpotCheck);
    this.moonAmbientColor = this.readAreValue('MoonAmbientColor', this.moonAmbientColor);
    this.moonDiffuseColor = this.readAreValue('MoonDiffuseColor', this.moonDiffuseColor);
    this.moonFogColor = this.readAreValue('MoonFogColor', this.moonFogColor);
    this.moonFogFar = this.readAreValue('MoonFogFar', this.moonFogFar);
    this.moonFogNear = this.readAreValue('MoonFogNear', this.moonFogNear);
    this.moonFogOn = !!this.readAreValue('MoonFogOn', this.moonFogOn);
    this.moonShadows = !!this.readAreValue('MoonShadows', this.moonShadows);
    this.name = this.readAreLocString('Name', this.name);

    this.noHangBack = !!this.readAreValue('NoHangBack', this.noHangBack);
    this.noRest = !!this.readAreValue('NoRest', this.noRest);

    this.onEnter = this.readAreValue('OnEnter', this.onEnter) || '';
    this.onExit = this.readAreValue('OnExit', this.onExit) || '';
    this.onHeartbeat = this.readAreValue('OnHeartbeat', this.onHeartbeat) || '';
    this.onUserDefined = this.readAreValue('OnUserDefined', this.onUserDefined) || '';

    this.playerOnly = !!this.readAreValue('PlayerOnly', this.playerOnly);
    this.playerVsPlayer = this.readAreValue('PlayerVsPlayer', this.playerVsPlayer);

    //Rooms
    const roomStructs = rooms?.childStructs || [];
    for(let i = 0; i < roomStructs.length; i++ ){
      const strt = roomStructs[i];
      const roomFields = strt.getFields();
      const roomName = String(this.readAreValue('RoomName', '', roomFields) || '').toLowerCase();
      if(!roomName){
        continue;
      }
      const envAudio = this.readAreValue('EnvAudio', 0, roomFields);
      const ambientScale = this.readAreValue('AmbientScale', 1, roomFields);
      const room = new ForgeRoom(roomName);
      room.setAmbientScale(ambientScale);
      room.setEnvAudio(envAudio);
      this.rooms.push(room);
    }

    this.shadowOpacity = this.readAreValue('ShadowOpacity', this.shadowOpacity);

    this.stealthXPEnabled = !!this.readAreValue('StealthXPEnabled', this.stealthXPEnabled);
    this.stealthXPLoss = this.readAreValue('StealthXPLoss', this.stealthXPLoss);
    this.stealthXPMax = this.readAreValue('StealthXPMax', this.stealthXPMax);

    this.sunAmbientColor = this.readAreValue('SunAmbientColor', this.sunAmbientColor);
    this.sunDiffuseColor = this.readAreValue('SunDiffuseColor', this.sunDiffuseColor);
    this.sunFogColor = this.readAreValue('SunFogColor', this.sunFogColor);
    this.sunFogFar = this.readAreValue('SunFogFar', this.sunFogFar);
    this.sunFogNear = this.readAreValue('SunFogNear', this.sunFogNear);
    this.sunFogOn = !!this.readAreValue('SunFogOn', this.sunFogOn);
    this.sunShadows = !!this.readAreValue('SunShadows', this.sunShadows);
    this.tag = this.readAreValue('Tag', this.tag) || '';
    this.unescapable = !!this.readAreValue('Unescapable', this.unescapable);
    this.version = this.readAreValue('Version', this.version);
    this.windPower = this.readAreValue('WindPower', this.windPower);

    this.loadGITLists();

    // //AreaMapData
    // if(areaMap){
    //   const areaMapStruct = areaMap.getChildStructs()[0];
    //   if(areaMapStruct){
    //     this.areaMap.loadDataStruct(areaMapStruct);
    //   }
    // }

    // if(!(this.transWP instanceof GFFObject)){
    //   this.transWP = null;
    // }

    // if(this.git.RootNode.hasField('SWVarTable')){
    //   console.log("SWVarTable", this.git);
    //   let localBools = this.git.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
    //   //console.log(localBools);
    //   for(let i = 0; i < localBools.length; i++){
    //     let data = localBools[i].getFieldByLabel('Variable').getValue();
    //     for(let bit = 0; bit < 32; bit++){
    //       this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
    //     }
    //   }
    // }

    // GameState.AlphaTest = this.alphaTest;

    // AudioEngine.GetAudioEngine().setReverbProfile(this.audio.environmentAudio);

    // FollowerCamera.setCameraStyle(this.getCameraStyle());
    // if(this.miniGame){
    //   FollowerCamera.setCameraFOV(this.miniGame.cameraViewAngle);
    // }else{
    //   FollowerCamera.setCameraFOV(FollowerCamera.DEFAULT_FOV);
    // }

    try{
      const layoutResRef = this.getLayoutResRef();
      this.layout = undefined;
      this.layoutPresentOnDisk = false;
      this.layoutLoadedFromGame = false;
      this.layoutEnsuredByEditor = false;
      this.visObject = undefined;

      const lytBuffer = await this.loadLayoutBuffer(layoutResRef);
      if(lytBuffer?.byteLength){
        this.layout = new KotOR.LYTObject(lytBuffer);
        this.applyLayoutRoomOrderAndPositions();
      }

      const visBuffer = await this.loadVisBuffer(layoutResRef);
      if(visBuffer?.byteLength){
        this.visObject = new KotOR.VISObject(visBuffer);
        this.visObject.read();
        this.visObject.attachArea(this as any);
      }
    }catch(e){
      console.error(e);
    }

    // await this.loadVis();
    // await this.loadLayout();
    // await this.loadScripts();
    // GameState.scene.fog = this.fog;

    await this.loadRooms();
    await this.loadCreatures();
    this.context?.sceneGraphManager?.rebuild();
  }

  /**
   * Hydrate GIT AreaProperties and instance lists without loading 3D assets.
   */
  loadGITLists(): void {
    if(!(this.git instanceof KotOR.GFFObject)){
      return;
    }

    const areaProps = this.git.getFieldByLabel('AreaProperties');
    const areaPropsStruct = areaProps?.getChildStructs()?.[0];
    if(areaPropsStruct){
      const fields = areaPropsStruct.getFields();
      const readInt = (label: string, fallback: number): number => {
        const field = this.git.getFieldByLabel(label, fields);
        return field ? field.getValue() : fallback;
      };
      this.areaProperties.ambientSndDay = readInt('AmbientSndDay', this.areaProperties.ambientSndDay);
      this.areaProperties.ambientSndDayVol = readInt('AmbientSndDayVol', this.areaProperties.ambientSndDayVol);
      this.areaProperties.ambientSndNight = readInt('AmbientSndNight', this.areaProperties.ambientSndNight);
      this.areaProperties.ambientSndNitVol = readInt('AmbientSndNitVol', this.areaProperties.ambientSndNitVol);
      this.areaProperties.envAudio = readInt('EnvAudio', this.areaProperties.envAudio);
      this.areaProperties.musicBattle = readInt('MusicBattle', this.areaProperties.musicBattle);
      this.areaProperties.musicDay = readInt('MusicDay', this.areaProperties.musicDay);
      this.areaProperties.musicDelay = readInt('MusicDelay', this.areaProperties.musicDelay);
      this.areaProperties.musicNight = readInt('MusicNight', this.areaProperties.musicNight);
    }

    if(this.git.RootNode.hasField('UseTemplates')){
      this.useTemplate = !!this.git.getFieldByLabel('UseTemplates').getValue();
    }

    const lists: Array<[string, GroupType]> = [
      ['CameraList', GroupType.CAMERA],
      ['Creature List', GroupType.CREATURE],
      ['Door List', GroupType.DOOR],
      ['Encounter List', GroupType.ENCOUNTER],
      ['List', GroupType.ITEM],
      ['Placeable List', GroupType.PLACEABLE],
      ['SoundList', GroupType.SOUND],
      ['StoreList', GroupType.STORE],
      ['TriggerList', GroupType.TRIGGER],
      ['WaypointList', GroupType.WAYPOINT],
    ];
    for(let i = 0; i < lists.length; i++){
      const [label, groupType] = lists[i];
      const field = this.git.getFieldByLabel(label);
      if(!field){
        continue;
      }
      for(let j = 0; j < field.childStructs.length; j++){
        this.gitInstanceToForgeGameObject(field.childStructs[j], groupType);
      }
    }
  }

  getNextCameraId(): number {
    return this.nextCameraId++;
  }

  private static objectTypeRegistry = new Map<typeof ForgeGameObject, {
    array: keyof ForgeArea,
    groupType: GroupType,
    onAttach?: (object: ForgeGameObject) => void,
    onDetach?: (object: ForgeGameObject) => void
  }>();

  static registerObjectType(objectType: typeof ForgeGameObject, array: keyof ForgeArea, groupType: GroupType, onAttach?: (object: ForgeGameObject) => void, onDetach?: (object: ForgeGameObject) => void){
    this.objectTypeRegistry.set(objectType, { array, groupType, onAttach, onDetach });
  }

  attachObject(object: ForgeGameObject){
    if(!object){ return; }
    object.setArea(this);

    const registry = ForgeArea.objectTypeRegistry.get(object.constructor as typeof ForgeGameObject);
    if(registry){
      const array = registry.array;
      const groupType = registry.groupType;
      const onAttach = registry.onAttach;
      if(this.context){
        this.context.addObjectToGroup(object.container, groupType);
        object.setContext(this.context);
      }
      if(array){
        this[array].push(object);
      }
      if(typeof onAttach === 'function'){
        onAttach(object);
      }
    }else if(object instanceof ForgeMiniGame){
      this.miniGame = object;
    }
    this.context?.sceneGraphManager?.rebuild();
  }


  detachObject(object: ForgeGameObject){
    if(!object){ return; }

    const registry = ForgeArea.objectTypeRegistry.get(object.constructor as typeof ForgeGameObject);
    if(registry){
      const array = registry.array;
      const groupType = registry.groupType;
      const onDetach = registry.onDetach;
      this.context?.removeObjectFromGroup(object.container, groupType);
      if(array){
        const idx = this[array].indexOf(object);
        if(idx >= 0){
          this[array].splice(idx, 1);
        }
      }
      if(this.context?.transformControls?.object === object.container){
        this.context.selectObject(undefined);
      }
      if(typeof onDetach === 'function'){
        onDetach(object);
      }
    }
    
    this.context?.sceneGraphManager?.rebuild();
  }

  clearAttachedObjects(): void {
    const objects = [
      ...this.cameras, ...this.creatures, ...this.doors, ...this.encounters,
      ...this.items, ...this.placeables, ...this.sounds, ...this.stores,
      ...this.triggers, ...this.waypoints, ...this.rooms,
    ];
    for(let i = 0; i < objects.length; i++){
      this.detachObject(objects[i]);
    }
  }

  /** Stable area resref for LYT/VIS filenames (not localized ARE Name). */
  getLayoutResRef(): string {
    const fromModule = this.module?.entryArea?.trim();
    if(fromModule){
      return fromModule.toLowerCase();
    }
    const fromTag = String(this.tag || "").trim();
    if(fromTag){
      return fromTag.toLowerCase();
    }
    return "area";
  }

  /**
   * Build VIS text for current rooms.
   * Preserves existing visibility links when visObject is present; only adds
   * default full-mesh links for brand-new room names. Full mesh when no prior VIS.
   */
  buildVisText(): string {
    const roomNames = this.rooms.map((r) => r.roomName).filter(Boolean);
    const prior = this.visObject?.rooms;
    const hasPrior = !!(prior && prior.size > 0);
    let vis = "";

    for(let i = 0; i < roomNames.length; i++){
      const name = roomNames[i];
      const key = name.toLocaleLowerCase();
      let children: string[] = [];

      if(hasPrior){
        const existing = prior!.get(key);
        if(existing){
          // Keep links to rooms that still exist (preserve original casing from room list)
          children = existing.rooms
            .map((child) => roomNames.find((n) => n.toLocaleLowerCase() === child.toLocaleLowerCase()))
            .filter((n): n is string => !!n);
        } else {
          // New room: default to seeing all rooms (including self pattern used by emptyVis)
          children = [...roomNames];
        }
      } else {
        children = [...roomNames];
      }

      vis += `${name} ${children.length}\n`;
      for(let j = 0; j < children.length; j++){
        vis += `  ${children[j]}\n`;
      }
    }
    return vis;
  }

  /**
   * Project file first, then retail KEY/BIF Demand (incomplete modules restored from game data).
   */
  private async loadLayoutBuffer(layoutResRef: string): Promise<Uint8Array | undefined> {
    const path = `${layoutResRef}.lyt`;
    if(await ProjectFileSystem.exists(path)){
      try{
        const lyt = await ProjectFileSystem.readFile(path);
        if(lyt?.byteLength){
          this.layoutPresentOnDisk = true;
          return lyt;
        }
      }catch(e){
        console.error(e);
      }
    }
    if(!ForgeState.hasGameData){
      return undefined;
    }
    try{
      const fromGame = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.lyt, layoutResRef);
      if(fromGame?.byteLength){
        this.layoutLoadedFromGame = true;
        return fromGame;
      }
    }catch(e){
      // Missing from game as well — retail would leave 0 layout rooms.
    }
    return undefined;
  }

  private async loadVisBuffer(layoutResRef: string): Promise<Uint8Array | undefined> {
    const path = `${layoutResRef}.vis`;
    if(await ProjectFileSystem.exists(path)){
      try{
        const vis = await ProjectFileSystem.readFile(path);
        if(vis?.byteLength){
          return vis;
        }
      }catch(e){
        console.error(e);
      }
    }
    if(!ForgeState.hasGameData){
      return undefined;
    }
    try{
      const fromGame = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.vis, layoutResRef);
      if(fromGame?.byteLength){
        return fromGame;
      }
    }catch(e){
      // optional
    }
    return undefined;
  }

  /** Apply LYT room order + positions (walkmesh transition indices). */
  private applyLayoutRoomOrderAndPositions(): void {
    if(!this.layout){
      return;
    }
    const sortedRooms: ForgeRoom[] = [];
    for(let i = 0; i < this.layout.rooms.length; i++){
      const roomLYT = this.layout.rooms[i];
      for(let r = 0; r != this.rooms.length; r++ ){
        const room = this.rooms[r];
        if(room.roomName.toLowerCase() == roomLYT.name.toLowerCase()){
          room.position.copy(roomLYT.position);
          sortedRooms.push(room);
        }
      }
    }
    this.rooms = sortedRooms;
  }

  /**
   * Create an in-memory LYT when the user edits rooms/visibility and none was loaded.
   * Does not write to disk until flush/save.
   */
  ensureLayout(): void {
    if(this.layout){
      return;
    }
    this.layout = new KotOR.LYTObject();
    this.layoutEnsuredByEditor = true;
    this.syncLayoutAndVisInMemory();
  }

  /** True when save/export should write `.lyt` / `.vis` into the project. */
  shouldPersistLayout(): boolean {
    return !!this.layout && (
      this.layoutPresentOnDisk ||
      this.layoutLoadedFromGame ||
      this.layoutEnsuredByEditor
    );
  }

  /**
   * Sync room positions into the in-memory LYT/VIS.
   * No-op when there is no layout (does not invent from ARE rooms alone).
   */
  syncLayoutAndVisInMemory(): void {
    if(!this.layout){
      return;
    }
    this.layout.rooms = this.rooms.map((room) => ({
      name: room.roomName,
      position: room.position.clone(),
    }));

    const vis = this.buildVisText();
    this.visObject = new KotOR.VISObject(new TextEncoder().encode(vis));
    this.visObject.read();
    this.visObject.attachArea(this as any);
  }

  async flushLayoutAndVis(): Promise<void> {
    if(!this.shouldPersistLayout() || !this.layout){
      return;
    }
    const areaName = this.getLayoutResRef();
    this.syncLayoutAndVisInMemory();
    if(!this.layout){
      return;
    }
    await ProjectFileSystem.writeFile(`${areaName}.lyt`, this.layout.export());
    await ProjectFileSystem.writeFile(`${areaName}.vis`, new TextEncoder().encode(this.buildVisText()));
    this.layoutPresentOnDisk = true;
    this.layoutLoadedFromGame = false;
  }

  async writeLayoutAndVis(): Promise<void> {
    this.ensureLayout();
    this.syncLayoutAndVisInMemory();
    await this.flushLayoutAndVis();
  }

  /** Visible room names from `fromRoom`. With no VIS yet, defaults to all rooms (matches buildVisText). */
  getRoomVisibility(fromRoom: string): string[] {
    if(!fromRoom){
      return [];
    }
    if(!this.visObject || !this.visObject.rooms.size){
      return this.rooms.map((r) => r.roomName).filter(Boolean);
    }
    const entry = this.visObject.getRoom(fromRoom);
    return entry ? [...entry.rooms] : [];
  }

  /**
   * Toggle whether `toRoom` is visible from `fromRoom` and sync visObject for writeLayoutAndVis.
   */
  setRoomVisibilityLink(fromRoom: string, toRoom: string, visible: boolean): void {
    if(!fromRoom || !toRoom){
      return;
    }
    this.ensureLayout();
    if(!this.visObject){
      this.visObject = new KotOR.VISObject(new TextEncoder().encode(this.buildVisText()));
      this.visObject.read();
    }
    const key = fromRoom.toLocaleLowerCase();
    let entry = this.visObject.rooms.get(key);
    if(!entry){
      entry = { name: fromRoom, count: 0, rooms: [] };
      this.visObject.rooms.set(key, entry);
    }
    const toLower = toRoom.toLocaleLowerCase();
    const idx = entry.rooms.findIndex((n) => n.toLocaleLowerCase() === toLower);
    if(visible && idx < 0){
      const canonical = this.rooms.find((r) => r.roomName.toLocaleLowerCase() === toLower)?.roomName || toRoom;
      entry.rooms.push(canonical);
    } else if(!visible && idx >= 0){
      entry.rooms.splice(idx, 1);
    }
    entry.count = entry.rooms.length;
    entry.name = fromRoom;
  }

  /**
   * Build a unique cache key from room names
   */
  private buildRoomCacheKey(): string {
    if(!this.rooms || this.rooms.length === 0){
      return '';
    }
    // Build a unique key from sorted room names
    const roomNames = this.rooms
      .map(room => room.roomName || '')
      .filter(name => name.length > 0)
      .sort()
      .join(',');
    return roomNames;
  }

  /**
   * Get cached walkmesh objects, rebuilding cache if needed
   */
  getWalkmeshObjects(): THREE.Object3D[] {
    // Build current room key
    const currentRoomKey = this.buildRoomCacheKey();
    
    // Check if cache is still valid
    if(this.walkmeshCacheValid && this.cachedRoomKey === currentRoomKey){
      // Cache is valid, return cached objects
      return this.cachedWalkmeshObjects;
    }
    
    // Rebuild cache
    this.cachedWalkmeshObjects = [];
    if(this.rooms && this.rooms.length > 0){
      for(const room of this.rooms){
        if(room.container && room.container.children.length > 0){
          this.cachedWalkmeshObjects.push(...room.container.children);
        }
      }
    }
    this.cachedRoomKey = currentRoomKey;
    this.walkmeshCacheValid = true;
    
    return this.cachedWalkmeshObjects;
  }

  /**
   * Invalidate the walkmesh cache
   */
  invalidateWalkmeshCache(): void {
    this.walkmeshCacheValid = false;
    this.cachedRoomKey = '';
  }

  gitInstanceToForgeGameObject(instance: KotOR.GFFStruct, groupType: GroupType): ForgeGameObject | undefined {
    const object = ForgeArea.objectInstanceFromGroupType(groupType);
    if(!object){
      return undefined;
    }
    object.setGITInstance(instance);
    this.attachObject(object);
    return object;
  }

  static objectInstanceFromGroupType(groupType: GroupType): ForgeGameObject | undefined {
    switch(groupType){
      case GroupType.CREATURE:
        return new ForgeCreature();
      case GroupType.CAMERA:
        return new ForgeCamera();
      case GroupType.DOOR:
        return new ForgeDoor();
      case GroupType.ENCOUNTER:
        return new ForgeEncounter();
      case GroupType.ITEM:
        return new ForgeItem();
      case GroupType.PLACEABLE:
        return new ForgePlaceable();
      case GroupType.SOUND:
        return new ForgeSound();
      case GroupType.STORE:
        return new ForgeStore();
      case GroupType.TRIGGER:
        return new ForgeTrigger();
      case GroupType.WAYPOINT:
        return new ForgeWaypoint();
      default:
        return undefined;
    }
  }

  async loadCreatures(): Promise<void> {
    for(let i = 0; i < this.creatures.length; i++){
      const creature = this.creatures[i];
      await creature.loadBlueprint();
      await creature.load();
      this.context?.addObjectToGroup(creature.container, GroupType.CREATURE);
    }
  }

  /**
   * Load the area's rooms
   */
  async loadRooms(): Promise<void> {
    console.log('Loading Rooms');
    // this.walkEdges = [];
    // this.walkFaces = [];
    
    for(let i = 0; i < this.rooms.length; i++){
      const room = this.rooms[i];
      try {
        await room.load();
      }catch(e){
        console.warn(`Failed to load room ${room.roomName}`, e);
      }
      const model = room.model;
      
      if(model instanceof KotOR.OdysseyModel3D){
        model.name = room.roomName;
      }
      this.context?.addObjectToGroup(room.container, GroupType.ROOMS);
    }
    
    // Invalidate cache after loading rooms (containers now have children)
    this.invalidateWalkmeshCache();

    for(let j = 0; j < this.rooms.length; j++){
      this.rooms[j].linkRooms();
    }

    //Room Linking Pass 2
    for(let i = 0, iLen = this.rooms.length; i < iLen; i++ ){
      let room1 = this.rooms[i];
      //console.log(room1.linked_rooms);
      //Look for all rooms that can see this room
      for(let j = 0, jLen = this.rooms.length; j < jLen; j++){
        let room2 = this.rooms[j];
        //console.log(room2.linked_rooms);
        if(room2 instanceof ForgeRoom){
          const room1_room_links = this.visObject?.getRoom(room1.roomName)?.rooms || [];
          const room2_room_links = this.visObject?.getRoom(room2.roomName)?.rooms || [];
          const room2_links_to_room1 = room2_room_links.indexOf(room1.roomName) >= 0;
          const room1_links_to_room2 = room1_room_links.indexOf(room2.roomName) >= 0;

          const should_link = room2_links_to_room1 || room1_links_to_room2;
          //console.log('room', room1.roomName, room2.roomName, should_link);
          if(should_link && !room1.linkedRooms.has(room2.roomName)){
            room1.linkedRooms.set(room2.roomName, room2);
          }

          if(should_link && !room2.linkedRooms.has(room1.roomName)){
            room2.linkedRooms.set(room1.roomName, room1);
          }
        }
      }
      // this.walkmesh_rooms = [room1].concat(Array.from(room1.linkedRooms.values()));
    }
  }

  /**
   * Get a room by name
   * @param roomName - The name of the room to get
   * @returns The room or null if it is not found
   */
  getRoomByName(roomName: string): ForgeRoom | null {
    return this.rooms.find(room => room.roomName.toLocaleLowerCase() === roomName.toLocaleLowerCase()) || null;
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
    if(!(this.areaMap instanceof AreaMap)){
      this.areaMap = new AreaMap();
    }
    const mapField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Map'));
    mapField?.addChildStruct(this.areaMap.export());

    if(this.miniGame){
      const miniGameField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'MiniGame'));
      miniGameField?.addChildStruct(this.miniGame.exportToGFFStruct());
    }

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
    for(let i = 0, len = this.rooms.length; i < len; i++){
      const roomStruct = new KotOR.GFFStruct(3);
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'RoomName', this.rooms[i].roomName));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', this.rooms[i].envAudio));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AmbientScale', this.rooms[i].ambientScale));
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

  update(delta: number = 0){
    // Update all game objects
    for(const room of this.rooms){
      room.update(delta);
    }
    for(const creature of this.creatures){
      creature.update(delta);
    }
    for(const camera of this.cameras){
      camera.update(delta);
    }
    for(const door of this.doors){
      door.update(delta);
    }
    for(const encounter of this.encounters){
      encounter.update(delta);
    }
    for(const item of this.items){
      item.update(delta);
    }
    for(const placeable of this.placeables){
      placeable.update(delta);
    }
    for(const sound of this.sounds){
      sound.update(delta);
    }
    for(const store of this.stores){
      store.update(delta);
    }
    for(const trigger of this.triggers){
      trigger.update(delta);
    }
    for(const waypoint of this.waypoints){
      waypoint.update(delta);
    }
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
    for(let i = 0, len = this.cameras.length; i < len; i++){
      cameraListField.addChildStruct(this.cameras[i].getGITInstance());
    }
    git.RootNode.addField(cameraListField);

    // Creature List
    const creatureListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Creature List');
    for(let i = 0, len = this.creatures.length; i < len; i++){
      creatureListField.addChildStruct(this.creatures[i].getGITInstance());
    }
    git.RootNode.addField(creatureListField);

    // Door List
    const doorListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Door List');
    for(let i = 0, len = this.doors.length; i < len; i++){
      doorListField.addChildStruct(this.doors[i].getGITInstance());
    }
    git.RootNode.addField(doorListField);

    // Encounter List
    const encounterListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Encounter List');
    for(let i = 0, len = this.encounters.length; i < len; i++){
      encounterListField.addChildStruct(this.encounters[i].getGITInstance());
    }
    git.RootNode.addField(encounterListField);

    // List (generic/unnamed list for items)
    const listField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'List');
    for(let i = 0, len = this.items.length; i < len; i++){
      listField.addChildStruct(this.items[i].getGITInstance());
    }
    git.RootNode.addField(listField);

    // Placeable List
    const placeableListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Placeable List');
    for(let i = 0, len = this.placeables.length; i < len; i++){
      placeableListField.addChildStruct(this.placeables[i].getGITInstance());
    }
    git.RootNode.addField(placeableListField);

    // SoundList
    const soundListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SoundList');
    for(let i = 0, len = this.sounds.length; i < len; i++){
      soundListField.addChildStruct(this.sounds[i].getGITInstance());
    }
    git.RootNode.addField(soundListField);

    // StoreList
    const storeListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'StoreList');
    for(let i = 0, len = this.stores.length; i < len; i++){
      storeListField.addChildStruct(this.stores[i].getGITInstance());
    }
    git.RootNode.addField(storeListField);

    // TriggerList
    const triggerListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'TriggerList');
    for(let i = 0, len = this.triggers.length; i < len; i++){
      triggerListField.addChildStruct(this.triggers[i].getGITInstance());
    }
    git.RootNode.addField(triggerListField);

    // UseTemplates
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'UseTemplates', this.useTemplate ? 1 : 0));

    // WaypointList
    const waypointListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'WaypointList');
    for(let i = 0, len = this.waypoints.length; i < len; i++){
      waypointListField.addChildStruct(this.waypoints[i].getGITInstance());
    }
    git.RootNode.addField(waypointListField);

    return git;
  }
  
}

ForgeArea.registerObjectType(ForgeCamera, 'cameras', GroupType.CAMERA);
ForgeArea.registerObjectType(ForgeCreature, 'creatures', GroupType.CREATURE);
ForgeArea.registerObjectType(ForgeDoor, 'doors', GroupType.DOOR);
ForgeArea.registerObjectType(ForgeEncounter, 'encounters', GroupType.ENCOUNTER);
ForgeArea.registerObjectType(ForgeItem, 'items', GroupType.ITEM);
ForgeArea.registerObjectType(ForgePlaceable, 'placeables', GroupType.PLACEABLE);
ForgeArea.registerObjectType(ForgeSound, 'sounds', GroupType.SOUND);
ForgeArea.registerObjectType(ForgeStore, 'stores', GroupType.STORE);
ForgeArea.registerObjectType(ForgeTrigger, 'triggers', GroupType.TRIGGER);
ForgeArea.registerObjectType(ForgeWaypoint, 'waypoints', GroupType.WAYPOINT);
ForgeArea.registerObjectType(ForgeRoom as any, 'rooms', GroupType.ROOMS, (object: ForgeGameObject) => {
  object.area?.invalidateWalkmeshCache();
}, (object: ForgeGameObject) => {
  object.area?.invalidateWalkmeshCache();
});