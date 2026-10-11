import { GameState } from "@engine/runtime/GameState";
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { WindManager } from "@engine/managers/WindManager";
import { DirtyTextureManager } from "@engine/managers/DirtyTextureManager";
import { TextureAnimationManager } from "@engine/managers/TextureAnimationManager";
import { PlaceableLightmapBaker } from "@engine/managers/PlaceableLightmapBaker";
import { GFFObject } from "@core/resource/GFFObject";
import type { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";
import { OdysseyLightingBinder } from "@engine/render/three/odyssey/OdysseyLightingBinder";
import { AreaMap } from "@engine/module/area/AreaMap";
import { AreaWeather } from "@engine/module/area/AreaWeather";
import * as THREE from "three";
import { GFFField } from "@core/resource/GFFField";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFStruct } from "@core/resource/GFFStruct";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScript } from "@engine/nwscript/NWScript";
import { NWScriptEvent } from "@engine/nwscript/events";
import { LYTObject } from "@core/resource/LYTObject";
import EngineLocation from "@engine/runtime/EngineLocation";
import { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import type { StaticBlockerGrid } from "@engine/pathfinding/static-blocker-grid";
import { invalidateStaticBlockerGrid } from "@engine/pathfinding/static-blocker-grid";
import { AudioLoader } from "@engine/audio/AudioLoader";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { CExoLocString } from "@core/resource/CExoLocString";
import { VISObject } from "@core/resource/VISObject";
import { ITextureLoaderQueuedRef } from "@engine/interface/loaders/ITextureLoaderQueuedRef";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { flushWorldMatrices } from "@engine/render/worldMatrix";
// import { MenuManager, TwoDAManager, PartyManager, GameObjectManager } from "@engine/managers";
import { TextureLoader } from "@engine/loaders";
import { IAreaAudioProperties } from "@core/interface/area/IAreaAudioProperties";
import { AudioEngine } from "@engine/audio";
import { AREA_MUSIC_FADE_MS, AMBIENT_SOUND_FADE_MS } from "@engine/audio/AudioEngine";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { ActionType } from "@core/enums/actions/ActionType";
import { AILevel } from "@core/enums/module/AILevel";
import { BitWise } from "@core/utility/BitWise";
import { IAmbientSource } from "@core/interface/area/IAmbientSource";
import { IGrassProperties } from "@core/interface/area/IGrassProperties";
import { IAreaDirtLayer, IAreaDirtProperties } from "@core/interface/area/IAreaDirtProperties";
import { SpellCastInstance } from "@engine/combat/SpellCastInstance";
import { CombatProjectile } from "@engine/combat/combat-projectile";
import { TextSprite3D } from "@engine/render/TextSprite3D";
import { GameObject } from "@engine/module/GameObject";
import { AreaEffect } from "@engine/module/AreaEffect";
import { AreaCamera } from "@engine/module/area/AreaCamera";
import { Creature } from "@engine/module/Creature";
import { Door } from "@engine/module/Door";
import { Encounter } from "@engine/module/Encounter";
import { Item } from "@engine/module/Item";
import { MiniGameEnemy } from "@engine/module/minigame/MiniGameEnemy";
import { MiniGameObstacle } from "@engine/module/minigame/MiniGameObstacle";
import { Waypoint } from "@engine/module/Waypoint";
import { Trigger } from "@engine/module/Trigger";
import { Store } from "@engine/module/Store";
import { Sound } from "@engine/module/Sound";
import { AreaRoom } from "@engine/module/area/AreaRoom";
import { PlayerCharacter } from "@engine/module/PlayerCharacter";
import { Placeable } from "@engine/module/Placeable";
import { AreaPath } from "@engine/module/area/AreaPath";
import { MiniGame } from "@engine/module/minigame/MiniGame";
import { MiniGameTrack } from "@engine/module/minigame/MiniGameTrack";
import { MiniGamePlayer } from "@engine/module/minigame/MiniGamePlayer";
import type { Module } from "@engine/module/Module";
import { IVISRoom } from "@core/interface/module/IVISRoom";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { ModuleDayPhase } from "@core/enums/module/ModuleDayPhase";
import { ModuleCalendar } from "@engine/module/ModuleCalendar";
import { ModuleTimeManager } from "@engine/module/ModuleTimeManager";
import { CorpseCache } from "@engine/module/creature/CorpseCache";
import { GameLoop } from '@engine/runtime/GameLoop';
import { AreaGitSerializer } from "@engine/module/serialization/AreaGitSerializer";
import { AreaMapSerializer } from "@engine/module/serialization/AreaMapSerializer";
import { AreaDataBootstrap } from "@engine/module/area/AreaDataBootstrap";
import { AreaInitPipeline } from "@engine/module/area/AreaInitPipeline";
import { AreaObjectSceneLoader } from "@engine/module/area/AreaObjectSceneLoader";
import { AreaPartyBootstrap } from "@engine/module/area/AreaPartyBootstrap";
import { AreaPostLoadRevealService } from "@engine/module/area/AreaPostLoadRevealService";
import { AreaResourceBootstrap } from "@engine/module/area/AreaResourceBootstrap";
import { AreaSceneBootstrap } from "@engine/module/area/AreaSceneBootstrap";

type AreaScriptKeys = 'OnEnter'|'OnExit'|'OnHeartbeat'|'OnUserDefined';

export const ODYSSEY_LOAD_GIT_OBJECT_ORDER = [
  'creatures',
  'items',
  'doors',
  'triggers',
  'encounters',
  'waypoints',
  'sounds',
  'placeables',
  'stores',
  'areaEffects',
  'properties',
  'maps',
  'cameras',
] as const;

export type OdysseyLoadGitObjectStep = (typeof ODYSSEY_LOAD_GIT_OBJECT_ORDER)[number];

export const ODYSSEY_LOAD_SCENE_OBJECT_ORDER = [
  'creatures',
  'player',
  'party',
  'items',
  'doors',
  'triggers',
  'encounters',
  'waypoints',
  'sounds',
  'placeables',
  'stores',
  'areaEffects',
  'cameras',
] as const;

export type OdysseyLoadSceneObjectStep = (typeof ODYSSEY_LOAD_SCENE_OBJECT_ORDER)[number];

export const ODYSSEY_INIT_AREA_OBJECT_ORDER = [
  'creatures',
  'items',
  'doors',
  'triggers',
  'encounters',
  'waypoints',
  'sounds',
  'placeables',
  'stores',
  'areaEffects',
  'party',
] as const;

export type OdysseyInitAreaObjectStep = (typeof ODYSSEY_INIT_AREA_OBJECT_ORDER)[number];

/**
 * Area class.
 *
 * Class representing an ingame area.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file Area.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Area extends GameObject {

  /** GIT load object sequence. */
  static readonly LOAD_GIT_OBJECT_ORDER = ODYSSEY_LOAD_GIT_OBJECT_ORDER;
  /** loadScene object asset order (rooms/path/music excluded) */
  static readonly LOAD_SCENE_OBJECT_ORDER = ODYSSEY_LOAD_SCENE_OBJECT_ORDER;
  /** initAreaObjects iteration order */
  static readonly INIT_AREA_OBJECT_ORDER = ODYSSEY_INIT_AREA_OBJECT_ORDER;

  static GameObject: typeof GameObject = GameObject;
  static AreaEffect: typeof AreaEffect = AreaEffect;
  static AreaCamera: typeof AreaCamera = AreaCamera;
  static Creature: typeof Creature = Creature;
  static Door: typeof Door = Door;
  static Encounter: typeof Encounter = Encounter;
  static Item: typeof Item = Item;
  static MiniGameEnemy: typeof MiniGameEnemy = MiniGameEnemy;
  static MiniGameObstacle: typeof MiniGameObstacle = MiniGameObstacle;
  static MiniGamePlayer: typeof MiniGamePlayer = MiniGamePlayer;
  static MiniGameTrack: typeof MiniGameTrack = MiniGameTrack;
  static MiniGame: typeof MiniGame = MiniGame;
  static AreaPath: typeof AreaPath = AreaPath;
  static Placeable: typeof Placeable = Placeable;
  static PlayerCharacter: typeof PlayerCharacter = PlayerCharacter;
  static AreaRoom: typeof AreaRoom = AreaRoom;
  static Sound: typeof Sound = Sound;
  static Store: typeof Store = Store;
  static Trigger: typeof Trigger = Trigger;
  static Waypoint: typeof Waypoint = Waypoint;

  module: Module;
  are: GFFObject;
  git: GFFObject;
  transWP: string|GFFObject;
  weather: AreaWeather = new AreaWeather(this);
  fog: THREE.Fog;
  path: AreaPath;
  visObject: VISObject;
  layout: LYTObject;
  areaMap: AreaMap;
  /** Elapsed ms since last area OnHeartbeat (5999ms). */
  _areaHeartbeatElapsedMs: number = 0;
  _areaHeartbeatInitialized: boolean = false;
  frameLosCache: Map<string, boolean> = new Map();
  /** Frame-local memo for getWalkCandidatesForBox (cleared each AIScheduler tick).
   * Raw faces (all overlapping) + optional edges; filters applied on copy-out. */
  frameWalkCandidateCache: Map<string, {
    faces: OdysseyFace3[];
    edges: WalkmeshEdge[];
    rooms: AreaRoom[];
    edgesPopulated: boolean;
  }> = new Map();
  /** XY cell hash for door/placeable static-blocker queries (see static-blocker-grid). */
  staticBlockerGrid?: StaticBlockerGrid;
  staticBlockerGridDirty: boolean = true;
  /** Players currently in this area — drives Increase/DecreaseAILevelPriority. */
  playersInArea: number = 0;
  /** ARE template `ID` header (LoadAreaHeader header_info[0]) — not the game ObjectId */
  areId: number = 0;
  /** GIT TransPending / TransPendCurrID / TransPendNextID */
  transPending: number = 0;
  transPendCurrId: number = 0;
  transPendNextId: number = 0;

  /**
   * GetNextTransitionPendingID — bump allocator, skip 0.
   */
  getNextTransitionPendingId(): number {
    this.transPendNextId = ((this.transPendNextId | 0) + 1) & 0xFF;
    if(this.transPendNextId === 0){
      this.transPendNextId = 1;
    }
    return this.transPendNextId;
  }

  /**
   * SetTransitionPending — door/trigger module-link handshake.
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
   * — visit mark during CountAreaTransitionTriggers.
   * Set when a transition into this area is chosen so only one portal per dest is used.
   */
  interAreaVisitMark: number = 0;

  cameras: AreaCamera[] = [];
  creatures: Creature[] = [];
  /** KeepCorpse shell cache (max 3). */
  corpseCache: CorpseCache = new CorpseCache();
  doorhooks: any[] = [];
  doors: Door[] = [];
  encounters: Encounter[] = [];
  items: Item[] = [];
  placeables: Placeable[] = [];
  sounds: Sound[] = [];
  stores: Store[] = [];
  triggers: Trigger[] = [];
  waypoints: Waypoint[] = [];
  areaOfEffects: AreaEffect[] = [];
  /**
   * game_objects — X-sorted for GetNearestObject spiral
   * (GetFirstObjectIndiceByX / ExecuteCommandGetNearestObject).
   */
  gameObjects: GameObject[] = [];
  /** When true, gameObjects must be rebuilt before nearest queries. */
  gameObjectsDirty: boolean = true;
  miniGame: MiniGame;
  walkmesh_rooms: AreaRoom[] = [];
  /** Reused list for updateRoomAnimatedLights (creatures/placeables/doors/…). */
  private _lightingDynamicsScratch: Array<{ model?: unknown; position?: THREE.Vector3 }> = [];
  /** Accrue delta; bindArea runs at ~30Hz. Seeded so the first call binds immediately. */
  private _lightingBindAccum = 1 / 30;
  private static readonly LIGHTING_BIND_INTERVAL = 1 / 30;
  private _walkCandidateFaceScratch: OdysseyFace3[] = [];
  private _walkCandidateEdgeScratch: WalkmeshEdge[] = [];

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
   * UpdateDayNightCycle / SetAsDay|Night|Dawn|Dusk.
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
   * 0x0001: INTERIOR (exterior if unset)
   * 0x0002: UNDERGROUND (aboveground if unset)
   * 0x0004: NATURAL (urban if unset)
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
   * Formula values are stored after 0↔1 swap.
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
   * Runtime lighting night flag (`area.is_night`). Distinct from authored ARE `IsNight`.
   */
  lightingIsNight = false;

  /** dawn-transition flag. */
  dayNightDawnActive = false;

  /** dusk-transition flag. */
  dayNightDuskActive = false;

  /** pending midpoint audio/lighting flip during dawn/dusk. */
  dayNightHalfwayPending = false;

  /** Last module day phase applied via SetTimeOfDayState. */
  appliedDayPhase: ModuleDayPhase | 0 = 0;

  /** Whether area BGM/ambient currently use day tracks. */
  audioUsesDayTracks = true;

  /** `shadowAlpha` for this area's day/night cycle (0–1). */
  shadowAlpha = 0;

  /** `beamingProjectionAlpha` during dawn/dusk (0–0.05). */
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
    this.objectType |= GameObjectType.Area;
    this.name = resRef;
    this.are = are;
    this.git = git;
    this.transWP = '';
  }

  dispose(){
    this.areaMap.dispose();
    this.corpseCache.clear();

    // FadeAndStopDialogAmbientTrack — 500ms on UnloadArea.
    void AudioEngine.GetAudioEngine().fadeStopDialogAmbientTrack();

    if(this.miniGame){
      this.miniGame.dispose();
      // Dedicated MG stream stopped — resume area BGM if buffers are loaded.
      const audio = AudioEngine.GetAudioEngine();
      if(audio.areaMusicLoaded || audio.areaMusicNightLoaded){
        this.musicBackgroundPlay();
      }
    }

    //clear area room objects (AreaRoom is not a GameObject — destroy does not detach)
    while (this.rooms.length){
      const room = this.rooms.shift();
      room?.destroy();
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
   * AIUpdate — weather re-roll + OnHeartbeat every 5999ms.
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
      const onHeartbeat = this.scripts[ScriptHook.AreaOnHeartbeat];
      if(onHeartbeat){
        try{
          onHeartbeat.run(this as any, 0);
        }catch(e){
          console.error('Area.aiUpdate OnHeartbeat', e);
        }
      }
    }
  }

  /**
   * Every-frame object/visual pass. Budgeted AI is driven by Module.aiScheduler.
   */
  update(delta: number = 0){
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

    const runtime = getDefaultRuntimeContext();
    const party = runtime.getParty?.() ?? [];
    for(let i = 0; i < party.length; i++){
      party[i]?.update(delta);
    }

    for(let i = 0; i < this.creatures.length; i++){
      this.creatures[i]?.update(delta);
    }

    for(let i = 0; i < this.placeables.length; i++){
      this.placeables[i]?.update(delta);
    }

    //unset party controlled
    for(let i = 0; i < party.length; i++){
      const pm = party[i];
      if(pm) pm.controlled = false;
    }

    if(runtime.getMode() == EngineMode.MINIGAME){
      this.miniGame.tick(delta);
    }

    //update rooms
    for(let i = 0; i < this.rooms.length; i++){
      this.rooms[i]?.update(delta);
      // this.rooms[i].hide;
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

    // Camera before room VIS/frustum so cull uses this frame's chase pose
    // (avoids one-frame neighbor pop-in after load / turns).
    FollowerCamera.update(delta, this);
    // Rebuild viewportFrustum before object isOnScreen (same pose as room cull).
    GameLoop.updateViewportFrustum();
    // Scene matrixWorldAutoUpdate is off — flush dirty roots before isOnScreen.
    flushWorldMatrices();
    this.updateRoomVisibility(delta);
    this.applyRoomRenderFrustumCull();
    // Same-frame object cull after room VIS (avoids one-frame blank props/doors)
    this.syncObjectModelVisibility();

    this.weather.update(delta);

    if(this.path){
      this.path.update(delta);
    }

    this.updateDayNightCycle();
    this.updateMusic(delta);
  }

  /** @deprecated Use update */
  clientUpdate(delta: number = 0){
    this.update(delta);
  }

  updatePaused(delta: number = 0){
    // Visual pass while paused; TimeStop exclusions already got aiUpdate via aiScheduler
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

    const runtime = getDefaultRuntimeContext();
    const party = runtime.getParty?.() ?? [];
    for(let i = 0; i < party.length; i++){
      const pm = party[i];
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

    if(runtime.getMode() == EngineMode.MINIGAME){
      this.miniGame.tickPaused(delta);
    }

    FollowerCamera.update(delta, this);
    GameLoop.updateViewportFrustum();
    flushWorldMatrices();
    this.updateRoomVisibility(delta);
    this.applyRoomRenderFrustumCull();
    this.syncObjectModelVisibility();

    this.updateDayNightCycle();
    this.updateMusic(delta);
  }

  /**
   * UpdateDayNightCycle + SetTimeOfDayState.
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

    // UpdateDayNightCycle refreshes sound-object hour/phase gates every frame.
    this.updateSoundObjectsTimeOfDay();
  }

  /**
   * UpdateDayNightCycle shadowAlpha during dawn/dusk:
   * before midpoint → opacity*0.01*(1 - t/0.5);
   * after midpoint → opacity*0.01*(t/0.5 - 1).
   */
  updateTransitionShadowAlpha(progress: number, half = 0.5){
    this.shadowAlpha = Area.computeTransitionShadowAlpha(
      this.shadowOpacity,
      progress,
      this.dayNightHalfwayPending,
      half
    );
  }

  /** Pure shadowAlpha curve for dawn/dusk (unit-tested). */
  static computeTransitionShadowAlpha(shadowOpacity: number, progress: number, beforeHalfway: boolean, half = 0.5){
    return ModuleTimeManager.computeTransitionShadowAlpha(shadowOpacity, progress, beforeHalfway, half);
  }

  /**
   * SetTimeOfDayState.
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

  /** SetAsDay. */
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

  /** SetAsNight. */
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

  /** SetAsDawn. */
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

  /** SetAsDusk. */
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
   * ForceBrightSunAndMoon.
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
   * Apply sun/moon directional ambient + diffuse (+ fog/clear).
   * Scene light-model ambient stays ARE DynAmbientColor (see applyDynAmbient).
   * sunAmbient → directional ambient channel; diffuse → OdysseyLightingBinder sunColor.
   * Colors are applied directly — no invented intensity curves (UpdateDayNightCycle).
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
    // SunShadows / MoonShadows still publish GameState.areaShadowsEnabled for
    // lighting/docs. Primary shadow-map selection no longer excludes module MDL
    // key lights (radius >= 100) when this flag is false — those lights are
    // authored in the room model (e.g. m02ac auroralight01). ShadowOpacity
    // still drives point-light / projection darkness via shadowAlpha.
    GameState.areaShadowsEnabled = this.lightingIsNight ? !!this.moon.shadows : !!this.sun.shadows;
    GameState.shadowAlpha = this.shadowAlpha;
    GameState.beamingProjectionAlpha = this.beamingProjectionAlpha;

    // Keep DynAmbient as scene ambient (LoadArea → SetAmbient).
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
    // Sun/ambient are baked into placeable lightmaps — rebake when they change.
    // PlaceableLightmapBaker.invalidateArea(this);

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
   * LoadArea → SetAmbient(DynAmbientColor).
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
   * LoadAreaHeader swaps DirtyFormula 0↔1 before storage.
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
   * SetBeaming — apply beamingProjectionAlpha to beaming meshes
   * (additive blend color alpha during dawn/dusk).
   */
  updateBeamingMaterials(){
    const alpha = this.beamingProjectionAlpha;
    const applyBeaming = (materials: THREE.Material[]) => {
      for(let j = 0, jl = materials.length; j < jl; j++){
        const material = materials[j];
        if(!material?.userData?.beaming){ continue; }
        if(material instanceof THREE.ShaderMaterial && material.uniforms?.opacity){
          material.uniforms.opacity.value = alpha;
        }else{
          material.opacity = alpha;
        }
        material.visible = alpha > 0;
        material.transparent = true;
      }
    };
    const rooms = this.rooms;
    for(let i = 0, il = rooms.length; i < il; i++){
      const room = rooms[i];
      if(!room.model || !(room.model instanceof OdysseyModel3D)){ continue; }
      applyBeaming(room.model.materials);
    }
    const objectLists = [
      this.creatures,
      this.placeables,
      this.doors,
      GameState.PartyManager?.party,
    ];
    for(let oi = 0; oi < objectLists.length; oi++){
      const list = objectLists[oi];
      if(!list?.length){ continue; }
      for(let gi = 0; gi < list.length; gi++){
        const obj = list[gi];
        if(obj?.model instanceof OdysseyModel3D){
          applyBeaming(obj.model.materials);
        }
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
   * (UpdateTimeOfDay phase grouping).
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
   * Lightmap baker runs every frame; material bindArea is throttled to ~30Hz.
   */
  updateRoomAnimatedLights(delta: number = 0){
    PlaceableLightmapBaker.tickIdle(delta, GameState.lightManager);
    PlaceableLightmapBaker.flushDirty(GameState.lightManager);

    this._lightingBindAccum += delta > 0 ? delta : 0;
    if(this._lightingBindAccum < Area.LIGHTING_BIND_INTERVAL){
      return;
    }
    this._lightingBindAccum -= Area.LIGHTING_BIND_INTERVAL;
    // After a hitch, do not catch up with a bind storm.
    if(this._lightingBindAccum > Area.LIGHTING_BIND_INTERVAL){
      this._lightingBindAccum = 0;
    }

    const lm = GameState.lightManager;
    const camera = GameState.currentCamera;
    // RenderOnlyGobs walks Scene.objects — creatures, placeables, doors, items,
    // party members, and other model-bearing gobs that receive nearest light selection.
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
   * PlayBattleMusic.
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
        // SetMusicDayTrack: if playing & different file → PlayMusic(0) then PlayMusic(1).
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
      // ReadInfo loads Stinger1–3; PlayStinger picks randomly among non-empty
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

  lastRoom: AreaRoom = undefined;

  /** GetRoomIndex vertical half-extent (CheckAABBWalkable z±1000). */
  static readonly ROOM_PROBE_HALF_HEIGHT = 1000;

  /**
   * GetRoomIndex(pos, 0): vertical segment (x,y,z±1000) vs room AABB.
   * Prefers walkmesh AABB when present (CheckAABBWalkable); else room.box.
   * Dialog cameras often sit above the walkmesh.
   */
  getRoomAtPosition(pos: THREE.Vector3): AreaRoom | undefined {
    if(!pos){ return undefined; }
    const zMin = pos.z - Area.ROOM_PROBE_HALF_HEIGHT;
    const zMax = pos.z + Area.ROOM_PROBE_HALF_HEIGHT;
    for(let i = 0, roomCount = this.rooms.length; i < roomCount; i++){
      const room = this.rooms[i];
      if(!room){ continue; }
      const box = room.collisionManager?.walkmesh?.box ?? room.box;
      if(!box){ continue; }
      if(
        pos.x >= box.min.x && pos.x <= box.max.x &&
        pos.y >= box.min.y && pos.y <= box.max.y &&
        box.max.z >= zMin && box.min.z <= zMax
      ){
        return room;
      }
    }
    return undefined;
  }

  updateRoomVisibility(delta: number = 0){
    switch(GameState.Mode){
      case EngineMode.DIALOG: {
        // MainLoop: while dialog, UpdateRoom uses
        // GetDialogCameraPosition — SetCurrentRoom + VIS links, not frustum OR.
        const cam = GameState.currentCamera;
        if(!cam){ return; }
        const cameraRoom = this.getRoomAtPosition(cam.position);
        if(this.lastRoom && this.lastRoom == cameraRoom){
          return;
        }
        // : invalid room index returns early without clearing prior visibility
        if(!cameraRoom){
          return;
        }

        this.lastRoom = cameraRoom;

        if(cameraRoom.envAudio >= 0){
          AudioEngine.GetAudioEngine().setDesiredEnvironment(cameraRoom.envAudio || 0);
        }
        if(Number.isFinite(cameraRoom.ambientScale)){
          AudioEngine.GetAudioEngine().setDesiredAmbientScale(cameraRoom.ambientScale);
        }

        for(let i = 0, roomCount = this.rooms.length; i < roomCount; i++){
          this.rooms[i].hide();
        }
        cameraRoom.show(true);
      break;
      }
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
        const player = GameState.PartyManager.getCurrentPlayer();
        if(!player){ return; }

        // UpdateRoom(pos) → GetRoomIndex: resolve room from position when unset
        if(!player.room){
          player.getCurrentRoom();
        }

        //Check to see if the player has moved to a new room
        if(this.lastRoom && this.lastRoom == player.room){
          return;
        }

        // : invalid room index returns early without clearing prior visibility
        if(!player.room){
          return;
        }

        this.lastRoom = player.room;

        // UpdateRoom — SetDesiredEnvironment + SetDesiredAmbientScale.
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

        //Show the current room and all of it's linked rooms
        player.room.show(true);
      break;
    }
  }

  /**
   * Render-only cull for VIS-linked rooms that miss the view frustum.
   * Keeps VIS show/hide (audio / gameplay) via userData.visActive; only
   * toggles model/grass draw visibility. Player room always stays drawn.
   */
  applyRoomRenderFrustumCull(): void {
    const cam = GameState.currentCamera;
    if(!cam){ return; }

    // Caller (Area.update / prime) runs GameLoop.updateViewportFrustum()
    // immediately before this — camera matrixWorld is already current.
    const persp = cam as THREE.PerspectiveCamera;
    if(typeof persp.updateProjectionMatrix === 'function'){
      persp.updateProjectionMatrix();
    }

    Area._frustumProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    Area._viewFrustum.setFromProjectionMatrix(Area._frustumProj);

    const playerRoom = GameState.PartyManager.getCurrentPlayer()?.room;
    const pad = 4;

    for(let i = 0, len = this.rooms.length; i < len; i++){
      const room = this.rooms[i];
      const model = room?.model;
      if(!model){ continue; }
      if(!model.userData.visActive){
        model.visible = false;
        GameState.grassManager?.setRoomVisible(room, false);
        continue;
      }
      if(room === playerRoom){
        model.visible = true;
        GameState.grassManager?.setRoomVisible(room, true);
        continue;
      }

      // Prefer room.box; else walkmesh world AABB. Never use local model.box
      // (placeholder near origin) as a world frustum test.
      const wokBox = room.collisionManager?.walkmesh?.box;
      const box = (room.box && !room.box.isEmpty()) ? room.box
        : (wokBox && !wokBox.isEmpty()) ? wokBox
        : undefined;
      if(!box){
        model.visible = true;
        GameState.grassManager?.setRoomVisible(room, true);
        continue;
      }

      Area._frustumBox.copy(box);
      Area._frustumBox.min.x -= pad;
      Area._frustumBox.min.y -= pad;
      Area._frustumBox.min.z -= pad;
      Area._frustumBox.max.x += pad;
      Area._frustumBox.max.y += pad;
      Area._frustumBox.max.z += pad;

      const onScreen = Area._viewFrustum.intersectsBox(Area._frustumBox);
      model.visible = onScreen;
      GameState.grassManager?.setRoomVisible(room, onScreen);
    }
  }

  private static readonly _viewFrustum = new THREE.Frustum();
  private static readonly _frustumProj = new THREE.Matrix4();
  private static readonly _frustumBox = new THREE.Box3();

  /**
   * Snap chase camera + apply room VIS/frustum before the load UI hides so the
   * first renderable world frame matches the settled chase pose (no neighbor pop-in).
   */
  primePostLoadReveal(): void {
    AreaPostLoadRevealService.prime(this);
  }

  /**
   * Re-sync object model visibility to current room VIS (visActive).
   * Call after updateRoomVisibility so same-frame props/doors match room cull.
   */
  syncObjectModelVisibility(){
    for(let i = 0; i < this.doors.length; i++){
      this.doors[i]?.updateModelVisibility?.();
    }
    for(let i = 0; i < this.placeables.length; i++){
      this.placeables[i]?.updateModelVisibility?.();
    }
    for(let i = 0; i < this.creatures.length; i++){
      this.creatures[i]?.updateModelVisibility?.();
    }
    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      GameState.PartyManager.party[i]?.updateModelVisibility?.();
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
      //room.LoadModel;
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
    //BEGIN AREA LOAD — ARE → GIT → VIS/LYT/scripts (see AreaDataBootstrap).
    await AreaDataBootstrap.load(this);
  }

  getCameraStyle(){
    const cameraStyle2DA = GameState.TwoDAManager.datatables.get('camerastyle');
    if(cameraStyle2DA?.rows){
      return cameraStyle2DA.rows[this.cameraStyle] ?? cameraStyle2DA.rows[0] ?? {};
    }
    // SetCameraStyle fallbacks when 2DA missing (dist/speed/pitch/height)
    return {
      distance: 6.25,
      speed: 20,
      pitch: 80,
      height: 3.5,
      viewangle: 55,
    };
  }

  async loadPath(){
    console.log('Area.loadPath');
    this.path = new AreaPath(this);
    try{
      await this.path.load();
    }catch(e){
      console.error(e);
    }
  }

  async loadVis(){
    return AreaResourceBootstrap.loadVis(this);
  }

  async loadLayout(){
    return AreaResourceBootstrap.loadLayout(this);
  }

  /**
   * RestartMiniGame (cheat `restartminigame`)
   * new MiniGame, re-add tracks/obstacles from layout, Load, destroy old, Go.
   */
  async restartMiniGame(): Promise<MiniGame | undefined> {
    if(!this.are?.RootNode?.hasField?.('MiniGame')){ return undefined; }
    if(!this.layout){ return undefined; }

    const old = this.miniGame;
    const next = new MiniGame(
      this.are.getFieldByLabel('MiniGame').getChildStructs()[0]
    );

    for(let i = 0; i < this.layout.tracks.length; i++){
      next.tracks.push(new MiniGameTrack(this.layout.tracks[i]));
    }
    for(let i = 0; i < this.layout.obstacles.length; i++){
      const layoutObs = this.layout.obstacles[i];
      const name = MiniGame.normalizeMgoName(layoutObs?.name);
      const template = name ? next.getMiniGameObjectByName(name) : undefined;
      const obstacle = new MiniGameObstacle(template, layoutObs);
      if(template){
        obstacle.loadScripts();
      }
      next.obstacles.push(obstacle);
    }

    try{
      await next.load();
    }catch(e){
      console.error('Area.restartMiniGame: Load failed', e);
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
      if (!(this.creatures[i] instanceof Creature) || !this.creatures[i].initialized) {
        this.creatures.splice(i, 1);
      }
    }

    i = this.placeables.length
    while (i--) {
      if (!(this.placeables[i] instanceof Placeable) || !this.placeables[i].initialized) {
        this.placeables.splice(i, 1);
      }
    }

    i = this.doors.length
    while (i--) {
      if (!(this.doors[i] instanceof Door) || !this.doors[i].initialized) {
        this.doors.splice(i, 1);
      }
    }

    i = this.sounds.length
    while (i--) {
      if (!(this.sounds[i] instanceof Sound) || !this.sounds[i].initialized) {
        this.sounds.splice(i, 1);
      }
    }

    i = this.waypoints.length
    while (i--) {
      if (!(this.waypoints[i] instanceof Waypoint) || !this.waypoints[i].initialized) {
        this.waypoints.splice(i, 1);
      }
    }

    i = this.triggers.length
    while (i--) {
      if (!(this.triggers[i] instanceof Trigger) || !this.triggers[i].initialized) {
        this.triggers.splice(i, 1);
      }
    }

    i = this.stores.length
    while (i--) {
      if (!(this.stores[i] instanceof Store) || !this.stores[i].initialized) {
        this.stores.splice(i, 1);
      }
    }

    i = this.items.length
    while (i--) {
      if (!(this.items[i] instanceof Item) || !this.items[i].initialized) {
        this.items.splice(i, 1);
      }
    }

  }

  async loadScene(){
    return AreaSceneBootstrap.run(this);
  }

  getSpawnLocation(): EngineLocation {
    return AreaPartyBootstrap.getSpawnLocation(this);
  }

  getPlayerTemplate(): GFFObject {
    if(GameState.PartyManager.PlayerTemplate){
      const tpl = GameState.PartyManager.PlayerTemplate;
      const savedId = tpl.RootNode.hasField('ObjectId')
        ? tpl.getFieldByLabel('ObjectId').getValue()
        : 0;
      // Do not overwrite a saved ObjectId — mid-combat CombatRound refs depend on it.
      if(!savedId || savedId === GameObjectConstant.OBJECT_INVALID){
        tpl.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(
          GameState.GameObjectManager.GetNextPlayerId()
        );
      }
      return tpl;
    }else{
      return GameState.PartyManager.GeneratePlayerTemplate();
    }
  }

  /**
   * Set object.area without list membership.
   * Party members live in PartyManager.party, not area.creatures.
   */
  assignArea(object: GameObject){
    if(!object) return;
    if(object.area && object.area !== this){
      object.area.detachObject(object);
    }
    object.area = this;
  }

  attachObject(object: GameObject){
    if(!object) return;
    object.area = this;

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
      // Leaving limbo when attached to an area (AddToArea counterpart)
      if(GameState.module?.isObjectInLimbo(object as Creature)){
        GameState.module.removeObjectFromLimbo(object as Creature);
      }
      if(this.creatures.indexOf(object as Creature) >= 0) return;
      this.creatures.push(object as Creature);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Item)){
      if(this.items.indexOf(object as Item) >= 0) return;
      this.items.push(object as Item);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Placeable)){
      if(this.placeables.indexOf(object as Placeable) >= 0) return;
      this.placeables.push(object as Placeable);
      invalidateStaticBlockerGrid(this);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Door)){
      if(this.doors.indexOf(object as Door) >= 0) return;
      this.doors.push(object as Door);
      invalidateStaticBlockerGrid(this);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Trigger)){
      if(this.triggers.indexOf(object as Trigger) >= 0) return;
      this.triggers.push(object as Trigger);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Encounter)){
      if(this.encounters.indexOf(object as Encounter) >= 0) return;
      this.encounters.push(object as Encounter);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Store)){
      if(this.stores.indexOf(object as Store) >= 0) return;
      this.stores.push(object as Store);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Waypoint)){
      if(this.waypoints.indexOf(object as Waypoint) >= 0) return;
      this.waypoints.push(object as Waypoint);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Sound)){
      if(this.sounds.indexOf(object as Sound) >= 0) return;
      this.sounds.push(object as Sound);
    }

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.AreaEffect)){
      if(this.areaOfEffects.indexOf(object as AreaEffect) >= 0) return;
      this.areaOfEffects.push(object as AreaEffect);
    }

    // AddToArea: promote VERY_LOW → LOW while players occupy the area
    if(this.playersInArea > 0 && object.aiLevel === AILevel.VERY_LOW){
      if(GameState.module.aiScheduler.shouldPromoteOnAreaEntry(object)){
        GameState.module.aiScheduler.setAILevel(object, AILevel.LOW);
      }
    }

    this.gameObjectsDirty = true;
  }

  detachObject(object: GameObject){
    if(!object) return;

    object.area = undefined;

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
      const idx = this.creatures.indexOf(object as Creature);
      if(idx >= 0){
        this.creatures.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Placeable)){
      const idx = this.placeables.indexOf(object as Placeable);
      if(idx >= 0){
        this.placeables.splice(idx, 1);
        invalidateStaticBlockerGrid(this);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Door)){
      const idx = this.doors.indexOf(object as Door);
      if(idx >= 0){
        this.doors.splice(idx, 1);
        invalidateStaticBlockerGrid(this);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Trigger)){
      const idx = this.triggers.indexOf(object as Trigger);
      if(idx >= 0){
        this.triggers.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Encounter)){
      const idx = this.encounters.indexOf(object as Encounter);
      if(idx >= 0){
        this.encounters.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Store)){
      const idx = this.stores.indexOf(object as Store);
      if(idx >= 0){
        this.stores.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Waypoint)){
      const idx = this.waypoints.indexOf(object as Waypoint);
      if(idx >= 0){
        this.waypoints.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Sound)){
      const idx = this.sounds.indexOf(object as Sound);
      if(idx >= 0){
        this.sounds.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.AreaEffect)){
      const idx = this.areaOfEffects.indexOf(object as AreaEffect);
      if(idx >= 0){
        this.areaOfEffects.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, GameObjectType.Item)){
      const idx = this.items.indexOf(object as Item);
      if(idx >= 0){
        this.items.splice(idx, 1);
      }
    }else{
      console.warn(`destroyObject: unhandled objectType, ${object.objectType}`);
    }

    this.gameObjectsDirty = true;
  }

  /**
   * Rebuild game_objects sorted by position.x for nearest spiral scans.
   * Includes party members in the active area (deduped by id).
   */
  ensureGameObjectsSorted(): void {
    // Always rebuild so live X positions stay correct after movement.
    const seen = new Set<number>();
    const list: GameObject[] = [];
    const add = (arr: GameObject[] | undefined) => {
      if(!arr) return;
      for(let i = 0; i < arr.length; i++){
        const obj = arr[i];
        if(!obj) continue;
        const id = obj.id | 0;
        if(id && seen.has(id)) continue;
        if(id) seen.add(id);
        list.push(obj);
      }
    };
    add(this.creatures);
    add(GameState.PartyManager?.party as GameObject[]);
    add(this.items);
    add(this.doors);
    add(this.triggers);
    add(this.encounters);
    add(this.waypoints);
    add(this.sounds);
    add(this.placeables);
    add(this.stores);
    add(this.areaOfEffects);
    list.sort((a, b) => {
      const dx = a.position.x - b.position.x;
      if(dx !== 0) return dx;
      return (a.id | 0) - (b.id | 0);
    });
    this.gameObjects = list;
    this.gameObjectsDirty = false;
  }

  /**
   * GetFirstObjectIndiceByX — lower_bound on position.x.
   */
  getFirstObjectIndexByX(x: number): number {
    this.ensureGameObjectsSorted();
    const table = this.gameObjects;
    let lo = 0;
    let hi = table.length;
    while(lo < hi){
      const mid = (lo + hi) >> 1;
      if(table[mid].position.x < x){
        lo = mid + 1;
      }else{
        hi = mid;
      }
    }
    return lo;
  }

  async loadPlayer(): Promise<void> {
    return AreaPartyBootstrap.loadPlayer(this);
  }

  /**
   * Load the active party members.
   * Minigame areas leave party empty (see loadPlayer) — companions would otherwise
   * land at PortraitOrder indices with party[0] unset, which breaks GetObjectByTag.
   */
  async loadParty(): Promise<void> {
    return AreaPartyBootstrap.loadParty(this);
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
    return AreaObjectSceneLoader.loadCameras(this);
  }

  /**
   * Load the area's rooms
   */
  async loadRooms(): Promise<void> {
    return AreaObjectSceneLoader.loadRooms(this);
  }

  /**
   * Load the area's doors
   */
  async loadDoors(): Promise<void> {
    return AreaObjectSceneLoader.loadDoors(this);
  }

  /**
   * Load the area's placeables
   */
  async loadPlaceables(): Promise<void> {
    return AreaObjectSceneLoader.loadPlaceables(this);
  }

  /**
   * Load the area's waypoints
   */
  async loadWaypoints(): Promise<void> {
    return AreaObjectSceneLoader.loadWaypoints(this);
  }

  /**
   * Load the area's encounters
   */
  async loadEncounters(): Promise<void> {
    return AreaObjectSceneLoader.loadEncounters(this);
  }

  /**
   * Load the area's Area of Effects
   */
  async loadAreaEffects(): Promise<void> {
    return AreaObjectSceneLoader.loadAreaEffects(this);
  }

  /**
   * Load the area's triggers
   */
  async loadTriggers(): Promise<void> {
    return AreaObjectSceneLoader.loadTriggers(this);
  }

  /**
   * Load the area's creatures
   */
  async loadCreatures(): Promise<void> {
    return AreaObjectSceneLoader.loadCreatures(this);
  }

  /**
   * Load ground items (GIT List) — LoadItems / AddToArea after creatures.
   * Scene placement matches ActionDropItem (model under placeables group).
   */
  async loadItems(): Promise<void> {
    return AreaObjectSceneLoader.loadItems(this);
  }

  /**
   * Load the area's stores
   */
  async loadStores(): Promise<void> {
    return AreaObjectSceneLoader.loadStores(this);
  }

  /**
   * Load the area's sounds
   */
  async loadsounds(): Promise<void> {
    return AreaObjectSceneLoader.loadsounds(this);
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
    return AreaResourceBootstrap.loadScripts(this);
  }

  /**
   * Post-load OnSpawn pass — iterate types in GIT load order.
   * Only creatures (and party) currently run spawn scripts; other types call
   * onSpawn for init side-effects without inventing non- script slots.
   */
  async initAreaObjects(runSpawnScripts = false){
    return AreaInitPipeline.initAreaObjects(this, runSpawnScripts);
  }

  runOnEnterScripts(){
    const nwscript = this.scripts[ScriptHook.AreaOnEnter];
    if(!nwscript){ return; }
    nwscript.enteringObject = GameState.PartyManager.party[0];
    nwscript.run(this, 0);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.AreaOnUserDefined]);
  }

  async runStartScripts(){
    return AreaInitPipeline.runStartScripts(this);
  }

  detectRoomObjects(){
    for(let i = 0, len = this.rooms.length; i < len; i++){
      this.rooms[i].detectChildObjects();
    }
  }

  /** Collect room walkmesh faces and edges whose local AABBs overlap `box`. */
  getWalkCandidatesForBox(
    box: THREE.Box3,
    out: { faces?: OdysseyFace3[]; edges?: WalkmeshEdge[]; rooms?: AreaRoom[] } = {},
    opts: { edges?: boolean; walkFacesOnly?: boolean } = {}
  ): { faces: OdysseyFace3[]; edges: WalkmeshEdge[]; rooms: AreaRoom[] } {
    const includeEdges = opts.edges !== false;
    const walkFacesOnly = opts.walkFacesOnly !== false;
    const faces = out.faces || [];
    const edges = out.edges || [];
    const rooms = out.rooms || [];
    faces.length = 0;
    edges.length = 0;
    rooms.length = 0;

    // Geometric key only — walk/edge filters applied when copying out so
    // face-only then full queries share one face-tree descent.
    // Quantize to mm as integers (cheaper than toFixed string formatting).
    const q = (v: number) => (v * 1000 + (v >= 0 ? 0.5 : -0.5)) | 0;
    const cacheKey =
      q(box.min.x) + "|" + q(box.min.y) + "|" + q(box.min.z) + "|" +
      q(box.max.x) + "|" + q(box.max.y) + "|" + q(box.max.z);
    let cached = this.frameWalkCandidateCache.get(cacheKey);

    if(!cached){
      const rawFaces: OdysseyFace3[] = [];
      const rawRooms: AreaRoom[] = [];
      const faceScratch = this._walkCandidateFaceScratch;
      for(let i = 0, len = this.rooms.length; i < len; i++){
        const room = this.rooms[i];
        const wok = room?.collisionManager?.walkmesh;
        if(!wok?.faces?.length) continue;

        // Cull by walkmesh AABB (not VIS room.box — model boxes are often
        // tighter than walkable mesh, e.g. m02ac_02b strip y=75..78.75).
        const cullBox = (wok.box && !wok.box.isEmpty()) ? wok.box
          : (room.box && !room.box.isEmpty()) ? room.box
          : undefined;
        if(cullBox && !cullBox.intersectsBox(box) && !cullBox.containsBox(box)){
          continue;
        }

        wok.getFacesInBox(box, faceScratch);
        if(faceScratch.length){
          rawRooms.push(room);
          for(let f = 0, fl = faceScratch.length; f < fl; f++){
            const face = faceScratch[f];
            if(face) rawFaces.push(face);
          }
        }
      }
      cached = {
        faces: rawFaces,
        edges: [],
        rooms: rawRooms,
        edgesPopulated: false,
      };
      this.frameWalkCandidateCache.set(cacheKey, cached);
    }

    if(includeEdges && !cached.edgesPopulated){
      const rawEdges: WalkmeshEdge[] = [];
      const edgeScratch = this._walkCandidateEdgeScratch;
      for(let i = 0, len = this.rooms.length; i < len; i++){
        const room = this.rooms[i];
        const wok = room?.collisionManager?.walkmesh;
        if(!wok?.getEdgesInBox) continue;
        const cullBox = (wok.box && !wok.box.isEmpty()) ? wok.box
          : (room.box && !room.box.isEmpty()) ? room.box
          : undefined;
        if(cullBox && !cullBox.intersectsBox(box) && !cullBox.containsBox(box)){
          continue;
        }
        wok.getEdgesInBox(box, edgeScratch);
        for(let e = 0, el = edgeScratch.length; e < el; e++){
          rawEdges.push(edgeScratch[e]);
        }
      }
      cached.edges = rawEdges;
      cached.edgesPopulated = true;
    }

    for(let i = 0, len = cached.faces.length; i < len; i++){
      const face = cached.faces[i];
      if(!face) continue;
      if(walkFacesOnly ? face.walk : true){
        faces.push(face);
      }
    }
    if(includeEdges){
      for(let i = 0, len = cached.edges.length; i < len; i++){
        edges.push(cached.edges[i]);
      }
    }
    for(let i = 0, len = cached.rooms.length; i < len; i++){
      rooms.push(cached.rooms[i]);
    }

    return { faces, edges, rooms };
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
    // PositionWalkable keep — do not re-snap XY when already on a walk face.
    // Re-snapping XY allowed NaN-poisoned degenerate faces to yank the point
    // across the room ("walk away then speak/use"). Still project Z onto the
    // containing face so findGround / locomotion do not keep a floating height.
    const tmpPoint = new THREE.Vector3();
    if(this.isPointWalkable(point)){
      const onFace = point.clone();
      for(let i = 0, len = this.walkFaces.length; i < len; i++){
        const f = this.walkFaces[i];
        if(!f.pointInFace2d(point)) continue;
        f.triangle.closestPointToPoint(point, tmpPoint);
        if(Number.isFinite(tmpPoint.z)){
          onFace.z = tmpPoint.z;
        }
        break;
      }
      return onFace;
    }

    let nearest = Infinity;
    let nearest_point = point.clone();
    const tmp1 = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const inwardDirection = new THREE.Vector3();
    const edgeScratch = new THREE.Vector3();

    for(let i = 0, len = this.walkFaces.length; i < len; i++){
      const f = this.walkFaces[i];
      f.triangle.closestPointToPoint(point, tmpPoint);
      if(
        !Number.isFinite(tmpPoint.x) ||
        !Number.isFinite(tmpPoint.y) ||
        !Number.isFinite(tmpPoint.z)
      ){
        continue;
      }

      const edge1 = tmp1.subVectors(f.triangle.b, f.triangle.a);
      const edge2 = tmp2.subVectors(f.triangle.c, f.triangle.a);
      const normal = tmpN.crossVectors(edge1, edge2);
      const normalLenSq = normal.lengthSq();
      // Degenerate faces → NaN after normalize; skip inward pad (still allow
      // the closest point if it stayed finite).
      if(normalLenSq > 1e-12){
        normal.multiplyScalar(1 / Math.sqrt(normalLenSq));
        inwardDirection.set(0, 0, 0);
        let padEdge: THREE.Vector3 | undefined;
        if(f.adjacent[0] == -1 && f.pointIsOnEdge(tmpPoint, 'a')){
          padEdge = edge1;
        }else if(f.adjacent[1] == -1 && f.pointIsOnEdge(tmpPoint, 'b')){
          padEdge = edgeScratch.subVectors(f.triangle.c, f.triangle.b);
        }else if(f.adjacent[2] == -1 && f.pointIsOnEdge(tmpPoint, 'c')){
          padEdge = edgeScratch.subVectors(f.triangle.a, f.triangle.c);
        }
        if(padEdge){
          inwardDirection.crossVectors(normal, padEdge);
          const padLenSq = inwardDirection.lengthSq();
          if(padLenSq > 1e-12){
            inwardDirection.multiplyScalar(safeDistance / Math.sqrt(padLenSq));
            tmpPoint.add(inwardDirection);
            if(
              !Number.isFinite(tmpPoint.x) ||
              !Number.isFinite(tmpPoint.y) ||
              !Number.isFinite(tmpPoint.z)
            ){
              continue;
            }
          }
        }
      }

      // Walkmesh is XY-driven — prefer 2D distance over 3D.
      const dx = tmpPoint.x - point.x;
      const dy = tmpPoint.y - point.y;
      const distance = Math.hypot(dx, dy);
      if(!Number.isFinite(distance) || distance >= nearest){
        continue;
      }

      nearest_point.copy(tmpPoint);
      nearest = distance;
    }

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
    // SaveProperties — AreaProperties struct type 100
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
    // SaveModuleIFOStart — Mod_Area_list element type 6
    let areaStruct = new GFFStruct(6);
    areaStruct.addField( new GFFField(GFFDataType.RESREF, 'Area_Name') ).setValue(this.name);
    areaStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    //unescapable
    return areaStruct;
  }

  save(
    gameKey: 'k1' | 'k2' =
      GameState.GameKey == GameEngineType.TSL ? 'k2' : 'k1',
  ): { git: GFFObject, are: GFFObject }{
    const git = AreaGitSerializer.serialize(this, { gameKey });
    this.git = git;
    this.are.FileType = 'ARE ';

    return {git, are: this.are};
  }

}
