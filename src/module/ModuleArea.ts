import { GameState } from "@/GameState";
import { WindManager } from "@/managers/WindManager";
import { DirtyTextureManager } from "@/managers/DirtyTextureManager";
import { TextureAnimationManager } from "@/managers/TextureAnimationManager";
import { GFFObject } from "@/resource/GFFObject";
import type { OdysseyFace3 } from "@/three/odyssey/OdysseyFace3";
import { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";
import { OdysseyMaterialBuilder } from "@/three/odyssey/OdysseyMaterialBuilder";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";
import { AreaMap } from "@/module/AreaMap";
import { AreaWeather } from "@/module/AreaWeather";
import * as THREE from "three";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFStruct } from "@/resource/GFFStruct";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { NWScript } from "@/nwscript/NWScript";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { LYTObject } from "@/resource/LYTObject";
import { Utility } from "@/utility/Utility";
import EngineLocation from "@/engine/EngineLocation";
import { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";
import { AudioLoader } from "@/audio/AudioLoader";
import { EngineMode } from "@/enums/engine/EngineMode";
import { CExoLocString } from "@/resource/CExoLocString";
import { VISObject } from "@/resource/VISObject";
import { ITextureLoaderQueuedRef } from "@/interface/loaders/ITextureLoaderQueuedRef";
import { FollowerCamera } from "@/engine/FollowerCamera";
// import { MenuManager, TwoDAManager, PartyManager, ModuleObjectManager } from "@/managers";
import { ResourceLoader, TextureLoader } from "@/loaders";
import { IAreaAudioProperties } from "@/interface/area/IAreaAudioProperties";
import { AudioEngine } from "@/audio";
import { AREA_MUSIC_FADE_MS, AMBIENT_SOUND_FADE_MS } from "@/audio/AudioEngine";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { ActionType } from "@/enums/actions/ActionType";
import { AILevel } from "@/enums/module/AILevel";
import { BitWise } from "@/utility/BitWise";
import { IAmbientSource } from "@/interface/area/IAmbientSource";
import { IGrassProperties } from "@/interface/area/IGrassProperties";
import { IAreaDirtLayer, IAreaDirtProperties } from "@/interface/area/IAreaDirtProperties";
import { SpellCastInstance } from "@/combat/SpellCastInstance";
import { CombatProjectile } from "@/combat/combat-projectile";
import { TextSprite3D } from "@/engine/TextSprite3D";
import { ModuleObject } from "@/module/ModuleObject";
import { ModuleAreaOfEffect } from "@/module/ModuleAreaOfEffect";
import { ModuleCamera } from "@/module/ModuleCamera";
import { ModuleCreature } from "@/module/ModuleCreature";
import { ModuleDoor } from "@/module/ModuleDoor";
import { ModuleEncounter } from "@/module/ModuleEncounter";
import { ModuleItem } from "@/module/ModuleItem";
import { ModuleMGEnemy } from "@/module/ModuleMGEnemy";
import { ModuleMGObstacle } from "@/module/ModuleMGObstacle";
import { ModuleWaypoint } from "@/module/ModuleWaypoint";
import { ModuleTrigger } from "@/module/ModuleTrigger";
import { ModuleStore } from "@/module/ModuleStore";
import { ModuleSound } from "@/module/ModuleSound";
import { ModuleRoom } from "@/module/ModuleRoom";
import { ModulePlayer } from "@/module/ModulePlayer";
import { ModulePlaceable } from "@/module/ModulePlaceable";
import { ModulePath } from "@/module/ModulePath";
import { ModuleMiniGame } from "@/module/ModuleMiniGame";
import { ModuleMGTrack } from "@/module/ModuleMGTrack";
import { ModuleMGPlayer } from "@/module/ModuleMGPlayer";
import type { Module } from "@/module/Module";
import { IVISRoom } from "@/interface/module/IVISRoom";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleDayPhase } from "@/enums/module/ModuleDayPhase";
import { ModuleCalendar } from "@/module/ModuleCalendar";
import { ModuleTimeManager } from "@/module/ModuleTimeManager";
import { CorpseCache } from "@/module/corpse-cache";

type AreaScriptKeys = 'OnEnter'|'OnExit'|'OnHeartbeat'|'OnUserDefined';

/**
 * ModuleArea class.
 * 
 * Class representing an ingame area.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleArea.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ModuleArea extends ModuleObject {

  static ModuleObject: typeof ModuleObject = ModuleObject;
  static ModuleAreaOfEffect: typeof ModuleAreaOfEffect = ModuleAreaOfEffect;
  static ModuleCamera: typeof ModuleCamera = ModuleCamera;
  static ModuleCreature: typeof ModuleCreature = ModuleCreature;
  static ModuleDoor: typeof ModuleDoor = ModuleDoor;
  static ModuleEncounter: typeof ModuleEncounter = ModuleEncounter;
  static ModuleItem: typeof ModuleItem = ModuleItem;
  static ModuleMGEnemy: typeof ModuleMGEnemy = ModuleMGEnemy;
  static ModuleMGObstacle: typeof ModuleMGObstacle = ModuleMGObstacle;
  static ModuleMGPlayer: typeof ModuleMGPlayer = ModuleMGPlayer;
  static ModuleMGTrack: typeof ModuleMGTrack = ModuleMGTrack;
  static ModuleMiniGame: typeof ModuleMiniGame = ModuleMiniGame;
  static ModulePath: typeof ModulePath = ModulePath;
  static ModulePlaceable: typeof ModulePlaceable = ModulePlaceable;
  static ModulePlayer: typeof ModulePlayer = ModulePlayer;
  static ModuleRoom: typeof ModuleRoom = ModuleRoom;
  static ModuleSound: typeof ModuleSound = ModuleSound;
  static ModuleStore: typeof ModuleStore = ModuleStore;
  static ModuleTrigger: typeof ModuleTrigger = ModuleTrigger;
  static ModuleWaypoint: typeof ModuleWaypoint = ModuleWaypoint;

  module: Module;
  are: GFFObject;
  git: GFFObject;
  transWP: string|GFFObject;
  weather: AreaWeather = new AreaWeather(this);
  fog: THREE.Fog;
  path: ModulePath;
  visObject: VISObject;
  layout: LYTObject;
  areaMap: AreaMap;
  /** Elapsed ms since last area OnHeartbeat (retail 5999ms). */
  _areaHeartbeatElapsedMs: number = 0;
  _areaHeartbeatInitialized: boolean = false;
  /** Players currently in this area — drives Increase/DecreaseAILevelPriority. */
  playersInArea: number = 0;
  /** ARE template `ID` header (retail LoadAreaHeader header_info[0]) — not the game ObjectId */
  areId: number = 0;
  /** Retail GIT TransPending / TransPendCurrID / TransPendNextID */
  transPending: number = 0;
  transPendCurrId: number = 0;
  transPendNextId: number = 0;

  /**
   * Retail CSWSArea::GetNextTransitionPendingID — bump allocator, skip 0.
   */
  getNextTransitionPendingId(): number {
    this.transPendNextId = ((this.transPendNextId | 0) + 1) & 0xFF;
    if(this.transPendNextId === 0){
      this.transPendNextId = 1;
    }
    return this.transPendNextId;
  }

  /**
   * Retail CSWSArea::SetTransitionPending — door/trigger module-link handshake.
   * @param pending 1 while transition is in flight, 0 when cleared
   * @param currId optional pending id; allocated when pending and omitted
   */
  setTransitionPending(pending: boolean | number, currId?: number){
    const on = pending ? 1 : 0;
    this.transPending = on;
    if(on){
      this.transPendCurrId = (typeof currId === 'number' ? currId : this.getNextTransitionPendingId()) & 0xFF;
      if(this.transPendCurrId === 0){
        this.transPendCurrId = this.getNextTransitionPendingId();
      }
    }else{
      this.transPendCurrId = 0;
    }
  }

  /**
   * Retail CSWSArea field42_0x1e0 — visit mark during CountAreaTransitionTriggers.
   * Set when a transition into this area is chosen so only one portal per dest is used.
   */
  interAreaVisitMark: number = 0;

  cameras: ModuleCamera[] = [];
  creatures: ModuleCreature[] = [];
  /** Retail CSWCArea KeepCorpse shell cache (max 3). */
  corpseCache: CorpseCache = new CorpseCache();
  doorhooks: any[] = [];
  doors: ModuleDoor[] = [];
  encounters: ModuleEncounter[] = [];
  items: ModuleItem[] = [];
  placeables: ModulePlaceable[] = [];
  sounds: ModuleSound[] = [];
  stores: ModuleStore[] = [];
  triggers: ModuleTrigger[] = [];
  waypoints: ModuleWaypoint[] = [];
  areaOfEffects: ModuleAreaOfEffect[] = [];
  miniGame: ModuleMiniGame;
  walkmesh_rooms: ModuleRoom[] = [];
  /** Reused list for updateRoomAnimatedLights (creatures/placeables/doors/…). */
  private _lightingDynamicsScratch: Array<{ model?: unknown; position?: THREE.Vector3 }> = [];

  scriptResRefs: Map<AreaScriptKeys, string> = new Map<AreaScriptKeys, string>();

  audio: IAreaAudioProperties = {
    ambient: {
      day: 0,
      dayVolume: 0,
      night: 0,
      nightVolume: 0
    },
    music: {
      day: 0,
      battle: 0,
      night: 0,
      delay: 0
    },
    environmentAudio: 0,
  };

  alphaTest = 0.200000002980232;

  /**
   * Index into camerastyle.2da
   */
  cameraStyle = 0;

  /**
   * Module designer comments
   */
  comments = '';

  /**
   * @deprecated Deprecated: since NWN
   */
  creatorId = -1;

  /**
   * Determines if there is an active day/night cycle.
   * Retail CSWCArea::UpdateDayNightCycle / SetAsDay|Night|Dawn|Dusk.
   */
  dayNightCycle: boolean = false;

  /**
   * 
   */
  defaultEnvMap = '';

  /**
   * 
   */
  dynamicAmbientColor = 6312778;

  /**
   * @deprecated Deprecated: since NWN
   */
  expansionList: any[] = [];

  /**
   * Set of bit flags specifying area terrain type:
   * 0x0001: INTERIOR     (exterior if unset)
   * 0x0002: UNDERGROUND  (aboveground if unset)
   * 0x0004: NATURAL      (urban if unset)
   * These flags affect game behaviour with respect to ability to hear things behind walls, map exploration visibility, and whether certain feats are active, though not necessarily in that order. They do not affect how the toolset presents the area to the user.
   * @remarks currently unused
   */
  flags = 1;

  grass: IGrassProperties = {
    ambient: 0,
    density: 0,
    diffuse: 0,
    probability: { 
      lowerLeft: 0.25,
      lowerRight: 0.25,
      upperLeft: 0.25,
      upperRight: 0.25
    },
    quadSize: 0,
    textureName: ''
  };

  /**
   * TSL ARE DirtyARGB/Size/Formula/Func One–Three.
   * Formula values are stored after retail 0↔1 swap.
   */
  dirt: IAreaDirtProperties = {
    layers: [
      { argb: 0, size: 0, formula: 0, func: 0 },
      { argb: 0, size: 0, formula: 0, func: 0 },
      { argb: 0, size: 0, formula: 0, func: 0 },
    ],
  };

  /**
   * TRUE if the area is always night, FALSE if area is always day. Meaningful only if DayNightCycle is FALSE
   */
  isNight: boolean = false;

  /**
   * Runtime lighting night flag (retail `area.is_night`). Distinct from authored ARE `IsNight`.
   */
  lightingIsNight = false;

  /** Retail dawn-transition flag (CSWCArea field38_0x1b4). */
  dayNightDawnActive = false;

  /** Retail dusk-transition flag (CSWCArea field39_0x1b8). */
  dayNightDuskActive = false;

  /** Retail field41_0x1c0 — pending midpoint audio/lighting flip during dawn/dusk. */
  dayNightHalfwayPending = false;

  /** Last module day phase applied via SetTimeOfDayState. */
  appliedDayPhase: ModuleDayPhase | 0 = 0;

  /** Whether area BGM/ambient currently use day tracks. */
  audioUsesDayTracks = true;

  /** Retail `shadowAlpha` for this area's day/night cycle (0–1). */
  shadowAlpha = 0;

  /** Retail `beamingProjectionAlpha` during dawn/dusk (0–0.05). */
  beamingProjectionAlpha = 0;

  lightingScheme = 0;

  /**
   * Index into loadscreens.2da. Default loading screen to use when loading this area. 
   * @remarks Note that a Door or Trigger that has an area transition can override the loading screen of the destination area
   * not supported by KotOR or TSL. not sure if we will add support for this in the engine
   */
  loadScreenId = 0;

  /**
   * Modifier to Listen akill checks made in area
   */
  modListenCheck = 0;

  /**
   * Modifier to Spot skill checks made in area
   */
  modSpotCheck = 0;

  /**
   * Moon AmbientSource properties
   */
  moon: IAmbientSource = {
    ambientColor: 0,
    diffuseColor: 0,
    fogColor: 0,
    fogNear: 99,
    fogFar: 100,
    fogAmount: 1,
    fogOn: false,
    shadows: false
  };

  /**
   * Sun AmbientSource properties
   */
  sun: IAmbientSource = {
    ambientColor: 0,
    diffuseColor: 0,
    fogColor: 0,
    fogNear: 1000,
    fogFar: 2000,
    fogAmount: 1,
    fogOn: false,
    shadows: false
  };

  /**
   * Name of area as seen in game. 
   * ToDo: If there is a colon (:) in the name, then the game does not show any of the text up to and including the first colon
   */
  areaName: CExoLocString;

  /**
   * @remarks unimplemented
   */
  noHangBack: boolean;

  /**
   * Determines if the player can rest
   */
  noRest: boolean;
  
  playerOnly: boolean = false;

  /**
   * Index into pvpsettings.2da. 
   * Note that the settings are actually hard-coded into the game, and pvpsettings.2da serves only to provide text descriptions of the settings
   */
  playerVsPlayer: boolean = false;
  
  /**
   * Opacity of shadows (0-100)
   */
  shadowOpacity = 0;

  /**
   * Determines if the Stealth XP mechanic is enabled for this area
   */
  stealthXPEnabled = 0;

  /**
   * The amount of XP that will be subtracted from the stealthXP if the player is perceived by an enemy
   * If a player is able to successfully hide from an enemy, the stealthXPLoss will be added to the player's stealthXP after it's divided by two
   */
  stealthXPLoss = 0;

  /**
   * The maximum amount of stealth XP that can be gained in this area
   */
  stealthXPMax = 0;

  /**
   * The amount of stealth XP that the player has gained in this area
   */
  stealthXP = 0;

  /**
   * Tag of the area, used for scripting
   */
  tag = '';

  /**
   * Determines if the player can escape to the hideout
   */
  unescapable: boolean = false;

  /**
   * Revision number of the area. Initially 1 when area is first saved to disk, and increments every time the ARE file is saved. Equals 2 on second save, and so on
   */
  version = 1;

  /**
   * Strength of the wind in the area. None, Weak, or Strong (0-2).
   */
  windPower = 0;

  restrictMode: number;

  spellInstances: SpellCastInstance[] = [];
  combatProjectiles: CombatProjectile[] = [];
  textSprites: TextSprite3D[] = [];

  roomWalkmeshes: OdysseyWalkMesh[] = [];
  doorWalkmeshes: OdysseyWalkMesh[] = [];

  walkEdges: WalkmeshEdge[] = [];
  walkFaces: OdysseyFace3[] = [];

  constructor(resRef = '', are = new GFFObject(), git = new GFFObject()){
    super(are);
    this.objectType |= ModuleObjectType.ModuleArea;
    this.name = resRef;
    this.are = are;
    this.git = git;
    this.transWP = '';
  }

  dispose(){
    this.areaMap.dispose();
    this.corpseCache.clear();

    // Retail FadeAndStopDialogAmbientTrack @ 004e15c0 — 500ms on UnloadArea.
    void AudioEngine.GetAudioEngine().fadeStopDialogAmbientTrack();

    if(this.miniGame){
      this.miniGame.dispose();
      // Dedicated MG stream stopped — resume area BGM if buffers are loaded.
      const audio = AudioEngine.GetAudioEngine();
      if(audio.areaMusicLoaded || audio.areaMusicNightLoaded){
        this.musicBackgroundPlay();
      }
    }

    //clear area room objects
    while (this.rooms.length){
      this.rooms[0].destroy();
    }

    //clear area areaOfEffect objects
    while (this.areaOfEffects.length){
      this.areaOfEffects[0].destroy();
    }

    //clear area creature objects
    while (this.creatures.length){
      this.creatures[0].destroy();
    }

    //clear area item objects
    while (this.items.length){
      this.items[0].destroy();
    }

    //clear area placeable objects
    while (this.placeables.length){
      this.placeables[0].destroy();
    }

    //clear area door objects
    while (this.doors.length){
      this.doors[0].destroy();
    }

    //clear area trigger objects
    while (this.triggers.length){
      this.triggers[0].destroy();
    }

    //clear area waypoint objects
    while (this.waypoints.length){
      this.waypoints[0].destroy();
    }

    //clear area sound objects
    while (this.sounds.length){
      this.sounds[0].destroy();
    }

    while (GameState.PartyManager.party.length){
      const pm = GameState.PartyManager.party.shift();
      pm.destroy();
    }

    this.weather.destroy();
    DirtyTextureManager.dispose();
    TextureAnimationManager.dispose();
  }

  /**
   * Retail CSWSArea::AIUpdate — weather re-roll + OnHeartbeat every 5999ms.
   */
  aiUpdate(delta: number = 0){
    this.weather?.aiUpdate?.(delta);

    if(!this._areaHeartbeatInitialized){
      this._areaHeartbeatInitialized = true;
      this._areaHeartbeatElapsedMs = 0;
      return;
    }
    this._areaHeartbeatElapsedMs += 1000 * delta;
    if(this._areaHeartbeatElapsedMs > 5999){
      this._areaHeartbeatElapsedMs = 0;
      const onHeartbeat = this.scripts[ModuleObjectScript.AreaOnHeartbeat];
      if(onHeartbeat){
        try{
          onHeartbeat.run(this as any, 0);
        }catch(e){
          console.error('ModuleArea.aiUpdate OnHeartbeat', e);
        }
      }
    }
  }

  /**
   * Per-frame client/visual pass (retail CClientAIMaster + CSWCArea visuals).
   * Server AI for game objects is driven by ServerAIMaster.
   */
  clientUpdate(delta: number = 0){
    // Re-read lengths each iteration: destroy/detach can splice mid-update
    for(let i = 0; i < this.triggers.length; i++){
      this.triggers[i]?.update(delta);
    }

    for(let i = 0; i < this.encounters.length; i++){
      this.encounters[i]?.update(delta);
    }
    
    for(let i = 0; i < this.areaOfEffects.length; i++){
      this.areaOfEffects[i]?.update(delta);
    }

    for(let i = 0; i < this.doors.length; i++){
      this.doors[i]?.update(delta);
    }

    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      GameState.PartyManager.party[i]?.update(delta);
    }
    
    for(let i = 0; i < this.creatures.length; i++){
      this.creatures[i]?.update(delta);
    }

    for(let i = 0; i < this.placeables.length; i++){
      this.placeables[i]?.update(delta);
    }

    //unset party controlled
    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      const pm = GameState.PartyManager.party[i];
      if(pm) pm.controlled = false;
    }

    if(GameState.Mode == EngineMode.MINIGAME){
      this.miniGame.tick(delta);
    }

    //update rooms
    for(let i = 0; i < this.rooms.length; i++){
      this.rooms[i]?.update(delta);
      // this.rooms[i].hide();
    }

    for(let i = 0; i < this.spellInstances.length; i++){
      this.spellInstances[i]?.update(delta);
    }

    let spellIndex = this.spellInstances.length;
    while(spellIndex--){
      const spellInstance = this.spellInstances[spellIndex];
      if(spellInstance && spellInstance.completed){
        spellInstance.dispose();
        this.spellInstances.splice(spellIndex, 1);
      }
    }

    for(let i = 0; i < this.combatProjectiles.length; i++){
      this.combatProjectiles[i]?.update(delta);
    }
    let projIndex = this.combatProjectiles.length;
    while(projIndex--){
      const proj = this.combatProjectiles[projIndex];
      if(proj && (proj.completed || proj.disposed)){
        this.combatProjectiles.splice(projIndex, 1);
      }
    }

    const textSpriteIndexer = new Map();
    for(let i = 0, textSpriteCount = this.textSprites.length; i < textSpriteCount; i++){
      const sprite = this.textSprites[i];
      if(!sprite) continue;

      if(!textSpriteIndexer.has(sprite.owner.id)){
        textSpriteIndexer.set(sprite.owner.id, 0);
      }
      const index = textSpriteIndexer.get(sprite.owner.id);

      sprite.container.position.copy(sprite.position);
      sprite.container.position.z = sprite.position.z + (0.1 * index);

      sprite.update(delta);
      textSpriteIndexer.set(sprite.owner.id, index + 1);
    }

    let textSpriteIndex = this.textSprites.length;
    while(textSpriteIndex--){
      const textSprite = this.textSprites[textSpriteIndex];
      if(textSprite && textSprite.expired){
        textSprite.dispose();
        this.textSprites.splice(textSpriteIndex, 1);
      }
    }

    this.updateRoomVisibility(delta);
    FollowerCamera.update(delta, this);

    this.weather.update(delta);

    if(this.path){
      this.path.update(delta);
    }

    this.updateDayNightCycle();
    this.updateMusic(delta);
  }

  /** @deprecated Prefer clientUpdate — kept for callers that still use area.update */
  update(delta: number = 0){
    this.clientUpdate(delta);
  }

  updatePaused(delta: number = 0){
    // Visual pass while paused; TimeStop exclusions already got aiUpdate via ServerAIMaster
    for(let i = 0; i < this.triggers.length; i++){
      this.triggers[i]?.updatePaused(delta);
    }

    for(let i = 0; i < this.encounters.length; i++){
      this.encounters[i]?.updatePaused(delta);
    }

    for(let i = 0; i < this.areaOfEffects.length; i++){
      this.areaOfEffects[i]?.updatePaused(delta);
    }

    for(let i = 0; i < this.doors.length; i++){
      this.doors[i]?.updatePaused(delta);
    }

    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      const pm = GameState.PartyManager.party[i];
      if(!pm) continue;
      if(GameState.timeStopActive && GameState.timeStopExclusions?.has(pm.id)){
        // Full visual update for TimeStop exclusions (aiUpdate already ran)
        pm.update(delta);
      }else{
        pm.updatePaused(delta);
      }
    }
    
    for(let i = 0; i < this.creatures.length; i++){
      const c = this.creatures[i];
      if(!c) continue;
      if(GameState.timeStopActive && GameState.timeStopExclusions?.has(c.id)){
        c.update(delta);
      }else{
        c.updatePaused(delta);
      }
    }
    
    for(let i = 0; i < this.placeables.length; i++){
      this.placeables[i]?.updatePaused(delta);
    }

    if(GameState.Mode == EngineMode.MINIGAME){
      this.miniGame.tickPaused(delta);
    }

    this.updateRoomVisibility(delta);
    FollowerCamera.update(delta, this);

    this.updateDayNightCycle();
    this.updateMusic(delta);
  }

  /**
   * Retail CSWCArea::UpdateDayNightCycle @ 00606490 + SetTimeOfDayState @ 00640640.
   * Applies sun/moon lighting for the module day phase and lerps during dawn/dusk.
   */
  updateDayNightCycle(){
    const timeManager = this.module?.timeManager;
    if(!timeManager){ return; }

    const phase = timeManager.dayPhase;
    if(this.appliedDayPhase !== phase){
      this.setTimeOfDayState(phase);
    }

    if(!this.dayNightDawnActive && !this.dayNightDuskActive){
      return;
    }

    const hourLengthMs = timeManager.minutesPerHour * ModuleCalendar.SECONDS_IN_MINUTE * ModuleCalendar.MILISECONDS_IN_SECOND;
    if(hourLengthMs <= 0){ return; }

    const progress = Math.min(1, Math.max(0, timeManager.transition / hourLengthMs));
    const sun = this.sun;
    const moon = this.moon;
    const half = 0.5;

    if(this.dayNightDawnActive){
      if(progress < 1){
        // Dawn: moon → sun; beamingProjectionAlpha = progress * 0.05
        this.beamingProjectionAlpha = progress * 0.05;
        this.updateTransitionShadowAlpha(progress, half);
        this.applyLightingColors(
          this.lerpColor(moon.ambientColor, sun.ambientColor, progress),
          this.lerpColor(moon.diffuseColor, sun.diffuseColor, progress),
          this.lerpColor(moon.fogColor, sun.fogColor, progress),
          this.lerpScalar(moon.fogNear, sun.fogNear, progress),
          this.lerpScalar(moon.fogFar, sun.fogFar, progress),
          !!(sun.fogOn || moon.fogOn),
          this.shadowAlpha
        );
      }else{
        this.dayNightDawnActive = false;
        this.dayNightHalfwayPending = false;
        this.lightingIsNight = false;
        this.beamingProjectionAlpha = 0.05;
        this.applySunLighting();
      }
    }else if(this.dayNightDuskActive){
      if(progress < 1){
        // Dusk: sun → moon; beamingProjectionAlpha = 0.05 - progress * 0.05
        this.beamingProjectionAlpha = 0.05 - progress * 0.05;
        this.updateTransitionShadowAlpha(progress, half);
        this.applyLightingColors(
          this.lerpColor(sun.ambientColor, moon.ambientColor, progress),
          this.lerpColor(sun.diffuseColor, moon.diffuseColor, progress),
          this.lerpColor(sun.fogColor, moon.fogColor, progress),
          this.lerpScalar(sun.fogNear, moon.fogNear, progress),
          this.lerpScalar(sun.fogFar, moon.fogFar, progress),
          !!(sun.fogOn || moon.fogOn),
          this.shadowAlpha
        );
      }else{
        this.dayNightDuskActive = false;
        this.dayNightHalfwayPending = false;
        this.lightingIsNight = true;
        this.beamingProjectionAlpha = 0;
        this.applyMoonLighting();
      }
    }

    if(this.dayNightHalfwayPending && progress >= half){
      if(this.dayNightDuskActive){
        this.lightingIsNight = true;
      }else if(this.dayNightDawnActive){
        this.lightingIsNight = false;
      }
      this.dayNightHalfwayPending = false;
      this.updateAmbientAudioTimeOfDay();
    }

    // Retail UpdateDayNightCycle refreshes sound-object hour/phase gates every frame.
    this.updateSoundObjectsTimeOfDay();
  }

  /**
   * Retail UpdateDayNightCycle shadowAlpha during dawn/dusk:
   * before midpoint → opacity*0.01*(1 - t/0.5);
   * after midpoint  → opacity*0.01*(t/0.5 - 1).
   */
  updateTransitionShadowAlpha(progress: number, half = 0.5){
    this.shadowAlpha = ModuleArea.computeTransitionShadowAlpha(
      this.shadowOpacity,
      progress,
      this.dayNightHalfwayPending,
      half
    );
  }

  /** Pure retail shadowAlpha curve for dawn/dusk (unit-tested). */
  static computeTransitionShadowAlpha(shadowOpacity: number, progress: number, beforeHalfway: boolean, half = 0.5){
    return ModuleTimeManager.computeTransitionShadowAlpha(shadowOpacity, progress, beforeHalfway, half);
  }

  /**
   * Retail CSWCModule::SetTimeOfDayState @ 00640640.
   */
  setTimeOfDayState(phase: ModuleDayPhase){
    switch(phase){
      case ModuleDayPhase.Day:
        this.setAsDay();
        break;
      case ModuleDayPhase.Night:
        this.setAsNight();
        break;
      case ModuleDayPhase.Dawn:
        this.setAsNight();
        this.setAsDawn();
        break;
      case ModuleDayPhase.Dusk:
        this.setAsDay();
        this.setAsDusk();
        break;
    }

    if(this.appliedDayPhase !== phase){
      this.appliedDayPhase = phase;
      this.updateSoundObjectsTimeOfDay();
      this.updateAmbientAudioTimeOfDay();
    }
  }

  /** Retail CSWCArea::SetAsDay @ 006058c0. */
  setAsDay(){
    if(!this.dayNightCycle && this.isNight){
      this.setAsNight();
      return;
    }
    this.dayNightDawnActive = false;
    this.dayNightDuskActive = false;
    this.dayNightHalfwayPending = true;
    this.lightingIsNight = false;
    this.beamingProjectionAlpha = 0.05;
    this.shadowAlpha = (this.shadowOpacity | 0) * 0.01;
    this.applySunLighting();
  }

  /** Retail CSWCArea::SetAsNight @ 006059c0. */
  setAsNight(){
    if(!this.dayNightCycle && !this.isNight){
      this.setAsDay();
      return;
    }
    this.dayNightDawnActive = false;
    this.dayNightDuskActive = false;
    this.dayNightHalfwayPending = true;
    this.lightingIsNight = true;
    this.beamingProjectionAlpha = 0;
    this.shadowAlpha = (this.shadowOpacity | 0) * 0.01;
    this.applyMoonLighting();
  }

  /** Retail CSWCArea::SetAsDawn @ 00606cf0. */
  setAsDawn(){
    if(!this.dayNightCycle){
      if(this.isNight){
        this.setAsNight();
      }else{
        this.setAsDay();
      }
      return;
    }
    this.dayNightHalfwayPending = true;
    this.dayNightDawnActive = true;
    this.dayNightDuskActive = false;
    this.lightingIsNight = true;
    this.beamingProjectionAlpha = 0;
    this.shadowAlpha = (this.shadowOpacity | 0) * 0.01;
  }

  /** Retail CSWCArea::SetAsDusk @ 00606c50. */
  setAsDusk(){
    if(!this.dayNightCycle){
      if(this.isNight){
        this.setAsNight();
      }else{
        this.setAsDay();
      }
      return;
    }
    this.dayNightHalfwayPending = true;
    this.dayNightDuskActive = true;
    this.dayNightDawnActive = false;
    this.lightingIsNight = false;
    this.beamingProjectionAlpha = 0.05;
    this.shadowAlpha = (this.shadowOpacity | 0) * 0.01;
  }

  /**
   * Retail CSWCArea::ForceBrightSunAndMoon @ 00605fe0.
   * Ambient RGB → 0; diffuse RGB → 1; sun fog off; reapply day/night.
   */
  forceBrightSunAndMoon(){
    this.sun.ambientColor = 0;
    this.moon.ambientColor = 0;
    this.sun.diffuseColor = 0xffffff;
    this.moon.diffuseColor = 0xffffff;
    this.sun.fogOn = false;
    if(this.lightingIsNight){
      this.setAsNight();
    }else{
      this.setAsDay();
    }
  }

  applySunLighting(){
    this.applyLightingColors(
      this.sun.ambientColor,
      this.sun.diffuseColor,
      this.sun.fogColor,
      this.sun.fogNear,
      this.sun.fogFar,
      !!this.sun.fogOn,
      this.shadowAlpha
    );
  }

  applyMoonLighting(){
    this.applyLightingColors(
      this.moon.ambientColor,
      this.moon.diffuseColor,
      this.moon.fogColor,
      this.moon.fogNear,
      this.moon.fogFar,
      !!this.moon.fogOn,
      this.shadowAlpha
    );
  }

  /**
   * Apply retail sun/moon directional ambient + diffuse (+ fog/clear).
   * Scene light-model ambient stays ARE DynAmbientColor (see applyDynAmbient).
   * sunAmbient → directional ambient channel; diffuse → OdysseyLightingBinder sunColor.
   * Colors are applied directly — no invented intensity curves (CSWCArea::UpdateDayNightCycle @ 00606490).
   * shadowAlpha / beamingProjectionAlpha remain on GameState for stencil shadows / beaming meshes.
   */
  applyLightingColors(
    sunAmbientColor: number,
    diffuseColor: number,
    fogColor: number,
    fogNear: number,
    fogFar: number,
    fogOn: boolean,
    shadowAlpha = this.shadowAlpha
  ){
    this.shadowAlpha = shadowAlpha;
    // Gate stencil/creature blobs on ARE SunShadows / MoonShadows for active period.
    GameState.areaShadowsEnabled = this.lightingIsNight ? !!this.moon.shadows : !!this.sun.shadows;
    GameState.shadowAlpha = GameState.areaShadowsEnabled ? this.shadowAlpha : 0;
    GameState.beamingProjectionAlpha = this.beamingProjectionAlpha;

    // Keep DynAmbient as scene ambient (LoadArea → CAurScene::SetAmbient).
    this.applyDynAmbient();

    const sar = (sunAmbientColor & 0xFF) / 255;
    const sag = ((sunAmbientColor >> 8) & 0xFF) / 255;
    const sab = ((sunAmbientColor >> 16) & 0xFF) / 255;
    GameState.sunAmbientColor.setRGB(sar, sag, sab);
    OdysseyLightingBinder.setAreaSunAmbient(GameState.sunAmbientColor);

    const dr = (diffuseColor & 0xFF) / 255;
    const dg = ((diffuseColor >> 8) & 0xFF) / 255;
    const db = ((diffuseColor >> 16) & 0xFF) / 255;
    GameState.sunColor.setRGB(dr, dg, db);
    OdysseyLightingBinder.setAreaSun(GameState.sunColor);
    OdysseyLightingBinder.setAreaSunDirection(GameState.sunDirection.x, GameState.sunDirection.y, GameState.sunDirection.z);
    if(GameState.sunLight){
      GameState.sunLight.color.copy(GameState.sunColor);
      GameState.sunLight.intensity = 1;
    }

    if(fogOn){
      if(!this.fog){
        this.fog = new THREE.Fog(fogColor, fogNear, fogFar);
      }else{
        this.fog.color.setHex(fogColor);
        this.fog.near = fogNear;
        this.fog.far = fogFar;
      }
      GameState.scene.fog = this.fog;
    }else{
      this.fog = undefined;
      GameState.scene.fog = undefined;
    }

    if(GameState.renderer){
      GameState.renderer.setClearColor(new THREE.Color(fogColor));
    }

    this.updateBeamingMaterials();
  }

  /**
   * Retail LoadArea → CAurScene::SetAmbient(DynAmbientColor).
   * This is the light-model ambient for dynamic objects — not sun/moon ambient.
   */
  applyDynAmbient(){
    const c = this.dynamicAmbientColor | 0;
    const ar = (c & 0xFF) / 255;
    const ag = ((c >> 8) & 0xFF) / 255;
    const ab = ((c >> 16) & 0xFF) / 255;
    GameState.ambientColor.setRGB(ar, ag, ab);
    OdysseyLightingBinder.setAreaAmbient(GameState.ambientColor);
    if(GameState.globalLight){
      GameState.globalLight.color.copy(GameState.ambientColor);
      GameState.globalLight.intensity = 1;
    }
  }

  /**
   * Read one TSL ARE dirt layer (One/Two/Three). Missing fields → zeros.
   * Retail CSWSArea::LoadAreaHeader swaps DirtyFormula 0↔1 before storage.
   */
  readAreDirtLayer(suffix: 'One' | 'Two' | 'Three'): IAreaDirtLayer {
    const readInt = (label: string): number | undefined => {
      if(!this.are?.RootNode?.hasField(label)){
        return undefined;
      }
      const field = this.are.getFieldByLabel(label);
      return field ? (field.getValue() | 0) : undefined;
    };
    const authoredFormula = readInt(`DirtyFormula${suffix}`);
    let formula = authoredFormula ?? 0;
    if(authoredFormula !== undefined){
      if(formula === 1){
        formula = 0;
      }else if(formula === 0){
        formula = 1;
      }
    }
    return {
      argb: readInt(`DirtyARGB${suffix}`) ?? 0,
      size: readInt(`DirtySize${suffix}`) ?? 0,
      formula,
      func: readInt(`DirtyFunc${suffix}`) ?? 0,
    };
  }

  /**
   * Retail SetBeaming @ 0047147e — apply beamingProjectionAlpha to beaming meshes
   * (additive blend color alpha during dawn/dusk).
   */
  updateBeamingMaterials(){
    const alpha = this.beamingProjectionAlpha;
    const rooms = this.rooms;
    for(let i = 0, il = rooms.length; i < il; i++){
      const room = rooms[i];
      if(!room.model || !(room.model instanceof OdysseyModel3D)){ continue; }
      for(let j = 0, jl = room.model.materials.length; j < jl; j++){
        const material = room.model.materials[j];
        if(!material?.userData?.beaming){ continue; }
        if(material instanceof THREE.ShaderMaterial && material.uniforms?.opacity){
          material.uniforms.opacity.value = alpha;
        }else{
          material.opacity = alpha;
        }
        material.visible = alpha > 0;
        material.transparent = true;
      }
    }
  }

  lerpScalar(from: number, to: number, t: number){
    return from + (to - from) * t;
  }

  lerpColor(from: number, to: number, t: number){
    const fr = from & 0xFF;
    const fg = (from >> 8) & 0xFF;
    const fb = (from >> 16) & 0xFF;
    const tr = to & 0xFF;
    const tg = (to >> 8) & 0xFF;
    const tb = (to >> 16) & 0xFF;
    const r = Math.round(fr + (tr - fr) * t) & 0xFF;
    const g = Math.round(fg + (tg - fg) * t) & 0xFF;
    const b = Math.round(fb + (tb - fb) * t) & 0xFF;
    return (b << 16) | (g << 8) | r;
  }

  /**
   * Day and dawn use day tracks; night and dusk use night tracks
   * (retail CSWCSoundObject::UpdateTimeOfDay phase grouping).
   */
  static usesDayAudioTracks(phase: ModuleDayPhase){
    return ModuleTimeManager.usesDayAudioTracks(phase);
  }

  updateAmbientAudioTimeOfDay(){
    const phase = this.module?.timeManager?.dayPhase ?? ModuleDayPhase.Day;
    const useDay = ModuleTimeManager.usesDayAudioTracks(phase);
    if(this.audioUsesDayTracks === useDay){
      const audioEngine = AudioEngine.GetAudioEngine();
      const musicEmitter = useDay ? audioEngine.areaMusicDayAudioEmitter : audioEngine.areaMusicNightAudioEmitter;
      const ambientEmitter = useDay ? audioEngine.ambientAudioDayEmitter : audioEngine.ambientAudioNightEmitter;
      if(musicEmitter.playing || ambientEmitter.playing){
        return;
      }
    }
    this.audioUsesDayTracks = useDay;
    this.musicBackgroundPlay();
    this.ambientSoundPlay();
  }

  updateSoundObjectsTimeOfDay(){
    const phase = this.module?.timeManager?.dayPhase ?? ModuleDayPhase.Day;
    const hour = this.module?.timeManager?.hour ?? 0;
    for(let i = 0; i < this.sounds.length; i++){
      this.sounds[i]?.updateTimeOfDay(phase, hour);
    }
  }

  applyAreaWind(): void {
    const effectiveWind = (this.flags & 1) ? 0 : this.windPower;
    if (GameState.windManager) {
      GameState.windManager.applyWindLevel(effectiveWind);
    }
  }

  /**
   * Push wind grid uniforms to grass and dangly materials that are not yet bound.
   */
  updateRoomWindUniforms(): void {
    const wm = GameState.windManager;
    if (!wm) return;

    const rooms = this.rooms;
    for (let i = 0, il = rooms.length; i < il; i++) {
      const room = rooms[i];
      if (!room.isVisible() || !room.model) continue;
      if (!(room.model instanceof OdysseyModel3D)) continue;
      WindManager.bindModelWindUniforms(room.model, wm.windCacheID);
    }

    const bindCreatureModel = (obj: { model?: unknown }) => {
      if (obj?.model instanceof OdysseyModel3D) {
        WindManager.bindModelWindUniforms(obj.model, wm.windCacheID);
      }
    };
    for (let i = 0; i < this.creatures.length; i++) bindCreatureModel(this.creatures[i]);
    for (let i = 0; i < this.placeables.length; i++) bindCreatureModel(this.placeables[i]);
    for (let i = 0; i < this.doors.length; i++) bindCreatureModel(this.doors[i]);
    for (let i = 0; i < this.items.length; i++) bindCreatureModel(this.items[i]);
  }

  /**
   * Push packed Odyssey light + area ambient/sun uniforms to room and dynamic materials.
   */
  updateRoomAnimatedLights(delta: number = 0){
    void delta;

    const lm = GameState.lightManager;
    const camera = GameState.currentCamera;
    // RenderOnlyGobs walks Scene.objects — creatures, placeables, doors, items,
    // party members, and other model-bearing gobs that receive GetNearestLights.
    const dynamics = this._lightingDynamicsScratch;
    dynamics.length = 0;
    for(let i = 0; i < this.creatures.length; i++) dynamics.push(this.creatures[i]);
    for(let i = 0; i < this.placeables.length; i++) dynamics.push(this.placeables[i]);
    for(let i = 0; i < this.doors.length; i++) dynamics.push(this.doors[i]);
    for(let i = 0; i < this.items.length; i++) dynamics.push(this.items[i]);
    for(let i = 0; i < this.areaOfEffects.length; i++) dynamics.push(this.areaOfEffects[i]);
    const party = GameState.PartyManager?.party;
    if(party){
      for(let i = 0; i < party.length; i++) dynamics.push(party[i]);
    }
    if(GameState.player){
      dynamics.push(GameState.player);
    }
    // MG followers use container as `.model` (no materials) — bind child OdysseyModel3Ds.
    if(this.miniGame){
      this.miniGame.collectLightingModels(dynamics);
    }
    OdysseyLightingBinder.bindArea(lm, this.rooms, dynamics, camera);
  }

  updateMusic(delta: number = 0){
    // Battle music is event-driven from SetExcitedState / UpdateExcitedStateTimer
    // (AudioEngine.playBattleMusic). AudioEngine.update handles post-fade start delay.
    void delta;
  }

  /**
   * Retail CSWSAmbientSound::PlayBattleMusic @ 005c9b90.
   * NWScript MusicBattlePlay / MusicBattleStop and excited-timer combat music share this path.
   */
  playBattleMusic(play: boolean){
    AudioEngine.GetAudioEngine().playBattleMusic(play);
  }

  musicBackgroundPlay(){
    const audioEngine = AudioEngine.GetAudioEngine();
    audioEngine.setAreaMusicWanted(true);
    const useDay = this.audioUsesDayTracks;
    audioEngine.areaMusicPreferNight = !useDay;
    const active = useDay ? audioEngine.areaMusicDayAudioEmitter : audioEngine.areaMusicNightAudioEmitter;
    const inactive = useDay ? audioEngine.areaMusicNightAudioEmitter : audioEngine.areaMusicDayAudioEmitter;
    const fadeSec = AREA_MUSIC_FADE_MS / 1000;
    if(inactive.playing){
      void inactive.fadeOutAndStop(fadeSec);
    }
    if(!active.playing){
      active.play(true);
    }
  }

  musicBackgroundStop(){
    const audioEngine = AudioEngine.GetAudioEngine();
    audioEngine.setAreaMusicWanted(false);
    void audioEngine.fadeStopAreaMusic();
  }

  musicBackgroundSetDelay(delay: number){
    const audioEngine = AudioEngine.GetAudioEngine();
    audioEngine.bgmLoopTime = delay;
  }

  async musicBackgroundDaySet(index: number, streamingMusicForMovie: number = 0){
    const audioEngine = AudioEngine.GetAudioEngine();
    const ambientmusic2DA = GameState.TwoDAManager.datatables.get('ambientmusic');
    const bgMusic = ambientmusic2DA.rows[index];
    this.audio.music.day = index;
    const prevName = audioEngine.areaMusicDayAudioEmitter?.name || '';
    const wasPlaying = !!audioEngine.areaMusicDayAudioEmitter?.playing;
    try{
      if(bgMusic && bgMusic.resource != '****'){
        console.log('Loading Background Music', bgMusic.resource);
        const data = await AudioLoader.LoadMusic(bgMusic.resource);
        audioEngine.setAudioBuffer('BACKGROUND_MUSIC_DAY', data.buffer as ArrayBuffer, bgMusic.resource);
        audioEngine.areaMusicDayAudioEmitter.streamingMusicForMovie = !!streamingMusicForMovie;
        // Retail SetMusicDayTrack: if playing & different file → PlayMusic(0) then PlayMusic(1).
        const newName = (bgMusic.resource || '').toLowerCase();
        if(wasPlaying && prevName && prevName.toLowerCase() !== newName){
          await audioEngine.areaMusicDayAudioEmitter.fadeOutAndStop(AREA_MUSIC_FADE_MS / 1000);
        }
        if(audioEngine.areaMusicWanted){
          this.musicBackgroundPlay();
        }
      }else{
        audioEngine.areaMusicDayAudioEmitter.streamingMusicForMovie = !!streamingMusicForMovie;
      }
    }catch(e){
      console.log('Background Music not found', bgMusic);
      console.error(e);
    }
  }

  async musicBackgroundNightSet(index: number, streamingMusicForMovie: number = 0){
    const audioEngine = AudioEngine.GetAudioEngine();
    const ambientmusic2DA = GameState.TwoDAManager.datatables.get('ambientmusic');
    const bgMusic = ambientmusic2DA.rows[index];
    this.audio.music.night = index;
    const prevName = audioEngine.areaMusicNightAudioEmitter?.name || '';
    const wasPlaying = !!audioEngine.areaMusicNightAudioEmitter?.playing;
    try{
      if(bgMusic && bgMusic.resource != '****'){
        console.log('Loading Background Music', bgMusic.resource);
        const data = await AudioLoader.LoadMusic(bgMusic.resource);
        audioEngine.setAudioBuffer('BACKGROUND_MUSIC_NIGHT', data.buffer as ArrayBuffer, bgMusic.resource);
        audioEngine.areaMusicNightAudioEmitter.streamingMusicForMovie = !!streamingMusicForMovie;
        const newName = (bgMusic.resource || '').toLowerCase();
        if(wasPlaying && prevName && prevName.toLowerCase() !== newName){
          await audioEngine.areaMusicNightAudioEmitter.fadeOutAndStop(AREA_MUSIC_FADE_MS / 1000);
        }
        if(audioEngine.areaMusicWanted){
          this.musicBackgroundPlay();
        }
      }else{
        audioEngine.areaMusicNightAudioEmitter.streamingMusicForMovie = !!streamingMusicForMovie;
      }
    }catch(e){
      console.log('Background Music not found', bgMusic);
      console.error(e);
    }
  }

  musicBattlePlay(){
    this.playBattleMusic(true);
  }

  musicBattleStop(){
    this.playBattleMusic(false);
  }

  async musicBattleSet(index: number){
    const audioEngine = AudioEngine.GetAudioEngine();
    //Load the battle music
    const ambientmusic2DA = GameState.TwoDAManager.datatables.get('ambientmusic');
    const battleMusic = ambientmusic2DA.rows[index];
    this.audio.music.battle = index;
    try{
      if(battleMusic.resource != '****'){
        console.log('Loading Battle Music', battleMusic.resource);
        const data = await AudioLoader.LoadMusic(battleMusic.resource);
        audioEngine.setAudioBuffer('BATTLE', data.buffer as ArrayBuffer, battleMusic.resource);
      }
      // Retail ReadInfo loads Stinger1–3; PlayStinger picks randomly among non-empty
      const stingerKeys = ['stinger1', 'stinger2', 'stinger3'] as const;
      const stingerBuffers: ArrayBuffer[] = [];
      for(let i = 0; i < stingerKeys.length; i++){
        const key = stingerKeys[i];
        const resRef = battleMusic[key];
        if(!resRef || resRef === '****'){
          continue;
        }
        try{
          console.log('Loading Battle Stinger', resRef);
          const data = await AudioLoader.LoadStreamSound(resRef);
          stingerBuffers.push(data.buffer as ArrayBuffer);
        }catch(e){
          console.log('Battle Stinger not found', resRef);
          console.error(e);
        }
      }
      audioEngine.setBattleStingerBuffers(stingerBuffers);
    }catch(e){
      console.log('Background Music not found', battleMusic);
      console.error(e);
    }
  }

  ambientSoundPlay(){
    const audioEngine = AudioEngine.GetAudioEngine();
    // Push GIT / script ambient volumes (0–100) into the engine before play.
    audioEngine.setAmbientDayVolume((this.audio.ambient.dayVolume ?? 100) / 100);
    audioEngine.setAmbientNightVolume((this.audio.ambient.nightVolume ?? 100) / 100);
    const useDay = this.audioUsesDayTracks;
    const active = useDay ? audioEngine.ambientAudioDayEmitter : audioEngine.ambientAudioNightEmitter;
    const inactive = useDay ? audioEngine.ambientAudioNightEmitter : audioEngine.ambientAudioDayEmitter;
    if(inactive.playing){
      inactive.stop();
    }
    if(!active.playing){
      active.play();
    }
  }

  ambientSoundStop(){
    const audioEngine = AudioEngine.GetAudioEngine();
    const sec = AMBIENT_SOUND_FADE_MS / 1000;
    void audioEngine.ambientAudioDayEmitter.fadeOutAndStop(sec);
    void audioEngine.ambientAudioNightEmitter.fadeOutAndStop(sec);
  }

  async ambientSoundDaySet(index: number){
    const audioEngine = AudioEngine.GetAudioEngine();

    this.audio.ambient.day = index;
    const ambientsound2DA = GameState.TwoDAManager.datatables.get('ambientsound');
    if(ambientsound2DA){
      //Load the ambient day sound
      const ambientDay = ambientsound2DA.rows[this.audio.ambient.day];
      if(!ambientDay || ambientDay.resource == '****'){
        return;
      }
      console.log('Loading Ambient Day Sound', ambientDay.resource);
      try{
        const data = await AudioLoader.LoadAmbientSound(ambientDay.resource);
        audioEngine.setAudioBuffer('AMBIENT_DAY', data.buffer as ArrayBuffer, ambientDay.resource);
      }catch(e){
        console.error('Ambient Audio not found', ambientDay);
      } 
    }
  }

  async ambientSoundNightSet(index: number){
    const audioEngine = AudioEngine.GetAudioEngine();

    this.audio.ambient.night = index;
    const ambientsound2DA = GameState.TwoDAManager.datatables.get('ambientsound');
    if(ambientsound2DA){
      const ambientNight = ambientsound2DA.rows[this.audio.ambient.night];
      if(!ambientNight || ambientNight.resource == '****'){
        return;
      }
      console.log('Loading Ambient Night Sound', ambientNight.resource);
      try{
        const data = await AudioLoader.LoadAmbientSound(ambientNight.resource);
        audioEngine.setAudioBuffer('AMBIENT_NIGHT', data.buffer as ArrayBuffer, ambientNight.resource);
      }catch(e){
        console.error('Ambient Audio not found', ambientNight);
      } 
    }
  }

  attachSpellInstance(spellInstance: SpellCastInstance){
    if(!spellInstance) return;
    GameState.group.spell_instances.add(spellInstance.container);
    this.spellInstances.push(spellInstance);
  }

  attachCombatProjectile(projectile: CombatProjectile){
    if(!projectile) return;
    this.combatProjectiles.push(projectile);
  }

  attachTextSprite3D(sprite: TextSprite3D){
    if(!sprite) return;
    GameState.group.effects.add(sprite.container);
    this.textSprites.push(sprite);
  }

  lastRoom: ModuleRoom = undefined;
  updateRoomVisibility(delta: number = 0){
    switch(GameState.Mode){
      case EngineMode.DIALOG:
        this.lastRoom = undefined;
        const roomInView: boolean[] = [];
        const pos = GameState.currentCamera.position.clone().add(GameState.playerFeetOffset);


        for(let i = 0, roomCount = this.rooms.length; i < roomCount; i++){
          const room = this.rooms[i];
          const inCamera = GameState.viewportFrustum.intersectsBox(room.box);
          roomInView[i] = (!room.visObject || room.box.containsPoint(pos) || inCamera);
          if(!roomInView[i]){
            room.hide();
            continue;
          }
          room.show(false);
        }
      break;
      case EngineMode.MINIGAME:
        this.lastRoom = undefined;
        for(let i = 0, len = this.rooms.length; i < len; i++){
          const room = this.rooms[i];
          if(!room) continue;
          room.show(false);
        }
      break;
      case EngineMode.INGAME:
      case EngineMode.FREELOOK:
      default:
        const player = GameState.getCurrentPlayer();
        if(!player){ return; }
        //Check to see if the player has moved to a new room
        if(this.lastRoom && this.lastRoom == player.room){
          return;
        }
        this.lastRoom = player.room;

        // Retail UpdateRoom @ 00430340 — SetDesiredEnvironment + SetDesiredAmbientScale.
        if(this.lastRoom?.envAudio >= 0){
          AudioEngine.GetAudioEngine().setDesiredEnvironment(this.lastRoom.envAudio || 0);
        }
        if(this.lastRoom && Number.isFinite(this.lastRoom.ambientScale)){
          AudioEngine.GetAudioEngine().setDesiredAmbientScale(this.lastRoom.ambientScale);
        }

        //Reset all room's visibility to hidden
        const roomCount = this.rooms.length;
        for(let i = 0; i < roomCount; i++){
          const room = this.rooms[i];
          room.hide();
        }

        if(!player.room){
          return;
        }

        //Show the current room and all of it's linked rooms
        player.room.show(true);
      break;
    }
  }

  async reloadTextures(){
    GameState.MenuManager.LoadScreen.open();
    GameState.MenuManager.LoadScreen.LBL_HINT.setText('');
    GameState.loadingTextures = true;
    //Cleanup texture cache
    Array.from(TextureLoader.textures.keys()).forEach( (key) => {
      TextureLoader.textures.get(key).dispose();
      TextureLoader.textures.delete(key); 
    });


    for(let i = 0; i < this.rooms.length; i++){
      const room = this.rooms[i];
      //room.LoadModel();
    }

    for(let i = 0; i < this.creatures.length; i++){
      const creature = this.creatures[i];
      await creature.loadModel();
    }

    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      const creature = GameState.PartyManager.party[i];
      await creature.loadModel();
    }

    for(let i = 0; i < this.placeables.length; i++){
      const placeable = this.placeables[i];
      await placeable.loadModel();
    }

    for(let i = 0; i < this.doors.length; i++){   
      const door = this.doors[i];
      await door.loadModel();
    }

    for(let i = 0; i < this.rooms.length; i++){
      const room = this.rooms[i];
      await room.loadModel();
    }

    TextureLoader.LoadQueue((ref: ITextureLoaderQueuedRef, index: number, count: number) => {
      GameState.MenuManager.LoadScreen.setProgress((index/count + 1) * 100);
      GameState.MenuManager.LoadScreen.LBL_HINT.setText('Loading: '+ref.name);
      //console.log('tex', textureName, index, count);
    }).then(() => {
      GameState.MenuManager.LoadScreen.close();
      GameState.loadingTextures = false;
    });
  }

  setTransitionWaypoint(sTag = ''){
    this.transWP = sTag;
  }

  async load(){

    //BEGIN AREA LOAD

    // ARE ObjectId (when present, e.g. embedded save ARE) is the game object id.
    // ARE ID header is separate (retail header_info[0]) — never overwrite this.id with it.
    if(this.are.RootNode.hasField('ObjectId'))
      this.id = this.are.getFieldByLabel('ObjectId').getValue();

    let rooms = this.are.getFieldByLabel('Rooms');

    this.alphaTest = this.are.getFieldByLabel('AlphaTest').getValue();
    this.cameraStyle = this.are.getFieldByLabel('CameraStyle').getValue();
    this.weather.chanceLightning = this.are.getFieldByLabel('ChanceLightning').getValue();
    this.weather.chanceRain = this.are.getFieldByLabel('ChanceRain').getValue();
    this.weather.chanceSnow = this.are.getFieldByLabel('ChanceSnow').getValue();
    this.comments = this.are.getFieldByLabel('Comments').getValue();
    this.creatorId = this.are.getFieldByLabel('Creator_ID').getValue();
    this.dayNightCycle = this.are.getFieldByLabel('DayNightCycle').getValue();
    this.defaultEnvMap = this.are.getFieldByLabel('DefaultEnvMap').getValue();
    // Retail CSWCObject::SetEnvMap @ 0063cb70 resolves the "DEFAULT" envmap resref
    // against the current area's DefaultEnvMap.
    OdysseyMaterialBuilder.defaultEnvMap = this.defaultEnvMap;
    this.dynamicAmbientColor = this.are.getFieldByLabel('DynAmbientColor').getValue();
    this.applyDynAmbient();
    this.expansionList = [];

    this.flags = this.are.getFieldByLabel('Flags').getValue();
    // Retail LoadAreaHeader: indoor (Flags & 1) clears weather chances / wind.
    if(this.flags & 1){
      this.weather.chanceLightning = 0;
      this.weather.chanceRain = 0;
      this.weather.chanceSnow = 0;
    }
    this.grass = {
      ambient: this.are.getFieldByLabel('Grass_Ambient').getValue(),
      density: this.are.getFieldByLabel('Grass_Density').getValue(),
      diffuse: this.are.getFieldByLabel('Grass_Diffuse').getValue(),
      probability: {
        lowerLeft: this.are.getFieldByLabel('Grass_Prob_LL').getValue(),
        lowerRight: this.are.getFieldByLabel('Grass_Prob_LR').getValue(),
        upperLeft: this.are.getFieldByLabel('Grass_Prob_UL').getValue(),
        upperRight: this.are.getFieldByLabel('Grass_Prob_UR').getValue()
      },
      quadSize: this.are.getFieldByLabel('Grass_QuadSize').getValue(),
      textureName: this.are.getFieldByLabel('Grass_TexName').getValue()
    };

    // TSL dirt layers (DirtyARGB/Size/Formula/Func One–Three). Retail swaps formula 0↔1 on load.
    this.dirt = {
      layers: [
        this.readAreDirtLayer('One'),
        this.readAreDirtLayer('Two'),
        this.readAreDirtLayer('Three'),
      ],
    };

    this.areId = this.are.getFieldByLabel('ID').getValue();
    this.isNight = this.are.getFieldByLabel('IsNight').getValue();
    this.lightingScheme = this.are.getFieldByLabel('LightingScheme').getValue();
    this.loadScreenId = this.are.getFieldByLabel('LoadScreenID').getValue();

    let map = this.are.getFieldByLabel('Map').getChildStructs()[0];
    if(map){
      this.areaMap = AreaMap.FromStruct(map);
    }

    if(this.are.RootNode.hasField('MiniGame')){
      this.miniGame = new ModuleMiniGame(
        this.are.getFieldByLabel('MiniGame').getChildStructs()[0]
      );
    }

    this.modListenCheck = this.are.getFieldByLabel('ModListenCheck').getValue();
    this.modSpotCheck = this.are.getFieldByLabel('ModSpotCheck').getValue();
    this.moon.ambientColor = this.are.getFieldByLabel('MoonAmbientColor').getValue();
    this.moon.diffuseColor = this.are.getFieldByLabel('MoonDiffuseColor').getValue();
    this.moon.fogColor = this.are.getFieldByLabel('MoonFogColor').getValue();
    this.moon.fogFar = this.are.getFieldByLabel('MoonFogFar').getValue();
    this.moon.fogNear = this.are.getFieldByLabel('MoonFogNear').getValue();
    this.moon.fogOn = !!this.are.getFieldByLabel('MoonFogOn').getValue();
    this.moon.shadows = !!this.are.getFieldByLabel('MoonShadows').getValue();
    this.areaName = this.are.getFieldByLabel('Name').getCExoLocString();

    this.noHangBack = !!this.are.getFieldByLabel('NoHangBack').getValue();
    this.noRest = !!this.are.getFieldByLabel('NoRest').getValue();

    if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnEnter)){
      this.scriptResRefs.set(ModuleObjectScript.AreaOnEnter, this.are.getFieldByLabel(ModuleObjectScript.AreaOnEnter).getValue());
    }

    if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnExit)){
      this.scriptResRefs.set(ModuleObjectScript.AreaOnExit, this.are.getFieldByLabel(ModuleObjectScript.AreaOnExit).getValue());
    }

    if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnHeartbeat)){
      this.scriptResRefs.set(ModuleObjectScript.AreaOnHeartbeat, this.are.getFieldByLabel(ModuleObjectScript.AreaOnHeartbeat).getValue());
    }

    if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnUserDefined)){
      this.scriptResRefs.set(ModuleObjectScript.AreaOnUserDefined, this.are.getFieldByLabel(ModuleObjectScript.AreaOnUserDefined).getValue());
    }

    this.playerOnly = !!this.are.getFieldByLabel('PlayerOnly').getValue();
    this.playerVsPlayer = this.are.getFieldByLabel('PlayerVsPlayer').getValue();

    //Rooms
    for(let i = 0; i < rooms.childStructs.length; i++ ){
      let strt = rooms.childStructs[i];
      const roomName = this.are.getFieldByLabel('RoomName', strt.getFields()).getValue().toLowerCase();
      if(!roomName || roomName == '****'){
        continue;
      }
      const envAudio = this.are.getFieldByLabel('EnvAudio', strt.getFields()).getValue();
      const ambientScale = this.are.getFieldByLabel('AmbientScale', strt.getFields()).getValue();
      const room = new ModuleRoom(roomName, this);
      room.area = this;
      room.setAmbientScale(ambientScale);
      room.setEnvAudio(envAudio);
      if(strt.hasField('DisableWeather')){
        room.setDisableWeather(!!this.are.getFieldByLabel('DisableWeather', strt.getFields()).getValue());
      }
      this.rooms.push(room);
    }

    this.shadowOpacity = this.are.getFieldByLabel('ShadowOpacity').getValue();

    this.stealthXPEnabled = this.are.getFieldByLabel('StealthXPEnabled').getValue();
    this.stealthXPLoss = this.are.getFieldByLabel('StealthXPLoss').getValue();
    this.stealthXPMax = this.are.getFieldByLabel('StealthXPMax').getValue();

    this.sun.ambientColor = this.are.getFieldByLabel('SunAmbientColor').getValue();
    this.sun.diffuseColor = this.are.getFieldByLabel('SunDiffuseColor').getValue();
    this.sun.fogColor = this.are.getFieldByLabel('SunFogColor').getValue();
    this.sun.fogFar = this.are.getFieldByLabel('SunFogFar').getValue();
    this.sun.fogNear = this.are.getFieldByLabel('SunFogNear').getValue();
    this.sun.fogOn = this.are.getFieldByLabel('SunFogOn').getValue();
    this.sun.shadows = this.are.getFieldByLabel('SunShadows').getValue();
    this.tag = this.are.getFieldByLabel('Tag').getValue();
    this.unescapable = this.are.getFieldByLabel('Unescapable').getValue() ? true : false;
    this.version = this.are.getFieldByLabel('Version').getValue();
    this.windPower = this.are.getFieldByLabel('WindPower').getValue();
    this.applyAreaWind();

    this.fog = undefined;

    if(this.sun.fogOn){
      this.fog = new THREE.Fog(
        this.sun.fogColor,
        this.sun.fogNear,
        this.sun.fogFar
      );
      GameState.scene.fog = this.fog;
    }else{
      GameState.scene.fog = undefined;
    }

    //BEGIN GIT LOAD

    const areaMap = this.git.getFieldByLabel('AreaMap');
    const areaProps = this.git.getFieldByLabel('AreaProperties');
    const areaEffects = this.git.getFieldByLabel('AreaEffectList');
    const cameras = this.git.getFieldByLabel('CameraList');
    const creatures = this.git.getFieldByLabel('Creature List');
    const doors = this.git.getFieldByLabel('Door List');
    const encounters = this.git.getFieldByLabel('Encounter List');
    const groundItems = this.git.getFieldByLabel('List');
    const placeables = this.git.getFieldByLabel('Placeable List');
    const sounds = this.git.getFieldByLabel('SoundList');
    const stores = this.git.getFieldByLabel('StoreList');
    const triggers = this.git.getFieldByLabel('TriggerList');
    const waypoints = this.git.getFieldByLabel('WaypointList');

    const areaPropsField = areaProps.getChildStructs()[0].getFields();
    this.audio.ambient.day = this.git.getFieldByLabel('AmbientSndDay', areaPropsField).getValue();
    this.audio.ambient.dayVolume = this.git.getFieldByLabel('AmbientSndDayVol', areaPropsField).getValue();
    this.audio.ambient.night = this.git.getFieldByLabel('AmbientSndNight', areaPropsField).getValue();
    this.audio.ambient.nightVolume = this.git.getFieldByLabel('AmbientSndNitVol', areaPropsField).getValue();
    if(areaProps.getChildStructs()[0].hasField('EnvAudio')){
      this.audio.environmentAudio = this.git.getFieldByLabel('EnvAudio', areaPropsField).getValue();
    }else{
      this.audio.environmentAudio = -1;
    }
    
    this.audio.music.battle = this.git.getFieldByLabel('MusicBattle', areaPropsField).getValue();
    this.audio.music.day = this.git.getFieldByLabel('MusicDay', areaPropsField).getValue();
    this.audio.music.delay = this.git.getFieldByLabel('MusicDelay', areaPropsField).getValue();
    this.audio.music.night = this.git.getFieldByLabel('MusicNight', areaPropsField).getValue();
    AudioEngine.GetAudioEngine().setAreaAudioProperties(this.audio);

    const areaPropsStruct = areaProps.getChildStructs()[0];
    if(areaPropsStruct.hasField('StealthXPCurrent')){
      this.stealthXP = areaPropsStruct.getFieldByLabel('StealthXPCurrent').getValue() | 0;
    }
    if(areaPropsStruct.hasField('StealthXPLoss')){
      this.stealthXPLoss = areaPropsStruct.getFieldByLabel('StealthXPLoss').getValue() | 0;
    }
    if(areaPropsStruct.hasField('StealthXPEnabled')){
      this.stealthXPEnabled = areaPropsStruct.getFieldByLabel('StealthXPEnabled').getValue() | 0;
    }
    if(areaPropsStruct.hasField('StealthXPMax')){
      this.stealthXPMax = areaPropsStruct.getFieldByLabel('StealthXPMax').getValue() | 0;
    }
    if(areaPropsStruct.hasField('RestrictMode')){
      this.restrictMode = areaPropsStruct.getFieldByLabel('RestrictMode').getValue() | 0;
    }
    if(areaPropsStruct.hasField('Unescapable')){
      this.unescapable = !!areaPropsStruct.getFieldByLabel('Unescapable').getValue();
    }
    if(areaPropsStruct.hasField('SunFogColor')){
      this.sun.fogColor = areaPropsStruct.getFieldByLabel('SunFogColor').getValue();
    }

    //Cameras
    if(cameras){
      for(let i = 0; i < cameras.childStructs.length; i++){
        const strt = cameras.childStructs[i];
        const camera = new ModuleCamera(GFFObject.FromStruct(strt) );
        this.cameras.push(camera);
      }
    }

    //AreaEffects
    if(areaEffects){
      for(let i = 0; i < areaEffects.childStructs.length; i++){
        const strt = areaEffects.childStructs[i];
        this.attachObject( new ModuleAreaOfEffect(GFFObject.FromStruct(strt)) );
      }
    }

    //Creatures
    if(creatures){
      for(let i = 0; i < creatures.childStructs.length; i++){
        const strt = creatures.childStructs[i];
        this.attachObject( new ModuleCreature(GFFObject.FromStruct(strt)) );
      }
    }

    //Ground items (GIT List)
    if(groundItems){
      for(let i = 0; i < groundItems.childStructs.length; i++){
        const strt = groundItems.childStructs[i];
        this.attachObject( new ModuleItem(GFFObject.FromStruct(strt)) );
      }
    }

    //Triggers
    if(triggers){
      for(let i = 0; i < triggers.childStructs.length; i++){
        const strt = triggers.childStructs[i];
        this.attachObject( new ModuleTrigger(GFFObject.FromStruct(strt)) );
      }
    }

    //Encounter
    if(encounters){
      for(let i = 0; i < encounters.childStructs.length; i++){
        const strt = encounters.childStructs[i];
        this.attachObject( new ModuleEncounter(GFFObject.FromStruct(strt)) );
      }
    }

    //Doors
    if(doors){
      for(let i = 0; i < doors.childStructs.length; i++ ){
        const strt = doors.childStructs[i];
        this.attachObject( new ModuleDoor(GFFObject.FromStruct(strt)) );
      }
    }

    //Placeables
    if(placeables){
      for(let i = 0; i < placeables.childStructs.length; i++ ){
        const strt = placeables.childStructs[i];
        this.attachObject( new ModulePlaceable(GFFObject.FromStruct(strt)) );
      }
    }

    //Sounds
    if(sounds){
      for(let i = 0; i < sounds.childStructs.length; i++ ){
        const strt = sounds.childStructs[i];
        this.attachObject( new ModuleSound(GFFObject.FromStruct(strt), AudioEngine.GetAudioEngine()) );
      }
    }

    //Stores
    if(stores){
      for(let i = 0; i < stores.childStructs.length; i++ ){
        const strt = stores.childStructs[i];
        this.attachObject( new ModuleStore(GFFObject.FromStruct(strt)) );
      }
    }

    //Waypoints
    if(waypoints){
      for(let i = 0; i < waypoints.childStructs.length; i++ ){
        const strt = waypoints.childStructs[i];

        if(this.transWP){
          if(typeof this.transWP === 'string'){
            if(this.transWP.toLowerCase() == strt.getFieldByLabel('Tag').getValue().toLowerCase()){
              this.transWP = GFFObject.FromStruct(strt);
            }
          }else if(this.transWP instanceof GFFObject){
            if(this.transWP.getFieldByLabel('Tag').getValue().toLowerCase() == strt.getFieldByLabel('Tag').getValue().toLowerCase()){
              this.transWP = GFFObject.FromStruct(strt);
            }
          }
        }
        
        this.attachObject( new ModuleWaypoint(GFFObject.FromStruct(strt)) );
      }
    }

    //AreaMapData
    if(areaMap){
      const areaMapStruct = areaMap.getChildStructs()[0];
      if(areaMapStruct){
        this.areaMap.loadDataStruct(areaMapStruct);
      }
    }

    if(!(this.transWP instanceof GFFObject)){
      this.transWP = null;
    }

    // Retail GIT weather fields (BYTE) — CurrentWeather type + WeatherStarted active flag.
    // Indoor areas force clear (LoadGIT).
    if(this.git.RootNode.hasField('CurrentWeather')){
      this.weather.currentWeather = this.git.getFieldByLabel('CurrentWeather').getValue();
      this.weather.fromSave = true;
    }
    if(this.git.RootNode.hasField('WeatherStarted')){
      this.weather.started = !!this.git.getFieldByLabel('WeatherStarted').getValue();
      this.weather.fromSave = true;
    }
    if(this.flags & 1){
      this.weather.currentWeather = 0xFF;
      this.weather.started = false;
    }
    if(this.git.RootNode.hasField('TransPending')){
      this.transPending = this.git.getFieldByLabel('TransPending').getValue() | 0;
    }
    if(this.git.RootNode.hasField('TransPendCurrID')){
      this.transPendCurrId = this.git.getFieldByLabel('TransPendCurrID').getValue() | 0;
    }
    if(this.git.RootNode.hasField('TransPendNextID')){
      this.transPendNextId = this.git.getFieldByLabel('TransPendNextID').getValue() | 0;
    }

    // Retail GIT named VarTable
    if(this.git.RootNode.hasField('VarTable')){
      this.loadNamedVarTable(this.git.getFieldByLabel('VarTable'));
    }

    if(this.git.RootNode.hasField('SWVarTable')){
      console.log("SWVarTable", this.git);
      let localBools = this.git.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    GameState.AlphaTest = this.alphaTest;

    // Area default EnvAudio — desired; Render/update applies SetCurrentEnvironment.
    AudioEngine.GetAudioEngine().setDesiredEnvironment(this.audio.environmentAudio);
    AudioEngine.GetAudioEngine().applyDesiredEnvironment();

    FollowerCamera.setCameraStyle(this.getCameraStyle());
    if(this.miniGame){
      FollowerCamera.setCameraFOV(this.miniGame.cameraViewAngle);
    }else{
      FollowerCamera.setCameraFOV(FollowerCamera.DEFAULT_FOV);
    }

    await this.loadVis();
    await this.loadLayout();
    await this.loadScripts();
    GameState.scene.fog = this.fog;

  }

  getCameraStyle(){
    const cameraStyle2DA = GameState.TwoDAManager.datatables.get('camerastyle');
    if(cameraStyle2DA?.rows){
      return cameraStyle2DA.rows[this.cameraStyle] ?? cameraStyle2DA.rows[0] ?? {};
    }
    // Retail SetCameraStyle fallbacks when 2DA missing (dist/speed/pitch/height)
    return {
      distance: 6.25,
      speed: 20,
      pitch: 80,
      height: 3.5,
      viewangle: 55,
    };
  }

  async loadPath(){
    console.log('ModuleArea.loadPath');
    this.path = new ModulePath(this);
    try{
      await this.path.load();
    }catch(e){
      console.error(e);
    }
  }

  async loadVis(){
    console.log('ModuleArea.loadVis');
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes.vis, this.name);
      this.visObject = new VISObject(buffer);
      this.visObject.read();
      return;
    }catch(e){
      this.visObject = new VISObject();
      console.error(e);
    }
    this.visObject.attachArea(this);
  }

  async loadLayout(){
    console.log('ModuleArea.loadLayout');
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes.lyt, this.name);
      this.layout = new LYTObject(buffer);

      //Resort the rooms based on the LYT file because it matches the walkmesh transition index numbers
      let sortedRooms = [];
      for(let i = 0; i < this.layout.rooms.length; i++){
        let roomLYT = this.layout.rooms[i];
        if(!roomLYT.name || roomLYT.name == '****'){
          continue;
        }
        for(let r = 0; r != this.rooms.length; r++ ){
          let room = this.rooms[r];
          if(room.roomName.toLowerCase() == roomLYT.name.toLowerCase()){
            room.position.copy(roomLYT.position);
            sortedRooms.push(room);
          }
        }
      }

      this.rooms = sortedRooms;

      for(let i = 0; i < this.layout.doorhooks.length; i++){
        let _doorHook = this.layout.doorhooks[i];
        this.doorhooks.push(_doorHook);
      }

      if(this.miniGame){
        for(let i = 0; i < this.layout.tracks.length; i++){
          this.miniGame.tracks.push(new ModuleMGTrack(this.layout.tracks[i]));
        }
  
        for(let i = 0; i < this.layout.obstacles.length; i++){
          const layoutObs = this.layout.obstacles[i];
          const name = ModuleMiniGame.normalizeMgoName(layoutObs?.name);
          // Retail: LYT places by Name/pos; ARE Name → GetMiniGameObjectByName → Load(Scripts).
          const template = name ? this.miniGame.getMiniGameObjectByName(name) : undefined;
          const obstacle = new ModuleMGObstacle(template, layoutObs);
          if(template){
            // Retail CSWMGObstacle::Load @ 0066d0b0 — Scripts then OnCreate (OnCreate in initMiniGameObjects).
            obstacle.loadScripts();
          }
          this.miniGame.obstacles.push(obstacle);
        }
      }
    }catch(e){
      console.error(e);
      this.layout = new LYTObject();
    }
  }

  /**
   * Retail CSWCArea::RestartMiniGame @ 00605e50 (cheat `restartminigame`) —
   * new MiniGame, re-add tracks/obstacles from layout, Load, destroy old, Go.
   */
  async restartMiniGame(): Promise<ModuleMiniGame | undefined> {
    if(!this.are?.RootNode?.hasField?.('MiniGame')){ return undefined; }
    if(!this.layout){ return undefined; }

    const old = this.miniGame;
    const next = new ModuleMiniGame(
      this.are.getFieldByLabel('MiniGame').getChildStructs()[0]
    );

    for(let i = 0; i < this.layout.tracks.length; i++){
      next.tracks.push(new ModuleMGTrack(this.layout.tracks[i]));
    }
    for(let i = 0; i < this.layout.obstacles.length; i++){
      const layoutObs = this.layout.obstacles[i];
      const name = ModuleMiniGame.normalizeMgoName(layoutObs?.name);
      const template = name ? next.getMiniGameObjectByName(name) : undefined;
      const obstacle = new ModuleMGObstacle(template, layoutObs);
      if(template){
        obstacle.loadScripts();
      }
      next.obstacles.push(obstacle);
    }

    try{
      await next.load();
    }catch(e){
      console.error('ModuleArea.restartMiniGame: Load failed', e);
      next.dispose();
      return undefined;
    }

    old?.dispose();
    this.miniGame = next;
    next.initMiniGameObjects();
    return next;
  }

  cleanupUninitializedObjects(){

    let i = this.creatures.length
    while (i--) {
      if (!(this.creatures[i] instanceof ModuleCreature) || !this.creatures[i].initialized) { 
        this.creatures.splice(i, 1);
      } 
    }

    i = this.placeables.length
    while (i--) {
      if (!(this.placeables[i] instanceof ModulePlaceable) || !this.placeables[i].initialized) { 
        this.placeables.splice(i, 1);
      } 
    }

    i = this.doors.length
    while (i--) {
      if (!(this.doors[i] instanceof ModuleDoor) || !this.doors[i].initialized) { 
        this.doors.splice(i, 1);
      } 
    }

    i = this.sounds.length
    while (i--) {
      if (!(this.sounds[i] instanceof ModuleSound) || !this.sounds[i].initialized) { 
        this.sounds.splice(i, 1);
      } 
    }

    i = this.waypoints.length
    while (i--) {
      if (!(this.waypoints[i] instanceof ModuleWaypoint) || !this.waypoints[i].initialized) { 
        this.waypoints.splice(i, 1);
      } 
    }

    i = this.triggers.length
    while (i--) {
      if (!(this.triggers[i] instanceof ModuleTrigger) || !this.triggers[i].initialized) { 
        this.triggers.splice(i, 1);
      } 
    }

    i = this.stores.length
    while (i--) {
      if (!(this.stores[i] instanceof ModuleStore) || !this.stores[i].initialized) { 
        this.stores.splice(i, 1);
      } 
    }

  }

  async loadScene(){
    try{
      try{
        GameState.MenuManager.InGameOverlay.miniMap.setAreaMap(this.areaMap);
        GameState.MenuManager.InGameOverlay.SetMapTexture('lbl_map'+this.name);
        GameState.MenuManager.MenuMap.miniMap.setAreaMap(this.areaMap);
        GameState.MenuManager.MenuMap.SetMapTexture('lbl_map'+this.name);
      }catch(e){
        console.error(e);
      }

      // Retail Scene ctor loads dirtytex* before room models bind dirt overlays.
      try { await DirtyTextureManager.loadForArea(this); } catch(e){ console.error(e); }

      try { await this.loadRooms(); } catch(e){ console.error(e); }

      await this.loadPath();

      this.roomWalkmeshes = this.rooms.filter( (r) => { return r?.model?.wok}).map( (r) => { return r.model.wok; });

      GameState.MenuManager.LoadScreen.setProgress(10);
      
      try { await this.loadPlayer(); } catch(e){ console.error(e); }

      try { await this.loadCameras(); } catch(e){ console.error(e); }

      try { await this.loadPlaceables(); } catch(e){ console.error(e); }

      GameState.MenuManager.LoadScreen.setProgress(20);

      try { await this.loadWaypoints(); } catch(e){ console.error(e); }

      GameState.MenuManager.LoadScreen.setProgress(30);

      try { await this.loadAreaEffects(); } catch(e){ console.error(e); }
      try { await this.loadCreatures(); } catch(e){ console.error(e); }
      try { await this.loadParty(); } catch(e){ console.error(e); }

      GameState.MenuManager.LoadScreen.setProgress(40);

      try { await this.loadsounds(); } catch(e){ console.error(e); }

      GameState.MenuManager.LoadScreen.setProgress(50);

      try { await this.loadTriggers(); } catch(e){ console.error(e); }

      try { await this.loadEncounters(); } catch(e){ console.error(e); }

      GameState.MenuManager.LoadScreen.setProgress(60);

      if(this.miniGame){
        try {
          await this.miniGame.load();
        }catch(e){
          console.error(e);
          // Retail type-2 Load aborts on missing Camera — do not continue half-loaded MG.
          throw e;
        }
      }

      GameState.MenuManager.LoadScreen.setProgress(70);

      try { await this.loadDoors(); } catch(e){ console.error(e); }

      this.doorWalkmeshes = this.doors.filter( (d) => { return d?.collisionManager?.walkmesh}).map( (d) => { return d.collisionManager.walkmesh; });

      try { await this.loadStores(); } catch(e){ console.error(e); }

      GameState.MenuManager.LoadScreen.setProgress(80);

      GameState.MenuManager.LoadScreen.setProgress(90);

      try{
        await this.loadAreaMusic();
      }catch(e){
        console.error(e);
      }

      GameState.MenuManager.LoadScreen.setProgress(100);

      // Minigame loads intentionally leave party empty (see loadPlayer); skip facing sync.
      const facingSource = GameState.PartyManager.party[0] ?? GameState.PartyManager.Player;
      if(facingSource){
        FollowerCamera.facing = Utility.NormalizeRadian(facingSource.getFacing() - Math.PI/2);
      }

      try { await this.weather.load(); } catch(e){ console.error(e); }

      this.transWP = null;

      this.cleanupUninitializedObjects();
      this.detectRoomObjects();

      // Retail IncreaseAILevelPriority when players occupy the area
      this.playersInArea = GameState.PartyManager?.party?.length || 0;
      if(this.playersInArea > 0){
        const aiObjects = [
          ...this.creatures,
          ...this.doors,
          ...this.placeables,
          ...this.triggers,
          ...this.encounters,
          ...this.areaOfEffects,
          ...(GameState.PartyManager?.party || []),
        ];
        GameState.ServerAIMaster?.increaseAILevelPriority?.(aiObjects);
        // Party / PC always VERY_HIGH
        for(let i = 0; i < (GameState.PartyManager?.party?.length || 0); i++){
          const pm = GameState.PartyManager.party[i];
          if(pm) GameState.ServerAIMaster?.setAILevel?.(pm, AILevel.VERY_HIGH);
        }
      }

      if(GameState.group.grass){
        GameState.group.grass.visible = !!GameState.iniConfig.getProperty('Graphics Options.Grass');
      }
    }catch(e){
      console.error(e);
    }
  }

  getSpawnLocation(): EngineLocation {
    if(GameState.pendingJumpSpawn){
      const s = GameState.pendingJumpSpawn;
      GameState.pendingJumpSpawn = undefined;
      return new EngineLocation(s.x, s.y, s.z, s.ox, s.oy, 0);
    }
    if(GameState.isLoadingSave){
      return new EngineLocation(
        GameState.PartyManager.PlayerTemplate.RootNode.getFieldByLabel('XPosition').getValue(),
        GameState.PartyManager.PlayerTemplate.RootNode.getFieldByLabel('YPosition').getValue(),
        GameState.PartyManager.PlayerTemplate.RootNode.getFieldByLabel('ZPosition').getValue(),
        GameState.PartyManager.PlayerTemplate.RootNode.getFieldByLabel('XOrientation').getValue(),
        GameState.PartyManager.PlayerTemplate.RootNode.getFieldByLabel('YOrientation').getValue(),
        0
      );
    }else if(this.transWP instanceof GFFObject){
      console.log('TransWP', this.transWP);
      return new EngineLocation(
        this.transWP.RootNode.getFieldByLabel('XPosition').getValue(),
        this.transWP.RootNode.getFieldByLabel('YPosition').getValue(),
        this.transWP.RootNode.getFieldByLabel('ZPosition').getValue(),
        this.transWP.RootNode.getFieldByLabel('XOrientation').getValue(),
        this.transWP.RootNode.getFieldByLabel('YOrientation').getValue(),
        0
      );
    }else{
      console.log('No TransWP');
      return new EngineLocation(
        this.module.entryX,
        this.module.entryY,
        this.module.entryZ,
        this.module.entryDirectionX,
        this.module.entryDirectionY,
        0
      );
    }
  }

  getPlayerTemplate(): GFFObject {
    if(GameState.PartyManager.PlayerTemplate){
      const tpl = GameState.PartyManager.PlayerTemplate;
      const savedId = tpl.RootNode.hasField('ObjectId')
        ? tpl.getFieldByLabel('ObjectId').getValue()
        : 0;
      // Do not overwrite a saved ObjectId — mid-combat CombatRound refs depend on it.
      if(!savedId || savedId === ModuleObjectConstant.OBJECT_INVALID){
        tpl.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(
          GameState.ModuleObjectManager.GetNextPlayerId()
        );
      }
      return tpl;
    }else{
      return GameState.PartyManager.GeneratePlayerTemplate();
    }
  }

  attachObject(object: ModuleObject){
    if(!object) return;
    object.area = this;

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      // Leaving limbo when attached to an area (retail AddToArea counterpart)
      if(GameState.module?.isObjectInLimbo(object as ModuleCreature)){
        GameState.module.removeObjectFromLimbo(object as ModuleCreature);
      }
      if(this.creatures.indexOf(object as ModuleCreature) >= 0) return;
      this.creatures.push(object as ModuleCreature);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
      if(this.placeables.indexOf(object as ModulePlaceable) >= 0) return;
      this.placeables.push(object as ModulePlaceable);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
      if(this.doors.indexOf(object as ModuleDoor) >= 0) return;
      this.doors.push(object as ModuleDoor);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
      if(this.triggers.indexOf(object as ModuleTrigger) >= 0) return;
      this.triggers.push(object as ModuleTrigger);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleEncounter)){
      if(this.encounters.indexOf(object as ModuleEncounter) >= 0) return;
      this.encounters.push(object as ModuleEncounter);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleStore)){
      if(this.stores.indexOf(object as ModuleStore) >= 0) return;
      this.stores.push(object as ModuleStore);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleWaypoint)){
      if(this.waypoints.indexOf(object as ModuleWaypoint) >= 0) return;
      this.waypoints.push(object as ModuleWaypoint);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleSound)){
      if(this.sounds.indexOf(object as ModuleSound) >= 0) return;
      this.sounds.push(object as ModuleSound);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleAreaOfEffect)){
      if(this.areaOfEffects.indexOf(object as ModuleAreaOfEffect) >= 0) return;
      this.areaOfEffects.push(object as ModuleAreaOfEffect);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleRoom)){
      if(this.rooms.indexOf(object as ModuleRoom) >= 0) return;
      this.rooms.push(object as ModuleRoom);
    }

    // Retail AddToArea: promote VERY_LOW → LOW while players occupy the area
    if(this.playersInArea > 0 && object.aiLevel === AILevel.VERY_LOW){
      if(GameState.ServerAIMaster?.shouldPromoteOnAreaEntry?.(object)){
        GameState.ServerAIMaster.setAILevel(object, AILevel.LOW);
      }
    }
  }

  detachObject(object: ModuleObject){
    if(!object) return;

    object.area = undefined;

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      const idx = this.creatures.indexOf(object as ModuleCreature);
      if(idx >= 0){
        this.creatures.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
      const idx = this.placeables.indexOf(object as ModulePlaceable);
      if(idx >= 0){
        this.placeables.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
      const idx = this.doors.indexOf(object as ModuleDoor);
      if(idx >= 0){
        this.doors.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
      const idx = this.triggers.indexOf(object as ModuleTrigger);
      if(idx >= 0){
        this.triggers.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleEncounter)){
      const idx = this.encounters.indexOf(object as ModuleEncounter);
      if(idx >= 0){
        this.encounters.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleStore)){
      const idx = this.stores.indexOf(object as ModuleStore);
      if(idx >= 0){
        this.stores.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleWaypoint)){
      const idx = this.waypoints.indexOf(object as ModuleWaypoint);
      if(idx >= 0){
        this.waypoints.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleSound)){
      const idx = this.sounds.indexOf(object as ModuleSound);
      if(idx >= 0){
        this.sounds.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleAreaOfEffect)){
      const idx = this.areaOfEffects.indexOf(object as ModuleAreaOfEffect);
      if(idx >= 0){
        this.areaOfEffects.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleItem)){
      const idx = this.items.indexOf(object as ModuleItem);
      if(idx >= 0){
        this.items.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleRoom)){
      const idx = this.rooms.indexOf(object as ModuleRoom);
      if(idx >= 0){
        this.rooms.splice(idx, 1);
      }
    }else{
      console.warn(`destroyObject: unhandled objectType, ${object.objectType}`);
    }
  }

  async loadPlayer(): Promise<void> {
    console.log('Loading Player', GameState.PartyManager.Player)
    try{
      if(GameState.PartyManager.Player instanceof ModuleCreature){
        GameState.PartyManager.Player.npcId = -1;

        if(!this.miniGame){
          GameState.PartyManager.party[ GameState.PartyManager.GetCreatureStartingPartyIndex(GameState.currentLeader) ] = GameState.currentLeader;
          GameState.group.party.add( GameState.PartyManager.Player.container );
        }

        // Reset actions between modules; preserve mid-combat ActionList on save load.
        if(!GameState.isLoadingSave){
          GameState.PartyManager.Player.clearAllActions();
        }
        GameState.PartyManager.Player.force = 0;
        GameState.PartyManager.Player.collisionManager.groundFace = undefined;
        GameState.PartyManager.Player.collisionManager.lastGroundFace = undefined;
        GameState.PartyManager.Player.load();
        try{
          const model = await GameState.PartyManager.Player.loadModel();
          GameState.PartyManager.Player.model = model;
          GameState.PartyManager.Player.model.hasCollision = true;
          //let spawnLoc = this.getSpawnLocation();
          let spawnLoc = GameState.PartyManager.GetSpawnLocation(GameState.PartyManager.Player);
          GameState.PartyManager.Player.position.copy(spawnLoc.position);
          GameState.PartyManager.Player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);

          GameState.PartyManager.Player.getCurrentRoom();
          // GameState.PartyManager.Player.computeBoundingBox(true);
        }catch(e){
          console.error(e);
        }
      }else{
        let player = new ModulePlayer( this.getPlayerTemplate() );
        player.npcId = -1;
        
        player.load();
        // GameState.currentLeader = player;
        GameState.PartyManager.Player = player;
      
        if(!this.miniGame){
          GameState.PartyManager.party[ GameState.PartyManager.GetCreatureStartingPartyIndex(player) ] = player;
          GameState.group.party.add( player.container );
        }

        try{
          const model = await player.loadModel();
          model.userData.moduleObject = player;
          model.hasCollision = true;

          let spawnLoc = GameState.PartyManager.GetSpawnLocation(player);

          player.position.copy(spawnLoc.position);
          player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);

          player.getCurrentRoom();
          player.computeBoundingBox(true);
        }catch(e){
          console.error(e);
        }
      }
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Load the active party members
   */
  async loadParty(): Promise<void> {
    console.log('Loading Party Member');
    for(let i = 0; i < GameState.PartyManager.CurrentMembers.length; i++){
      await GameState.PartyManager.LoadPartyMember(i);
    }
    GameState.PartyManager.ApplyControlledNPC();
    // Retail PositionParty → ResetAllFollowData after placing the party.
    GameState.PartyManager.resetFollowPath(GameState.PartyManager.party[0]);
    // CombatRound fromStruct may run before partners are registered — re-resolve now.
    this.resolveCombatRoundObjectReferences();
  }

  /**
   * Deferred CombatRound object-ID resolve (PerceptionList pattern).
   * Call after loadCreatures + loadParty so GetObjectById can find duel partners.
   */
  resolveCombatRoundObjectReferences(){
    const creatures = [
      ...(this.creatures || []),
      ...(GameState.PartyManager?.party || []),
    ];
    const player = GameState.PartyManager?.Player;
    if(player && creatures.indexOf(player) < 0){
      creatures.push(player);
    }
    for(let i = 0; i < creatures.length; i++){
      const creature = creatures[i];
      if(!creature){
        continue;
      }
      creature.resolveEffectObjectReferences?.();
      if(!creature.combatRound){
        continue;
      }
      creature.combatRound.resolveObjectReferences();
      // Mid-combat load may have ActionCombat WAITING-spliced before save;
      // ensure a dispatcher exists while the round is still started.
      if(
        creature.combatRound.roundStarted &&
        !creature.actionQueue?.actionTypeExists?.(ActionType.ActionCombat)
      ){
        creature.actionQueue?.add?.(
          new GameState.ActionFactory.ActionCombat(0xFFFF)
        );
      }
      creature.combatRound.recoverEmptyOrInvalidScheduleAfterLoad();
    }
  }

  /**
   * Load the area's static cameras
   */
  async loadCameras(){
    console.log('Loading Cameras');
    for(let i = 0; i < this.cameras.length; i++){
      const camera = this.cameras[i];
      camera.load();
      GameState.staticCameras.push(camera.perspectiveCamera);
    }
  }

  /**
   * Load the area's rooms
   */
  async loadRooms(): Promise<void> {
    console.log('Loading Rooms');
    this.walkEdges = [];
    this.walkFaces = [];
    
    for(let i = 0; i < this.rooms.length; i++){
      const room = this.rooms[i];
      const model = await room.loadModel();
      if(model instanceof OdysseyModel3D){
        if(room.collisionManager.walkmesh instanceof OdysseyWalkMesh){
          GameState.walkmeshList.push( room.collisionManager.walkmesh.mesh );
          GameState.group.room_walkmeshes.add( room.collisionManager.walkmesh.mesh );
        }

        if(typeof model.walkmesh != 'undefined'){
          GameState.collisionList.push(model.walkmesh);
        }

        if(typeof model.wok != 'undefined'){
          this.walkEdges = [...this.walkEdges, ...model.wok.edges.values()];
          this.walkFaces = [...this.walkFaces, ...model.wok.walkableFaces];
        }
        
        model.name = room.roomName;
        GameState.group.rooms.add(room.container);

        room.computeBoundingBox();
        room.model.updateMatrix();
      }
    }

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
        if(room2 instanceof ModuleRoom){
          const room1_room_links = this.visObject.getRoom(room1.roomName)?.rooms || [];
          const room2_room_links = this.visObject.getRoom(room2.roomName)?.rooms || [];
          const room2_links_to_room1 = room2_room_links.indexOf(room1.roomName) >= 0;
          const room1_links_to_room2 = room1_room_links.indexOf(room2.roomName) >= 0;

          const should_link = room2_links_to_room1 || room1_links_to_room2;
          //console.log('room', room1.roomName, room2.roomName, should_link);
          if(should_link && !room1.linkedRooms.has(room2.roomName)){
            room1.addLinkedRoom(room2);
          }

          if(should_link && !room2.linkedRooms.has(room1.roomName)){
            room2.addLinkedRoom(room1);
          }
        }
      }
      this.walkmesh_rooms = [room1].concat(Array.from(room1.linkedRooms.values()));
    }
  }

  /**
   * Load the area's doors
   */
  async loadDoors(): Promise<void> {
    console.log('Loading Doors');
    for(let i = 0; i < this.doors.length; i++){
      const door = this.doors[i];
      try{
        door.load();
        // door.position.x = door.getX();
        // door.position.y = door.getY();
        // door.position.z = door.getZ();
        door.rotation.set(0, 0, door.getBearing());
        door.facing = door.getBearing();
        const model = await door.loadModel();
        door.computeBoundingBox();
        const dwk = await door.loadWalkmesh(model.name);

        try{
          model.userData.walkmesh = dwk;
        }catch(e){
          console.error('Failed to add dwk', model.name, dwk, e);
        }

        if(door.model instanceof OdysseyModel3D){
          door.box.setFromObject(door.model);
        }

        if(door.openState){
          door.model.playAnimation('opened1', true);
        }
        door.getCurrentRoom();
        GameState.group.doors.add( door.container );
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's placeables
   */
  async loadPlaceables(): Promise<void> {
    console.log('Loading Placeables');
    for(let i = 0; i < this.placeables.length; i++){
      const plc = this.placeables[i];
      plc.load();
      plc.position.set(plc.getX(), plc.getY(), plc.getZ());
      plc.rotation.set(0, 0, plc.getBearing());
      const model = await plc.loadModel();
      GameState.group.placeables.add( plc.container );
      const pwk = await plc.loadWalkmesh(model.name);
      GameState.walkmeshList.push( pwk.mesh );
      plc.computeBoundingBox();

      if(pwk.mesh instanceof THREE.Object3D){
        pwk.mat4.makeRotationFromEuler(plc.rotation);
        pwk.mat4.setPosition( plc.position.x, plc.position.y, plc.position.z + .01 );
        pwk.mesh.geometry.applyMatrix4(pwk.mat4);
        pwk.updateMatrix();
        pwk.buildEdgeNormalHelpers();
        //pwk.mesh.position.copy(plc.position);
        GameState.group.room_walkmeshes.add( pwk.mesh );
      }

      plc.getCurrentRoom();
      plc.position.set(plc.getX(), plc.getY(), plc.getZ());
      plc.computeBoundingBox();
    }
  }

  /**
   * Load the area's waypoints
   */
  async loadWaypoints(): Promise<void> {
    console.log('Loading Waypoints');
    for(let i = 0; i < this.waypoints.length; i++){
      const waypnt = this.waypoints[i];
      waypnt.load();
      const wpObj = new THREE.Object3D();
      wpObj.name = waypnt.getTag();
      wpObj.position.copy(waypnt.position);
      wpObj.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()));
      waypnt.rotation.z = Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()) + Math.PI/2;
      GameState.group.waypoints.add(wpObj);

      let _distance = 1000000000;
      let _currentRoom = null;
      let roomCenter = new THREE.Vector3();
      for(let i = 0; i < GameState.group.rooms.children.length; i++){
        let room = GameState.group.rooms.children[i];
        if(room instanceof OdysseyModel3D){
          if(room.box.containsPoint(wpObj.position)){
            room.box.getCenter(roomCenter);
            let distance = wpObj.position.distanceTo(roomCenter);
            if(distance < _distance){
              _distance = distance;
              _currentRoom = room;
            }
          }
        }
      }
      wpObj.userData.area = _currentRoom;
      this.areaMap.addMapNote(waypnt);
    }
  }

  /**
   * Load the area's encounters
   */
  async loadEncounters(): Promise<void> {
    console.log('Loading Encounters');
    for(let i = 0; i < this.encounters.length; i++){
      const encounter = this.encounters[i];
      try{
        encounter.load();
        let _distance = 1000000000;
        let _currentRoom = null;
        let roomCenter = new THREE.Vector3();
        for(let i = 0; i < GameState.group.rooms.children.length; i++){
          let room = GameState.group.rooms.children[i];
          if(room instanceof OdysseyModel3D){
            if(room.box.containsPoint(encounter.mesh.position)){
              room.box.getCenter(roomCenter);
              let distance = encounter.mesh.position.distanceTo(roomCenter);
              if(distance < _distance){
                _distance = distance;
                _currentRoom = room;
              }
            }
          }
        }
        encounter.mesh.userData.area = _currentRoom;
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's Area of Effects
   */
  async loadAreaEffects(): Promise<void> {
    console.log('Loading AreaEffects');
    for(let i = 0; i < this.areaOfEffects.length; i++){
      try{
        const aoe = this.areaOfEffects[i];
        aoe.load();
        GameState.group.effects.add( aoe.container );
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's triggers
   */
  async loadTriggers(): Promise<void> {
    console.log('Loading Triggers');
    for(let i = 0; i < this.triggers.length; i++){
      try{
        const trig = this.triggers[i];
        trig.load();
        let _distance = 1000000000;
        let _currentRoom = null;
        let roomCenter = new THREE.Vector3();
        for(let i = 0; i < GameState.group.rooms.children.length; i++){
          let room = GameState.group.rooms.children[i];
          if(room instanceof OdysseyModel3D){
            if(room.box.containsPoint(trig.mesh.position)){
              room.box.getCenter(roomCenter);
              let distance = trig.mesh.position.distanceTo(roomCenter);
              if(distance < _distance){
                _distance = distance;
                _currentRoom = room;
              }
            }
          }
        }
        trig.mesh.userData.area = _currentRoom;
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's creatures
   */
  async loadCreatures(): Promise<void> {
    console.log('Loading Creatures');
    for(let i = 0; i < this.creatures.length; i++){
      try{
        const creature = this.creatures[i];
        creature.load();
        const model = await creature.loadModel();
        creature.model.userData.moduleObject = creature;
        
        //creature.setFacing(Math.atan2(creature.getXOrientation(), creature.getYOrientation()) + Math.PI/2, true);
        creature.setFacing(-Math.atan2(creature.getXOrientation(), creature.getYOrientation()), true);

        model.hasCollision = true;
        model.name = creature.getTag();
        GameState.group.creatures.add( creature.container );

        creature.getCurrentRoom();
        creature.updateCollision(0.0000000000000000000001);
        creature.update(0.0000000000000000000001);
        creature.computeBoundingBox();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's stores
   */
  async loadStores(): Promise<void> {
    console.log('Loading Stores');
    for(let i = 0; i < this.stores.length; i++){
      try{
        const store = this.stores[i];
        store.load();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's sounds
   */
  async loadsounds(): Promise<void> {
    console.log('Loading Sound Emitter');
    for(let i = 0; i < this.sounds.length; i++){
      try{
        const sound = this.sounds[i];
        sound.load();
        await sound.loadSound();
      }catch(e){
        console.error(e);
      }
    }
  }

  /**
   * Load the area's background music
   */
  async loadAreaMusic(): Promise<void> {
    const audioEngine = AudioEngine.GetAudioEngine();
    await this.musicBackgroundDaySet(this.audio.music.day);
    await this.musicBackgroundNightSet(this.audio.music.night);
    await this.musicBattleSet(this.audio.music.battle);
    await this.ambientSoundDaySet(this.audio.ambient.day);
    await this.ambientSoundNightSet(this.audio.ambient.night);
  }

  /**
   * Load the area's scripts
   */
  async loadScripts(){
    console.log('ModuleArea.loadScripts');
    for(let [key, resRef] of this.scriptResRefs){
      const script = GameState.NWScript.Load(resRef);
      if(!script){ continue; }
      script.caller = this;
      this.scripts[key as any] = script;
    }
  }

  async initAreaObjects(runSpawnScripts = false){
    for(let i = 0; i < this.doors.length; i++){
      if(this.doors[i] instanceof ModuleObject){
        this.doors[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.placeables.length; i++){
      if(this.placeables[i] instanceof ModuleObject){
        this.placeables[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.triggers.length; i++){
      if(this.triggers[i] instanceof ModuleObject){
        this.triggers[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.waypoints.length; i++){
      if(this.waypoints[i] instanceof ModuleObject){
        this.waypoints[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.creatures.length; i++){
      if(this.creatures[i] instanceof ModuleObject){
        this.creatures[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      if(GameState.PartyManager.party[i] instanceof ModuleObject){
        GameState.PartyManager.party[i].onSpawn(runSpawnScripts);
      }
    }

    if(this.miniGame){
      this.miniGame.initMiniGameObjects();
    }

    this.runStartScripts();
  }

  runOnEnterScripts(){
    const nwscript = this.scripts[ModuleObjectScript.AreaOnEnter];
    if(!nwscript){ return; }
    nwscript.enteringObject = GameState.PartyManager.party[0];
    nwscript.run(this, 0);
  }

  async runStartScripts(){
    if(this.miniGame) this.miniGame.runMiniGameScripts();
    this.runOnEnterScripts();
  }

  detectRoomObjects(){
    for(let i = 0, len = this.rooms.length; i < len; i++){
      this.rooms[i].detectChildObjects();
    }
  }

  /**
   * Determines the distance score from the edge of all walkable faces
   * A low score means that the point is near a walkmesh perimiter
   * A high scror means that the point is further away from all walkmesh pemimiters
   * @param point point to examine
   * @returns 
   */
  scorePointEdgeDistance(point: THREE.Vector3){
    let distance = Infinity;
    const tmpTarget = new THREE.Vector3();
    for(let i = 0, len = this.walkEdges.length; i < len; i++){
      const edge = this.walkEdges[i];
      edge.line.closestPointToPoint(point, true, tmpTarget);
      const d = tmpTarget.distanceTo(point);
      distance = (d < distance) ? d : distance;
    }
    return distance;
  }

  isPointWalkable(point: THREE.Vector3){
    for(let i = 0, len = this.walkFaces.length; i < len; i++){
      if(this.walkFaces[i].pointInFace2d(point)){
        return true;
      }
    }
    return false;
  }

  getNearestWalkablePoint(point: THREE.Vector3, safeDistance = 1.5){
    let nearest = Infinity;
    let nearest_point = point.clone();
    let distance = 0;
    const tmpPoint = new THREE.Vector3();

    const tmp1 = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const inwardDirection = new THREE.Vector3();
    // const dir = new THREE.Vector3();
    // const isOOB = this.isPointWalkable(point);
    for(let i = 0, len = this.walkFaces.length; i < len; i++){
      const f = this.walkFaces[i];
      f.triangle.closestPointToPoint(point, tmpPoint);

      // Calculate the normal of the triangle
      const edge1 = tmp1.subVectors(f.triangle.b, f.triangle.a);
      const edge2 = tmp2.subVectors(f.triangle.c, f.triangle.a);
      const normal = tmpN.crossVectors(edge1, edge2).normalize();

      // Determine the inward direction
      inwardDirection.set(0, 0, 0);
      if (f.adjacent[0] == -1 && f.pointIsOnEdge(tmpPoint, 'a')) {
        inwardDirection.add(new THREE.Vector3().crossVectors(normal, edge1).normalize());
        tmpPoint.add(inwardDirection.multiplyScalar(safeDistance));
      } else if (f.adjacent[1] == -1 && f.pointIsOnEdge(tmpPoint, 'b')) {
        inwardDirection.add(new THREE.Vector3().crossVectors(normal, new THREE.Vector3().subVectors(f.triangle.c, f.triangle.b)).normalize());
        tmpPoint.add(inwardDirection.multiplyScalar(safeDistance));
      } else if (f.adjacent[2] == -1 && f.pointIsOnEdge(tmpPoint, 'c')) {
        inwardDirection.add(new THREE.Vector3().crossVectors(normal, new THREE.Vector3().subVectors(f.triangle.a, f.triangle.c)).normalize());
        tmpPoint.add(inwardDirection.multiplyScalar(safeDistance));
      }

      distance = point.distanceTo(tmpPoint);
      if(distance >= nearest)
        continue;
      
      nearest_point.copy(tmpPoint);//this.walkableFaces[i].centroid;
      nearest = distance;
    }

    // const repellingForce = new THREE.Vector3();
    // const safeDistance = 1;

    // const closestPoint = new THREE.Vector3();
    // this.walkEdges.forEach(edge => {
    //   const line = edge.line;
    //   line.closestPointToPoint(nearest_point, true, closestPoint);

    //   const distance = nearest_point.distanceTo(closestPoint);

    //   if (distance < safeDistance) {
    //     // Calculate the repelling vector
    //     const repelDirection = new THREE.Vector3().subVectors(nearest_point, closestPoint).normalize();
    //     const repelStrength = safeDistance - distance;

    //     // Accumulate the repelling force
    //     repellingForce.add(repelDirection.multiplyScalar(repelStrength));
    //   }
    // });

    // // Update the position by applying the accumulated repelling force
    // return nearest_point.add(repellingForce);

    return nearest_point;
  }

  setRestrictMode( restrictMode = 0 ){
    this.restrictMode = restrictMode;
  }

  setStealthXPEnabled( stealthXPEnabled: boolean ){
    this.stealthXPEnabled = stealthXPEnabled ? 1 : 0;
  }

  addStealthXP(){
    this.stealthXP += Math.floor(this.stealthXPLoss/2);
    if(this.stealthXP > this.stealthXPMax){
      this.stealthXP = this.stealthXPMax;
    }
  }

  subtractStealthXP(){
    this.stealthXP -= this.stealthXPLoss;
    if(this.stealthXP < 0){
      this.stealthXP = 0;
    }
  }

  getAreaPropertiesStruct(){
    // Retail SaveProperties @ 00506090 — AreaProperties struct type 100
    let struct = new GFFStruct(100);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndDay') ).setValue(this.audio.ambient.day);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndDayVol') ).setValue(this.audio.ambient.dayVolume);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndNight') ).setValue(this.audio.ambient.night);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndNitVol') ).setValue(this.audio.ambient.nightVolume);
    struct.addField( new GFFField(GFFDataType.INT, 'EnvAudio') ).setValue(this.audio.environmentAudio);
    
    struct.addField( new GFFField(GFFDataType.INT, 'MusicBattle') ).setValue(this.audio.music.battle);
    struct.addField( new GFFField(GFFDataType.INT, 'MusicDay') ).setValue(this.audio.music.day);
    struct.addField( new GFFField(GFFDataType.INT, 'MusicDelay') ).setValue(this.audio.music.delay);
    struct.addField( new GFFField(GFFDataType.INT, 'MusicNight') ).setValue(this.audio.music.night);

    struct.addField( new GFFField(GFFDataType.BYTE, 'RestrictMode') ).setValue(this.restrictMode ? 1 : 0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'StealthXPCurrent') ).setValue(this.stealthXP | 0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'StealthXPEnabled') ).setValue(this.stealthXPEnabled | 0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'StealthXPLoss') ).setValue(this.stealthXPLoss | 0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'StealthXPMax') ).setValue(this.stealthXPMax | 0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'SunFogColor') ).setValue(this.sun?.fogColor | 0);
    
    struct.addField( new GFFField(GFFDataType.BYTE, 'TransPendCurrID') ).setValue(this.transPendCurrId | 0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'TransPendNextID') ).setValue(this.transPendNextId | 0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'TransPending') ).setValue(this.transPending | 0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'Unescapable') ).setValue(this.unescapable);
    return struct;
  }

  saveAreaListStruct(){
    // Retail SaveModuleIFOStart — Mod_Area_list element type 6
    let areaStruct = new GFFStruct(6);
    areaStruct.addField( new GFFField(GFFDataType.RESREF, 'Area_Name') ).setValue(this.name);
    areaStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    //unescapable
    return areaStruct;
  }

  save(): { git: GFFObject, are: GFFObject }{
    const git = new GFFObject();
    git.FileType = 'GIT ';

    const aoeList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'AreaEffectList') );
    for(let i = 0; i < this.areaOfEffects.length; i++){
      aoeList.addChildStruct( this.areaOfEffects[i].save().RootNode );
    }

    const areaMapField = git.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'AreaMap') );
    areaMapField.addChildStruct( this.areaMap.exportData() );

    const areaPropertiesField = git.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'AreaProperties') );
    areaPropertiesField.addChildStruct( this.getAreaPropertiesStruct() );

    const cameraList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'CameraList') );
    for(let i = 0; i < this.cameras.length; i++){
      cameraList.addChildStruct( this.cameras[i].save().RootNode );
    }

    const creatureList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Creature List') );
    for(let i = 0; i < this.creatures.length; i++){
      const creature = this.creatures[i];
      // Retail: KeepCorpse shells / post-0xb visuals are client-only — never serialize
      if(!creature || creature.isRetainedCorpse || creature.serverDestroyed) continue;
      creatureList.addChildStruct( creature.save().RootNode );
    }

    // Retail CSWSArea::SaveGIT — CurrentWeather is BYTE, not LIST
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CurrentWeather') ).setValue(this.weather.currentWeather | 0);

    const doorList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Door List') );
    for(let i = 0; i < this.doors.length; i++){
      doorList.addChildStruct( this.doors[i].save().RootNode );
    }

    const encounterList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Encounter List') );
    for(let i = 0; i < this.encounters.length; i++){
      encounterList.addChildStruct( this.encounters[i].save().RootNode );
    }

    //Area Items List (ground drops)
    const list = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'List') );
    for(let i = 0; i < this.items.length; i++){
      const item = this.items[i];
      if(!item) continue;
      list.addChildStruct( item.save() );
    }

    const placeableList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Placeable List') );
    for(let i = 0; i < this.placeables.length; i++){
      placeableList.addChildStruct( this.placeables[i].save().RootNode );
    }

    //SWVarTable
    const swVarTable = git.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    const soundList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'SoundList') );
    for(let i = 0; i < this.sounds.length; i++){
      soundList.addChildStruct( this.sounds[i].save().RootNode );
    }

    const storeList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'StoreList') );
    for(let i = 0; i < this.stores.length; i++){
      storeList.addChildStruct( this.stores[i].save().RootNode );
    }
    
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TransPendCurrID') ).setValue(this.transPendCurrId | 0);
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TransPendNextID') ).setValue(this.transPendNextId | 0);
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TransPending') ).setValue(this.transPending | 0);

    const triggerList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'TriggerList') );
    for(let i = 0; i < this.triggers.length; i++){
      triggerList.addChildStruct( this.triggers[i].save().RootNode );
    }

    this.writeNamedVarTable(git.RootNode);

    const waypointList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'WaypointList') );
    for(let i = 0; i < this.waypoints.length; i++){
      waypointList.addChildStruct( this.waypoints[i].save().RootNode );
    }
    
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'WeatherStarted') ).setValue(this.weather.started ? 1 : 0);

    this.git = git;

    this.are.FileType = 'ARE ';

    return {git: git, are: this.are};
  }

}
