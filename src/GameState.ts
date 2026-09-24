import * as THREE from "three";
import { collapseAreaRoomLightmaps } from "@/three/odyssey/OdysseyLightmapAtlas";
import {
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, LevelUpManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager,
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, OdysseyLightmapBaker, PlaceableLightmapBaker, OdysseyShadowManager, WindManager, GrassManager, MenuManager, ModuleObjectManager, PartyManager,
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager,
  VideoEffectManager, VideoManager, PazaakManager, UINotificationManager, GuiTimingBarManager, GameOverManager, CutsceneManager, LegalScreenManager, EventManager, TextureAnimationManager, TutorialManager
} from "@/managers";

import type { SWRuleSet } from "@/engine/rules/SWRuleSet";

import type { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "@/talents";
import type { ModuleObject, ModuleCreature, Module, ModuleDoor } from "@/module";
import type { NWScript } from "@/nwscript/NWScript";
import { SaveGame } from "@/engine/SaveGame";
import type { GameEffectFactory } from "@/effects/GameEffectFactory";
import type { GameEventFactory } from "@/events/GameEventFactory";

import type { ActionMenuManager } from "@/engine/menu/ActionMenuManager";
import type { ActionFactory } from "@/actions/ActionFactory";

import { IngameControls } from "@/controls/IngameControls";
// import { Mouse } from "@/controls/Mouse";

import { INIConfig } from "@/engine/INIConfig";
import { consumeAreaTransitionLoadBackground } from "@/engine/area-transition-bmp";
import { ModuleSaveTable } from "@/engine/ModuleSaveTable";
import { planPostLoadRevealFade } from "@/engine/post-load-reveal-fade";

// import { OdysseyObject3D } from "@/three/odyssey";
import { AudioEngine, AudioEmitter } from "@/audio";
import { TGAObject } from "@/resource/TGAObject";

import { IGameStateGroups } from "@/interface/engine/IGameStateGroups";
import { ITextureLoaderQueuedRef } from "@/interface/loaders/ITextureLoaderQueuedRef";

import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { EngineState, EngineMode, GameEngineType, GameEngineEnv, EngineDebugType, RenderLayer } from "@/enums/engine";
import { TextureType } from "@/enums/loaders/TextureType";

import { runOdysseyDepthPrepass, runOdysseySoftDepthSplit } from "@/utility/odysseyDepthPrepass";
import { RenderPerfStats } from "@/utility/RenderPerfStats";
import { odysseyOpaqueRenderSort } from "@/utility/odysseyOpaqueRenderSort";
import { ConfigClient } from "@/utility/ConfigClient";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { asExtentInt, orthoFrustumInt } from "@/gui/GUICoord";
import { OdysseyShaderPass } from "@/shaders/pass/OdysseyShaderPass";
import { ForceDistortionPass } from "@/shaders/pass/ForceDistortionPass";
import { OverbrightenPass } from "@/shaders/pass/OverbrightenPass";
import { ConvolutionBloomPass } from "@/shaders/pass/ConvolutionBloomPass";
import { DreamDistortionPass } from "@/shaders/pass/DreamDistortionPass";
import { FuryPass } from "@/shaders/pass/FuryPass";
import { MiniGameAspectMaskPass } from "@/shaders/pass/MiniGameAspectMaskPass";
import { resolveMiniGameAspectMaskPass } from "@/shaders/pass/MiniGameAspectMaskGates";
import { OdysseyLensFlarePass } from "@/shaders/pass/OdysseyLensFlarePass";
import { ResourceLoader, TextureLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { CacheScope } from "@/enums/resource/CacheScope";
import { warmRoomGpuResources, compileAreaRoomsVisible } from "@/three/odyssey/warmRoomGpuResources";
import { GUIListBox } from "@/gui/GUIListBox";

//THREE.js imports
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import { AccumulationBlurPass } from "@/shaders/pass/AccumulationBlurPass";
import { resolveSpeedBlurPass } from "@/shaders/pass/FrameBufferEffectGates";
import Stats from 'three/examples/jsm/libs/stats.module'
// import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
// import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";

// import { ModuleTriggerType } from "@/enums";
import { Planetary } from "@/engine/Planetary";
import { Debugger } from "@/engine/Debugger";
import { DebuggerState } from "@/enums/server/DebuggerState";
import { IPCMessage } from "@/server/ipc/IPCMessage";
import { IPCMessageParam } from "@/server/ipc/IPCMessageParam";
import { IPCDataType } from "@/enums/server/ipc/IPCDataType";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { IPCMessageTypeDebug } from "@/enums/server/ipc/IPCMessageTypeDebug";
import { PerformanceMonitor } from "@/utility/PerformanceMonitor";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";
import { OdysseyUniformBuffers } from "@/three/odyssey/OdysseyUniformBuffers";
import {
  snapshotGlobals,
  snapshotLiveObject,
  snapshotModuleAreaInfo,
  snapshotObjectList,
  type SceneMapPin,
} from "@/inspect/runtimeSnapshots";
import { snapshotDialog } from "@/inspect/dialogSnapshot";
import { snapshotAreaMapOverlay } from "@/inspect/areaMapOverlay";
import { clearWorldMarkers, syncWorldMarkers } from "@/inspect/worldMarkers";
import { AudioEmitterType } from "./enums/audio/AudioEmitterType";
import { EngineContext } from "./engine/EngineContext";

// Preserve r149-like color appearance until a dedicated color-management pass.
THREE.ColorManagement.enabled = false;

export interface GameStateInitializeOptions {
  Game: GameEngineType,
  GameDirectory: string, //path to the local game install directory
  Env: GameEngineEnv,
};

const namedGroup = (name: string = 'na'): THREE.Group => {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

export class GameState implements EngineContext {

  static eventListeners: any = {
    "init": [],
    "start": [],
    "ready": [],

    "beforeRender": [],
    "afterRender": [],
    // "mgPazaakStart": 
  };

  static PerformanceMonitor: typeof PerformanceMonitor;
  static AppearanceManager: typeof AppearanceManager;
  static AutoPauseManager: typeof AutoPauseManager;
  static CameraShakeManager: typeof CameraShakeManager;
  static CharGenManager: typeof CharGenManager;
  static LevelUpManager: typeof LevelUpManager;
  static CheatConsoleManager: typeof CheatConsoleManager;
  static ConfigManager: typeof ConfigManager;
  static CursorManager: typeof CursorManager;
  static DialogMessageManager: typeof DialogMessageManager;
  static FactionManager: typeof FactionManager;
  static FadeOverlayManager: typeof FadeOverlayManager;
  static FeedbackMessageManager: typeof FeedbackMessageManager;
  static GlobalVariableManager: typeof GlobalVariableManager;
  static InventoryManager: typeof InventoryManager;
  static JournalManager: typeof JournalManager;
  static LightManager: typeof LightManager;
  static WindManager: typeof WindManager;
  static GrassManager: typeof GrassManager;
  static MenuManager: typeof MenuManager;
  static ModuleObjectManager: typeof ModuleObjectManager;
  static PartyManager: typeof PartyManager;
  static ResolutionManager: typeof ResolutionManager;
  static ShaderManager: typeof ShaderManager;
  static TLKManager: typeof TLKManager;
  static TwoDAManager: typeof TwoDAManager;
  static PazaakManager: typeof PazaakManager;
  static TutorialManager: typeof TutorialManager;
  static UINotificationManager: typeof UINotificationManager;
  static GuiTimingBarManager: typeof GuiTimingBarManager;
  static GameOverManager: typeof GameOverManager;
  static CutsceneManager: typeof CutsceneManager;
  static LegalScreenManager: typeof LegalScreenManager;
  static lastGameplayThumb?: OffscreenCanvas;
  static lastGameplayThumbCtx?: OffscreenCanvasRenderingContext2D;
  static lastGameplayThumbRT?: THREE.WebGLRenderTarget;

  static FollowerCamera: typeof FollowerCamera = FollowerCamera;


  static SWRuleSet: typeof SWRuleSet;

  static Module: typeof Module;
  static NWScript: typeof NWScript;

  static TalentObject: typeof TalentObject;
  static TalentFeat: typeof TalentFeat;
  static TalentSkill: typeof TalentSkill;
  static TalentSpell: typeof TalentSpell;
  static ActionMenuManager: typeof ActionMenuManager;

  static ActionFactory: typeof ActionFactory;
  static GameEffectFactory: typeof GameEffectFactory;
  static GameEventFactory: typeof GameEventFactory;
  static VideoEffectManager: typeof VideoEffectManager;
  static VideoManager: typeof VideoManager;

  static Planetary: typeof Planetary = Planetary;

  static Debugger: typeof Debugger = Debugger;

  static GameKey: GameEngineType = GameEngineType.KOTOR;
  static iniConfig: INIConfig;

  /** Pending requestAnimationFrame handle when V-Sync is on. */
  private static updateRafId = 0;
  /** Pending setTimeout handle when V-Sync is off (uncapped, yielding). */
  private static updateTimeoutId = 0;
  /** Generation bumped when V-Sync mode changes so stale scheduled ticks are ignored. */
  private static updateLoopGeneration = 0;
  
  static Ready = false;
  /** When true, Init skips MainMenu/legal and stays ready for Forge module preview. */
  static forgePreviewHost = false;
  private static forgePreviewResizeObserver: ResizeObserver | null = null;
  
  static CameraDebugZoom = 1;
  
  static raycaster = new THREE.Raycaster();
  static mouse = new THREE.Vector2();
  static mouseUI = new THREE.Vector2();
  static screenCenter = new THREE.Vector3();
  
  static SOLOMODE = false;
  static isLoadingSave = false;

  /**
   * Test-only multiplier for damage dealt by the PC / party (1 = normal).
   * Set below 1 (e.g. 0.25) so combat lasts longer while damage math is verified.
   */
  static DEBUG_PC_DAMAGE_SCALE = 1;

  /**
   * When true, combat floaties spawn for any attacker (legacy gate).
   * Default false = : only GetPlayerCreatureId attacker/damager.
   */
  static DEBUG_COMBAT_FLOATY_ALL_ATTACKERS = false;

  /** client turbo_enabled — GetMaxSpeed returns 15 when set. */
  static turboEnabled = false;
  /** party invulnerability cheat (server immortal for party). */
  static cheatInvulnerable = false;
  /** infiniteuses — skip usable item charge/stack consume. */
  static infiniteUses = false;
  /** revealmap toggle — hide minimap fog overlay without wiping explored data. */
  static cheatRevealMap = false;
  /** dancedancemalak GUI / GetCheatCode(0) flag. */
  static danceDanceMalak = false;
  /**
   * NWScript ShipBuild — shipping build builds always return TRUE.
   * Default TRUE to match; cheat console can toggle off for debug scripts.
   */
  static shipBuild = true;
  /** TSL SetDisableTransit — blocks galaxy map transit when true. */
  static disableTransit = false;
  /** TSL SetInputClass — current input class id. */
  static inputClass = 0;
  /** TSL EnableRain. */
  static enableRain = false;
  /** TSL EnableRendering — when false, skip rendering. */
  static enableRendering = true;
  
  static Flags = {
    EnableAreaVIS: false,
    LogScripts: false,
    EnableOverride: false,
    WalkmeshVisible: false,
    CombatEnabled: false
  }
  static debugMode = false;
  static debug: {[key in EngineDebugType]: boolean} = {
    CONTROLS: false,
    SELECTED_OBJECT: false,
    OBJECT_LABELS: false,
    PATH_FINDING: false,

    ROOM_WALKMESH: false,
    DOOR_WALKMESH: false,
    PLACEABLE_WALKMESH: false,
    COLLISION_HELPERS: false,

    LIGHT_HELPERS: false,
    LIGHT_HELPERS_BOUND_ONLY: false,
    SHADOW_LIGHTS: false,
    MOVEMENT_OWNERSHIP: false,
  };
  
  static IsPaused = false;

  /** TimeStop effect: world paused with exclusion list (pause bit 1). */
  static timeStopActive = false;
  static timeStopPausedByEffect = false;
  static timeStopExclusions: Set<number> = new Set();
  
  static Mode: EngineMode = EngineMode.GUI;
  /** camera_mode — default 3 (OnAStick); SetCameraMode / drive gate */
  static clientCameraMode: number = 3;
  /**
   * hsMode — message-panel key sequence sets 1;
   * freelook then enters Navigate (hover) and bumps to 2.
   */
  static cameraHsMode: number = 0;
  static holdWorldFadeInForDialog = false;
  /** True while waiting on area-transition pre-fade before LoadModule. */
  static areaTransitionPending = false;
  /**
   * Pass AI — JumpToPoint / JumpToLocation cross-module spawn override.
   * Consumed by ModuleArea.getSpawnLocation after LoadModule.
   */
  static pendingJumpSpawn: {
    x: number;
    y: number;
    z: number;
    ox: number;
    oy: number;
  } | undefined = undefined;
  static autoRun = false;
  static AlphaTest = 0.5;
  static noClickTimer = 0;
  static maxSelectableDistance = 30;
  static maxSelectableDistanceSquared = GameState.maxSelectableDistance * GameState.maxSelectableDistance;

  static delta: number = 0;

  static SaveGame: SaveGame;
  
  static currentGamepad: Gamepad;
  static videoEffect: number = -1;
  static onScreenShot?: Function;
  static time: number = 0;
  static deltaTime: number = 0;
  static deltaTimeFixed: number = 0;
  /** SetGameSpeed / world timer snapshot scale (death sequence slows this). */
  static timeScale: number = 1;

  static canvas: HTMLCanvasElement;
  static context: WebGL2RenderingContext;
  static rendererUpscaleFactor: number;
  static renderer: THREE.WebGLRenderer;
  static depthTarget: THREE.WebGLRenderTarget;
  /**
   * Set by DEPTH_TEXTURE emitters during tick.
   * When true, Render runs a scene depth prepass into depthTarget.
   */
  static softDepthNeeded: boolean = false;
  /**
   * Set by force-distortion emitters (TILE / Gob.distortion) during tick when
   * the area has rooms. Enables ForceDistortionPass for that frame
   * (forcePushBucket nonempty → FrameBufferModifications bit 0x20).
   */
  static forceDistortionNeeded: boolean = false;
  /** Global "distortiontex" from Scene ctor — heat-warp lookup. */
  static forceDistortionTexture: THREE.Texture | null = null;
  static clock: THREE.Timer;
  static stats: Stats;

  static lightManager: LightManager;
  static odysseyShadowManager: OdysseyShadowManager;
  static windManager: WindManager;
  static grassManager: GrassManager;

  static visible: boolean;

  static scene: THREE.Scene;
  static scene_gui: THREE.Scene;
  static scene_movie: THREE.Scene;

  //Camera properties
  static frustumMat4: THREE.Matrix4;
  static camera: THREE.PerspectiveCamera;
  static currentCamera: THREE.Camera;
  static followerCamera: THREE.PerspectiveCamera;
  static camera_dialog: THREE.PerspectiveCamera;
  static camera_animated: THREE.PerspectiveCamera;
  static camera_gui: THREE.OrthographicCamera;
  static currentCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  static staticCameras: THREE.PerspectiveCamera[];
  static staticCameraIndex: number;
  static animatedCameraIndex: number;
  static viewportFrustum: THREE.Frustum;
  static viewportProjectionMatrix: THREE.Matrix4;

  // Scene light-model ambient = ARE DynAmbientColor (SetAmbient during LoadArea).
  // Sun/moon ambient = directional light ambient channel; diffuse = gidy_sun_diff.
  static ambientColor = new THREE.Color(0xFFFFFF);
  static sunAmbientColor = new THREE.Color(0x000000);
  static sunColor = new THREE.Color(0xFFFFFF);
  /** Direction toward gidy_sun at (4000, 4500, 7000) — LoadArea. */
  static sunDirection = new THREE.Vector3(4000, 4500, 7000).normalize();
  /** @deprecated Use ambientColor — kept for rare debug callers. */
  static globalLight: { color: THREE.Color; intensity: number } | undefined;
  /** @deprecated Use sunColor — kept for rare debug callers. */
  static sunLight: { color: THREE.Color; intensity: number; position: THREE.Vector3 } | undefined;
  /** global `shadowAlpha` (0–1) from day/night cycle — stencil shadow darkness. */
  static shadowAlpha = 0;
  /**
   * ARE SunShadows / MoonShadows for the active day/night lighting period.
   * When false, stencil disks and creature Fx_Shadow blobs are hidden.
   */
  static areaShadowsEnabled = true;
  /** INI Graphics Options.Shadows — user toggle for all shadow rendering. */
  static userShadowsEnabled = true;
  /** global `beamingProjectionAlpha` (0–0.05) from dawn/dusk — SetBeaming blend alpha. */
  static beamingProjectionAlpha = 0;

  /** Combined shadow enable: INI + area ShadowOpacity curve. */
  static areShadowsEnabled(): boolean {
    return GameState.userShadowsEnabled && GameState.shadowAlpha > 0;
  }
  /** Set by updateShadowSystems; Render skips a second selection pass when true. */
  static shadowSystemsUpdatedThisFrame = false;
  static currentLeader: ModuleCreature;
  static playerFeetOffset: THREE.Vector3;
  static collisionList: any[];
  static walkmeshList: any[];

  static group: IGameStateGroups = {
    creatures: new THREE.Group,
    doors: new THREE.Group,
    placeables: new THREE.Group,
    rooms: new THREE.Group,
    grass: new THREE.Group,
    sounds: new THREE.Group,
    triggers: new THREE.Group,
    waypoints: new THREE.Group,
    party: new THREE.Group,
    lights: new THREE.Group,
    light_helpers: new THREE.Group,
    shadow_lights: new THREE.Group,
    path_helpers: new THREE.Group,
    emitters: new THREE.Group,
    effects: new THREE.Group,
    stunt: new THREE.Group,
    weather_effects: new THREE.Group,
    room_walkmeshes: new THREE.Group,
    spell_instances: new THREE.Group,
    debug: new THREE.Group,
    collision_helpers: new THREE.Group,
  };
  
  static interactableObjects: any[];

  static scene_cursor_holder: THREE.Group;
  static controls: IngameControls;

  //Render pass properties
  static composer: EffectComposer;
  static renderPass: RenderPass;
  static renderPassAA: SSAARenderPass;
  static odysseyShaderPass: OdysseyShaderPass;
  static forceDistortionPass: ForceDistortionPass;
  /**
   * FrameBufferModifications bit 0x01 + visualizePass1.
   * Shipping visualizePass1 = 0 → stays disabled unless debug override.
   */
  static overbrightenPass: OverbrightenPass;
  /**
   * FrameBufferModifications bit 0x02 + visualizePass2 (= 1).
   * Always-on for roomed scenes when Frame Buffer INI is enabled.
   */
  static convolutionBloomPass: ConvolutionBloomPass;
  /** K2 clairvoyance / dream distortion. */
  static dreamDistortionPass: DreamDistortionPass;
  /** K2 force fury overlay (fx_Fury01/02/03). */
  static furyPass: FuryPass;
  /**
   * — after primary FB mods, before GUI.
   */
  static lensFlarePass: OdysseyLensFlarePass;
  /**
   * Widescreen soft 4:3 cockpit mask for swoop / turret.
   * After FB FX + MG HUD, before GUI (menus stay full-bleed).
   */
  static miniGameAspectMaskPass: MiniGameAspectMaskPass;
  static copyPass: ShaderPass;
  static renderPassGUI: RenderPass;
  /** MG camera HUD after AccumulationBlurPass — screen-stable gauges stay sharp. */
  static renderPassMGHud: RenderPass;
  static bloomPass: BloomPass;
  static bokehPass: BokehPass;
  /**
   * AurEnable/DisableSpeedBlur + AurSetSpeedBlurRatio
   * (SWMG_SetSpeedBlurEffect / Force Speed ApplyMotionBlur).
   */
  static speedBlurPass: AccumulationBlurPass;
  static speedBlurEnabled: boolean = false;
  static speedBlurRatio: number = 0.75;
  /**
   * motionBlurVFXCount — Force Speed progFX 0x641/0x642 refcount
   * (ApplyMotionBlur / RemoveMotionBlur).
   */
  static motionBlurVFXCount: number = 0;
  
  static module: Module;
  static loadingModule: boolean = false;
  static TutorialWindowTracker: number[];
  static audioEmitter: AudioEmitter;
  static guiAudioEmitter: AudioEmitter;
  static State: EngineState;
  static inMenu: boolean;
  static OnReadyCalled: boolean;
  
  static loadingTextures: boolean;

  static preloadTextures: string[] = ['fx_tex_01', 'fx_tex_02', 'fx_tex_03', 'fx_tex_04', 'fx_tex_05', 'fx_tex_06', 'fx_tex_07', 'fx_tex_08',
    'fx_tex_09', 'fx_tex_10', 'fx_tex_11', 'fx_tex_12', 'fx_tex_13', 'fx_tex_14', 'fx_tex_15', 'fx_tex_16',
    'fx_tex_17', 'fx_tex_18', 'fx_tex_19', 'fx_tex_20', 'fx_tex_21', 'fx_tex_22', 'fx_tex_23', 'fx_tex_24',
    'fx_tex_25', 'fx_tex_26', 'fx_tex_stealth', 'distortiontex', 'filmnoisetex',
    'fx_Fury01', 'fx_Fury02', 'fx_Fury03'];

  static domElement: HTMLElement;

  static GetDebugState(type: EngineDebugType){
    return !!this.debug[type];
  }

  static ToggleDebugState(type: EngineDebugType){
    GameState.SetDebugState(type, !this.debug[type]);
  }

  /** Push CreateScript IPC for every live NWScriptInstance so a late-opened debugger is populated. */
  static dumpLiveScriptsToDebugger(){
    if(!GameState.debugMode) return;
    for(const instance of GameState.NWScript.NWScriptInstanceMap.values()){
      instance.sendToDebugger(IPCMessageType.CreateScript);
    }
  }

  /** Push a JSON-safe Module Inspector snapshot to the debugger window. */
  static sendInspectorSnapshot(type: IPCMessageType, payload: unknown){
    if(!GameState.debugMode) return;
    const msg = new IPCMessage(type);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, JSON.stringify(payload ?? null)));
    GameState.Debugger.send(msg);
  }

  /**
   * Reply to RequestScriptResource with NCS bytes from ResourceLoader / runtime cache.
   * Does not call NWScript.Load (avoids inventing live instances).
   */
  static sendScriptResource(
    resref: string,
    ok: boolean,
    source: 'override' | 'key' | 'module' | 'runtime' | 'missing',
    bytecode?: Uint8Array | null,
  ){
    if(!GameState.debugMode) return;
    const msg = new IPCMessage(IPCMessageType.ScriptResource);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, resref || ''));
    msg.addParam(new IPCMessageParam(IPCDataType.INTEGER, ok ? 1 : 0));
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, source));
    msg.addParam(new IPCMessageParam(IPCDataType.VOID, ok && bytecode ? bytecode : new Uint8Array(0)));
    GameState.Debugger.send(msg);
  }

  /** Resolve NCS buffer + source label without creating a live script instance. */
  static async resolveScriptResourceBytes(resref: string): Promise<{
    buffer: Uint8Array;
    source: 'override' | 'key' | 'module' | 'runtime';
  } | null> {
    const key = (resref || '').toLowerCase();
    if(!key){ return null; }
    const resId = ResourceTypes.ncs;

    const runtime =
      GameState.NWScript?.scripts?.get(key)
      || GameState.NWScript?.scripts?.get(resref);
    if(runtime?.code?.length){
      return { buffer: runtime.code, source: 'runtime' };
    }

    const overrideMap = ResourceLoader.CacheScopes[CacheScope.OVERRIDE]?.get(resId);
    if(overrideMap?.has(key)){
      return { buffer: overrideMap.get(key)!, source: 'override' };
    }
    const moduleMap = ResourceLoader.CacheScopes[CacheScope.MODULE]?.get(resId);
    if(moduleMap?.has(key)){
      return { buffer: moduleMap.get(key)!, source: 'module' };
    }
    const globalMap = ResourceLoader.CacheScopes[CacheScope.GLOBAL]?.get(resId);
    if(globalMap?.has(key)){
      return { buffer: globalMap.get(key)!, source: 'key' };
    }

    const cached = ResourceLoader.loadCachedResource(resId, key);
    if(cached?.length){
      return { buffer: cached, source: 'key' };
    }

    try{
      const fromOverride = await ResourceLoader.searchOverride(resId, key);
      if(fromOverride?.length){
        return { buffer: fromOverride, source: 'override' };
      }
    }catch{ /* ignore */ }

    try{
      const fromModule = await ResourceLoader.searchModuleArchives(resId, key);
      if(fromModule?.length){
        return { buffer: fromModule, source: 'module' };
      }
    }catch{ /* ignore */ }

    try{
      const fromKey = await ResourceLoader.searchKeyTable(resId, key);
      if(fromKey?.length){
        return { buffer: fromKey, source: 'key' };
      }
    }catch{ /* ignore */ }

    return null;
  }

  /** Finish or clear a mid-halt script when the debugger window closes. */
  static finishPausedScriptOnDebuggerClose(){
    const script = GameState.Debugger.currentScript;
    const instruction = GameState.Debugger.currentInstruction;
    GameState.Debugger.pendingResume = null;
    if(script && instruction && !script._disposed){
      GameState.Debugger.state = DebuggerState.Idle;
      GameState.Debugger.currentInstruction = undefined as any;
      script.seekTo(instruction.address);
      try{
        script.runScript(true);
      }catch(e){
        console.error('Debugger close: failed to finish paused script', e);
      }
    }
    GameState.Debugger.clearDebugHalt();
    if(script){
      script.suspended = false;
    }
  }

  /** Apply Continue / Step queued from BroadcastChannel on the next Update tick. */
  static processPendingDebuggerResume(){
    const pending = GameState.Debugger.pendingResume;
    if(!pending || !GameState.Debugger.currentScript) return;
    GameState.Debugger.pendingResume = null;

    const script = GameState.Debugger.currentScript;
    GameState.Debugger.currentInstruction = undefined as any;

    switch(pending.action){
      case 'continue':
        GameState.Debugger.state = DebuggerState.Idle;
        break;
      case 'stepOver':
        GameState.Debugger.state = DebuggerState.InstructionStepOver;
        break;
      case 'stepInto':
        GameState.Debugger.state = DebuggerState.InstructionStepInto;
        break;
      case 'stepOut':
        GameState.Debugger.state = DebuggerState.InstructionStepOut;
        break;
    }

    script.seekTo(pending.seek);
    script.runScript(true);
  }

  /**
   * SWMG_SetSpeedBlurEffect —
   * AurSetSpeedBlurRatio (default 0.75) + AurEnable/DisableSpeedBlur.
   * Accumulation via AccumulationBlurPass (RenderAccumulationBlur + 128^2 RenderFrameToTexture).
   */
  static SetSpeedBlurEffect(enabled: boolean, ratio: number = 0.75){
    const wasEnabled = GameState.speedBlurEnabled;
    GameState.speedBlurEnabled = !!enabled;
    if(typeof ratio === 'number' && Number.isFinite(ratio)){
      GameState.speedBlurRatio = ratio;
    }
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.ratio = GameState.speedBlurRatio;
      if(!GameState.speedBlurEnabled && wasEnabled){
        GameState.speedBlurPass.resetAccumulation();
      }
    }
  }

  /**
   * ApplyMotionBlur — progFX 0x641/0x642 on the player (not during MG).
   */
  static applyMotionBlurVFX(target: ModuleCreature | undefined, progFX: number){
    if(progFX !== 0x641 && progFX !== 0x642){
      return;
    }
    GameState.motionBlurVFXCount++;
    const player = GameState.PartyManager?.Player || GameState.getCurrentPlayer();
    const isPlayerTarget = !player || !!(target && player === target);
    const inMiniGame = !!GameState.module?.area?.miniGame;
    if(isPlayerTarget && GameState.motionBlurVFXCount === 1 && !inMiniGame){
      GameState.SetSpeedBlurEffect(true, 0.75);
    }
  }

  /**
   * RemoveMotionBlur — disable when refcount hits zero (outside MG).
   */
  static removeMotionBlurVFX(){
    GameState.motionBlurVFXCount--;
    if(GameState.motionBlurVFXCount < 0){
      GameState.motionBlurVFXCount = 0;
      return;
    }
    if(GameState.motionBlurVFXCount !== 0){
      return;
    }
    if(!GameState.module?.area?.miniGame){
      GameState.SetSpeedBlurEffect(false);
    }
  }

  /**
   * UpdateMotionBlur — ratio = clamp(speed/driveMax, 1) * 0.75.
   *
   * Must run AFTER locomotion this frame. WASD calls cancelLocomotionActions
   * (zeros speed) in controls.Update before creature.update; pathfinding
   * creature loco sets speed before area.update. Syncing here (Render) sees the
   * post-movement speed for both.
   *
   * Prefers playerControl.lastAnimMoveSpeed when live,
   * else creature.speed (creature walk update).
   */
  static syncMotionBlurRatio(){
    if(GameState.motionBlurVFXCount <= 0 || !GameState.speedBlurEnabled){
      return;
    }
    // SWMG_SetSpeedBlurEffect owns ratio during minigames.
    if(GameState.module?.area?.miniGame){
      return;
    }
    const creature =
      GameState.PartyManager?.Player || GameState.getCurrentPlayer();
    if(!creature){
      return;
    }
    const driveMax = creature.getAppearance()?.drivemaxspeed || 0;
    if(!(driveMax > 0)){
      return;
    }
    const anim = creature.playerControl?.lastAnimMoveSpeed ?? 0;
    const raw = typeof creature.speed === 'number' ? creature.speed : 0;
    // Pathfinding never writes lastAnimMoveSpeed; WASD does.
    const speed = anim > 0 ? anim : raw;
    let t = speed / driveMax;
    if(t > 1) t = 1;
    if(t < 0) t = 0;
    GameState.speedBlurRatio = t * 0.75;
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.ratio = GameState.speedBlurRatio;
    }
  }

  static SetDebugState(type: EngineDebugType, enabled: boolean){
    this.debug[type] = enabled;
    console.log('SetDebugState', type, enabled);
    switch(type){
      case EngineDebugType.PATH_FINDING:
        if(!GameState?.module?.area?.path)
          return;

        GameState.module.area.path.setPathHelpersVisibility(enabled);

        for(let i = 0; i < GameState.module.area.creatures.length; i++){
          const creature = GameState.module.area.creatures[i]
          if(!creature.getComputedPath()?.helperMesh){
            continue;
          }
          creature.getComputedPath().helperMesh.visible = enabled;
        }

        for(let i = 0; i < GameState.PartyManager.party.length; i++){
          const creature = GameState.PartyManager.party[i]
          if(!creature.getComputedPath()?.helperMesh){
            continue;
          }
          creature.getComputedPath().helperMesh.visible = enabled;
        }
      break;
      case EngineDebugType.OBJECT_LABELS:
        if(!GameState?.module?.area)
          return;

        for(let i = 0; i < GameState.module.area.creatures.length; i++){
          const creature = GameState.module.area.creatures[i]
          if(!creature.debugLabel){
            continue;
          }
          creature.debugLabel.container.visible = enabled;
        }

        for(let i = 0; i < GameState.PartyManager.party.length; i++){
          const creature = GameState.PartyManager.party[i]
          if(!creature.debugLabel){
            continue;
          }
          creature.debugLabel.container.visible = enabled;
        }

        // for(let i = 0; i < GameState.module.area.doors.length; i++){
        // const creature = GameState.module.area.doors[i]
        // if(!creature.debugLabel){
        // continue;
        // }
        // creature.debugLabel.container.visible = enabled;
        // }

        // for(let i = 0; i < GameState.module.area.placeables.length; i++){
        // const creature = GameState.module.area.placeables[i]
        // if(!creature.debugLabel){
        // continue;
        // }
        // creature.debugLabel.container.visible = enabled;
        // }

        // for(let i = 0; i < GameState.module.area.triggers.length; i++){
        // const creature = GameState.module.area.triggers[i]
        // if(!creature.debugLabel){
        // continue;
        // }
        // creature.debugLabel.container.visible = enabled;
        // }
      break;
      case EngineDebugType.ROOM_WALKMESH:
      case EngineDebugType.DOOR_WALKMESH:
      case EngineDebugType.PLACEABLE_WALKMESH:
        {
          const areWalkmeshesVisible = GameState.debug[EngineDebugType.ROOM_WALKMESH] || GameState.debug[EngineDebugType.DOOR_WALKMESH] || GameState.debug[EngineDebugType.PLACEABLE_WALKMESH];
          GameState.group.room_walkmeshes.visible = areWalkmeshesVisible;
          for(let i = 0; i < GameState.module.area.rooms.length; i++){
            const room = GameState.module.area.rooms[i];
            if(room.collisionManager.walkmesh){
              room.collisionManager.walkmesh.mesh.visible = GameState.debug[EngineDebugType.ROOM_WALKMESH];
              if(GameState.debug[EngineDebugType.ROOM_WALKMESH]){
                room.collisionManager.walkmesh.buildEdgeNormalHelpers();
              }
            }
          }
          for(let i = 0; i < GameState.module.area.doors.length; i++){
            const door = GameState.module.area.doors[i];
            if(door.collisionManager.walkmesh){
              door.collisionManager.walkmesh.mesh.visible = GameState.debug[EngineDebugType.DOOR_WALKMESH];
            }
          }
          for(let i = 0; i < GameState.module.area.placeables.length; i++){
            const placeable = GameState.module.area.placeables[i];
            if(placeable.collisionManager.walkmesh){
              placeable.collisionManager.walkmesh.mesh.visible = GameState.debug[EngineDebugType.PLACEABLE_WALKMESH];
              if(GameState.debug[EngineDebugType.PLACEABLE_WALKMESH]){
                placeable.collisionManager.walkmesh.buildEdgeNormalHelpers();
              }
            }
          }
        }
      break;
      case EngineDebugType.COLLISION_HELPERS:
        GameState.group.collision_helpers.visible = enabled;
      break;
      case EngineDebugType.LIGHT_HELPERS:
        GameState.group.light_helpers.visible = enabled;
      break;
      case EngineDebugType.SHADOW_LIGHTS:
        GameState.group.shadow_lights.visible = enabled;
      break;
    }
  }

  static addEventListener(event: string, callback: Function){
    if(GameState.eventListeners.hasOwnProperty(event)){
      const callbacks: any[] = GameState.eventListeners[event];
      if(callbacks){
        callbacks.push(callback);
      }
    }
  }

  static processEventListener(event: string, args: any[] = []){
    if(GameState.eventListeners.hasOwnProperty(event)){
      const callbacks = GameState.eventListeners[event];
      if(callbacks && callbacks.length){
        for(let i = 0, len = callbacks.length; i < len; i++){
          const cb = callbacks[i];
          if(typeof cb === 'function')
            cb(...args);
        }
      }
    }
  }

  static setDOMElement(element: HTMLElement){
    GameState.domElement = element;
  }

  /**
   * Initialize the GameState
   */
  static async Init(){
    GameState.Debugger.addEventListener('open', () => {
      GameState.debugMode = true;
      GameState.dumpLiveScriptsToDebugger();
      GameState.sendInspectorSnapshot(IPCMessageType.ModuleSnapshot, snapshotModuleAreaInfo());
      GameState.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
    });
    GameState.Debugger.addEventListener('client-reconnected', () => {
      if(!GameState.debugMode){ return; }
      GameState.dumpLiveScriptsToDebugger();
      GameState.sendInspectorSnapshot(IPCMessageType.ModuleSnapshot, snapshotModuleAreaInfo());
      GameState.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
      void (async () => {
        const overlay = await snapshotAreaMapOverlay();
        GameState.sendInspectorSnapshot(IPCMessageType.AreaMapOverlay, overlay);
      })();
    });
    GameState.Debugger.addEventListener('close', () => {
      GameState.finishPausedScriptOnDebuggerClose();
      GameState.debugMode = false;
      clearWorldMarkers();
    });
    GameState.Debugger.addEventListener('message', (msg: IPCMessage) => {
      if(msg.type == IPCMessageType.SetScriptBreakpoint){
        const instanceUUID = msg.getParam(0).getString();
        const address = msg.getParam(1).getInt32();
        const instance = GameState.NWScript.NWScriptInstanceMap.get(instanceUUID);
        if(instance){
          instance.setBreakpoint(address);
        }
      }else if(msg.type == IPCMessageType.RemoveScriptBreakpoint){
        const instanceUUID = msg.getParam(0).getString();
        const address = msg.getParam(1).getInt32();
        const instance = GameState.NWScript.NWScriptInstanceMap.get(instanceUUID);
        if(instance){
          instance.removeBreakpoint(address);
        }
      }else if(msg.type == IPCMessageType.ContinueScript){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('continue', seek);
        }
      }else if(msg.type == IPCMessageType.StepOverInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('stepOver', seek);
        }
      }else if(msg.type == IPCMessageType.StepIntoInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('stepInto', seek);
        }
      }else if(msg.type == IPCMessageType.StepOutInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const seek = GameState.Debugger.currentInstruction.address;
          GameState.Debugger.queueResume('stepOut', seek);
        }
      }else if(msg.type == IPCMessageType.ListLiveScripts){
        GameState.dumpLiveScriptsToDebugger();
      }else if(msg.type == IPCMessageType.RequestModuleSnapshot){
        GameState.sendInspectorSnapshot(IPCMessageType.ModuleSnapshot, snapshotModuleAreaInfo());
      }else if(msg.type == IPCMessageType.RequestObjectList){
        const kindParam = msg.getParam(0);
        const kind = kindParam ? kindParam.getString() : '';
        GameState.sendInspectorSnapshot(
          IPCMessageType.ObjectList,
          snapshotObjectList(kind ? { kind } : undefined)
        );
      }else if(msg.type == IPCMessageType.RequestObjectDetail){
        const objectId = msg.getParam(0)?.getInt32?.() ?? -1;
        const obj = GameState.ModuleObjectManager.GetObjectById(objectId);
        const detail = obj ? snapshotLiveObject(obj) : null;
        GameState.sendInspectorSnapshot(IPCMessageType.ObjectDetail, detail);
      }else if(msg.type == IPCMessageType.RequestGlobalsSnapshot){
        GameState.sendInspectorSnapshot(IPCMessageType.GlobalsSnapshot, snapshotGlobals());
      }else if(msg.type == IPCMessageType.SetSceneWorldMarkers){
        try{
          const raw = msg.getParam(0)?.getString?.() || '';
          const payload = raw ? JSON.parse(raw) as {
            enabled?: boolean;
            selectedId?: string | null;
            entries?: SceneMapPin[];
          } : {};
          syncWorldMarkers(
            Array.isArray(payload.entries) ? payload.entries : [],
            !!payload.enabled,
            payload.selectedId ?? null
          );
        }catch(e){
          console.error('SetSceneWorldMarkers failed', e);
          clearWorldMarkers();
        }
      }else if(msg.type == IPCMessageType.RequestAreaMapOverlay){
        void (async () => {
          const overlay = await snapshotAreaMapOverlay();
          GameState.sendInspectorSnapshot(IPCMessageType.AreaMapOverlay, overlay);
        })();
      }else if(msg.type == IPCMessageType.RequestScriptResource){
        const resref = (msg.getParam(0)?.getString?.() || '').trim();
        void (async () => {
          try{
            const found = await GameState.resolveScriptResourceBytes(resref);
            if(found){
              GameState.sendScriptResource(resref.toLowerCase(), true, found.source, found.buffer);
            }else{
              GameState.sendScriptResource(resref.toLowerCase() || resref, false, 'missing', null);
            }
          }catch(e){
            console.error('RequestScriptResource failed', e);
            GameState.sendScriptResource(resref.toLowerCase() || resref, false, 'missing', null);
          }
        })();
      }else if(msg.type == IPCMessageType.RequestDialogSnapshot){
        GameState.sendInspectorSnapshot(IPCMessageType.DialogSnapshot, snapshotDialog());
      }else if(msg.type == IPCMessageType.Debug && msg.subType == IPCMessageTypeDebug.ToggleDebugState){
        const type = msg.getParam(0).getString();
        GameState.ToggleDebugState(type as EngineDebugType);
      }
    });

    GameState.lightManager = new GameState.LightManager();
    OdysseyLightingBinder.setActiveManager(GameState.lightManager);
    PlaceableLightmapBaker.setLightManagerProvider(() => GameState.lightManager);
    OdysseyLightmapBaker.setLightManagerProvider(() => GameState.lightManager);
    GameState.odysseyShadowManager = new OdysseyShadowManager();
    GameState.windManager = new GameState.WindManager();
    WindManager.setInstance(GameState.windManager);
    GameState.grassManager = new GameState.GrassManager();
    GrassManager.setInstance(GameState.grassManager);
    GameState.processEventListener('init');

    GameState.VideoEffectManager.SetVideoEffect(-1);
    GameState.onScreenShot = undefined;

    GameState.time = 0;
    GameState.deltaTime = 0;
    GameState.deltaTimeFixed = 0;

    GameState.canvas = document.createElement( 'canvas' );
    //GameState.canvas = GameState.renderer.domElement;

    GameState.canvas.classList.add('noselect');
    GameState.canvas.setAttribute('tabindex', '1');
    if(GameState.domElement){
      GameState.domElement.appendChild(GameState.canvas);
    }
    
    //transferToOffscreen causes issues with savegame screenshots
    //GameState.canvas = GameState.canvas.transferControlToOffscreen;

    GameState.canvas.style.setProperty('width', '0');
    GameState.canvas.style.setProperty('height', '0');

    GameState.rendererUpscaleFactor = 1;
    // WebGL2 required (Three r163+). Stencil must be requested on the
    // first getContext call (shadow disks / force-distortion masks).
    const glAttrs: WebGLContextAttributes = {
      antialias: false,
      alpha: true,
      depth: true,
      stencil: true,
      preserveDrawingBuffer: false,
    };
    GameState.context = GameState.canvas.getContext('webgl2', glAttrs) as WebGL2RenderingContext | null;
    if(!GameState.context){
      throw new Error('KotOR.js requires WebGL 2. This browser or GPU does not provide a WebGL2 context.');
    }
    GameState.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas: GameState.canvas,
      context: GameState.context,
      logarithmicDepthBuffer: true,
      alpha: true,
      preserveDrawingBuffer: false,
      stencil: true,
    }) as THREE.WebGLRenderer;

    GameState.renderer.autoClear = false;
    GameState.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    GameState.renderer.shadowMap.enabled = true;
    GameState.renderer.shadowMap.autoUpdate = false;
    GameState.renderer.shadowMap.type = THREE.PCFShadowMap;
    GameState.renderer.setOpaqueSort(odysseyOpaqueRenderSort);
    GameState.renderer.setSize( GameState.ResolutionManager.getViewportWidth(), GameState.ResolutionManager.getViewportHeight() );
    GameState.renderer.setClearColor(0x000000);

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
		GameState.depthTarget = new THREE.WebGLRenderTarget( GameState.ResolutionManager.getViewportWidth(), GameState.ResolutionManager.getViewportHeight(), pars );
    GameState.depthTarget.texture.generateMipmaps = false;
    GameState.depthTarget.stencilBuffer = false;
    GameState.depthTarget.depthBuffer = true;
    GameState.depthTarget.depthTexture = new THREE.DepthTexture(GameState.ResolutionManager.getViewportWidth(), GameState.ResolutionManager.getViewportHeight());
    GameState.depthTarget.depthTexture.type = THREE.UnsignedShortType;
    GameState.syncDepthTargetTextureSize();

    GameState.clock = new THREE.Timer();
    GameState.stats = new Stats();
    GameState.stats.showPanel(undefined);

    GameState.visible = true;

    /**
     * Initialize the scene graph
     */

    GameState.scene = new THREE.Scene();
    GameState.scene_gui = new THREE.Scene();
    GameState.scene_movie = new THREE.Scene();
    GameState.frustumMat4 = new THREE.Matrix4();
    GameState.camera = FollowerCamera.camera;

    GameState.camera_dialog = new THREE.PerspectiveCamera( 55, GameState.ResolutionManager.getViewportWidth() / GameState.ResolutionManager.getViewportHeight(), 0.01, 15000 );
    GameState.camera_dialog.up = new THREE.Vector3( 0, 0, 1 );
    // Animated clip defaults match SetAnimatedCamera (0.1, 10000)
    GameState.camera_animated = new THREE.PerspectiveCamera( 55, GameState.ResolutionManager.getViewportWidth() / GameState.ResolutionManager.getViewportHeight(), 0.1, 10000 );
    // Match dialog / follower cameras — Aurora world is Z-up.
    GameState.camera_animated.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    GameState.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    
    const guiFrustum = orthoFrustumInt(
      GameState.ResolutionManager.getViewportWidth(),
      GameState.ResolutionManager.getViewportHeight(),
    );
    GameState.camera_gui = new THREE.OrthographicCamera(
      guiFrustum.left,
      guiFrustum.right,
      guiFrustum.top,
      guiFrustum.bottom,
      1, 1000
    );
    GameState.camera_gui.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera_gui.position.z = 500;
    GameState.camera_gui.updateProjectionMatrix();
    GameState.scene_gui.add(new THREE.AmbientLight(0x60534A));
    GameState.scene_movie.add(new THREE.AmbientLight(0x60534A));

    FollowerCamera.facing = Math.PI/2;
    FollowerCamera.speed = 0;

    //Static Camera's that are in the.git file of the module
    GameState.staticCameras = [];

    GameState.staticCameraIndex = 0;
    GameState.animatedCameraIndex = 0;
    GameState.currentCamera = GameState.camera;

    GameState.viewportFrustum = new THREE.Frustum();
    GameState.viewportProjectionMatrix = new THREE.Matrix4();

    // DynAmbient + sun ambient/diffuse — OdysseyLightingBinder (no THREE lights)
    GameState.ambientColor.setRGB(1, 1, 1);
    GameState.sunAmbientColor.setRGB(0, 0, 0);
    GameState.sunColor.setRGB(1, 1, 1);
    GameState.sunDirection.set(4000, 4500, 7000).normalize();
    GameState.globalLight = { color: GameState.ambientColor, intensity: 1 };
    GameState.sunLight = { color: GameState.sunColor, intensity: 1, position: GameState.sunDirection };
    OdysseyLightingBinder.setAreaAmbient(GameState.ambientColor);
    OdysseyLightingBinder.setAreaSunAmbient(GameState.sunAmbientColor);
    OdysseyLightingBinder.setAreaSun(GameState.sunColor);
    OdysseyLightingBinder.setAreaSunDirection(GameState.sunDirection.x, GameState.sunDirection.y, GameState.sunDirection.z);

    GameState.currentLeader = undefined;
    GameState.playerFeetOffset = new THREE.Vector3(0,0,1);

    GameState.collisionList = [];
    GameState.walkmeshList = [];
    GameState.group = {
      creatures: namedGroup('creatures'),
      doors: namedGroup('doors'),
      placeables: namedGroup('placeables'),
      rooms: namedGroup('rooms'),
      grass: namedGroup('grass'),
      sounds: namedGroup('sounds'),
      triggers: namedGroup('triggers'),
      waypoints: namedGroup('waypoints'),
      party: namedGroup('party'),
      lights: namedGroup('lights'),
      light_helpers: namedGroup('light_helpers'),
      shadow_lights: namedGroup('shadow_lights'),
      path_helpers: namedGroup('path_helpers'),
      emitters: namedGroup('emitters'),
      effects: namedGroup('effects'),
      stunt: namedGroup('stunt'),
      weather_effects: namedGroup('weather_effects'),
      room_walkmeshes: namedGroup('room_walkmeshes'),
      spell_instances: namedGroup('spell_instances'),
      debug: namedGroup('debug'),
      collision_helpers: namedGroup('collision_helpers'),
    };

    GameState.scene.add(GameState.group.rooms);
    GameState.scene.add(GameState.group.grass);
    GameState.scene.add(GameState.group.placeables);
    GameState.scene.add(GameState.group.doors);
    GameState.scene.add(GameState.group.creatures);
    // GameState.scene.add(GameState.group.waypoints);
    // GameState.scene.add(GameState.group.sounds);
    GameState.scene.add(GameState.group.triggers);
    // GameState.scene.add(GameState.group.stunt);
    GameState.scene.add(GameState.group.weather_effects);

    GameState.scene.add(GameState.group.lights);
    // GameState.scene.add(GameState.group.emitters);
    GameState.scene.add(GameState.group.effects);

    GameState.scene.add(GameState.group.party);
    GameState.scene.add(GameState.group.spell_instances);
    GameState.scene.add(GameState.group.debug);
    GameState.group.debug.add(GameState.group.room_walkmeshes);
    GameState.group.debug.add(GameState.group.light_helpers);
    GameState.group.debug.add(GameState.group.shadow_lights);
    GameState.group.debug.add(GameState.group.path_helpers);
    GameState.group.debug.add(GameState.group.collision_helpers);
    GameState.group.room_walkmeshes.visible = this.debug[EngineDebugType.ROOM_WALKMESH] || this.debug[EngineDebugType.DOOR_WALKMESH] || this.debug[EngineDebugType.PLACEABLE_WALKMESH];
    GameState.group.light_helpers.visible = this.debug[EngineDebugType.LIGHT_HELPERS];
    GameState.group.shadow_lights.visible = this.debug[EngineDebugType.SHADOW_LIGHTS];
    GameState.group.path_helpers.visible = this.debug[EngineDebugType.PATH_FINDING];
    GameState.group.collision_helpers.visible = this.debug[EngineDebugType.COLLISION_HELPERS];

    GameState.interactableObjects = [
      GameState.group.placeables, 
      GameState.group.doors, 
      GameState.group.creatures, 
      GameState.group.party,
      //GameState.group.rooms
      GameState.group.room_walkmeshes
    ];

    GameState.scene_cursor_holder = new THREE.Group();
    GameState.scene_gui.add(GameState.scene_cursor_holder);

    //BEGIN: PostProcessing
    GameState.composer = new EffectComposer(GameState.renderer);
    // Enable stencil on composer targets for -equivalent shadow disks.
    // DepthTexture lets soft particles sample after an opaque split (WebGL2 blit path).
    const composerRT = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: true,
    };
    const w = GameState.ResolutionManager.getViewportWidth();
    const h = GameState.ResolutionManager.getViewportHeight();
    GameState.composer.renderTarget1 = new THREE.WebGLRenderTarget(w, h, composerRT);
    GameState.composer.renderTarget1.depthTexture = new THREE.DepthTexture(w, h);
    GameState.composer.renderTarget1.depthTexture.type = THREE.UnsignedShortType;
    GameState.composer.renderTarget2 = GameState.composer.renderTarget1.clone();
    if(!GameState.composer.renderTarget2.depthTexture){
      GameState.composer.renderTarget2.depthTexture = new THREE.DepthTexture(w, h);
      GameState.composer.renderTarget2.depthTexture.type = THREE.UnsignedShortType;
    }
    GameState.composer.writeBuffer = GameState.composer.renderTarget1;
    GameState.composer.readBuffer = GameState.composer.renderTarget2;
    GameState.renderPass = new RenderPass(GameState.scene, GameState.currentCamera);
    GameState.renderPassAA = new SSAARenderPass (GameState.scene, GameState.currentCamera);
    GameState.odysseyShaderPass = new OdysseyShaderPass();
    GameState.odysseyShaderPass.enabled = false;
    GameState.forceDistortionPass = new ForceDistortionPass();
    GameState.forceDistortionPass.enabled = false;
    GameState.overbrightenPass = new OverbrightenPass();
    GameState.overbrightenPass.enabled = false;
    GameState.convolutionBloomPass = new ConvolutionBloomPass();
    GameState.convolutionBloomPass.enabled = false;
    GameState.dreamDistortionPass = new DreamDistortionPass();
    GameState.dreamDistortionPass.enabled = false;
    GameState.furyPass = new FuryPass();
    GameState.furyPass.enabled = false;
    GameState.lensFlarePass = new OdysseyLensFlarePass();
    GameState.lensFlarePass.setLightsProvider(() => GameState.lightManager.getLensFlareLights());
    GameState.lensFlarePass.setCameraProvider(() => GameState.currentCamera);
    GameState.lensFlarePass.setAreaProvider(() => GameState.module?.area);
    GameState.lensFlarePass.setDeltaProvider(() => GameState.deltaTime || 0);
    GameState.miniGameAspectMaskPass = new MiniGameAspectMaskPass();
    GameState.miniGameAspectMaskPass.enabled = false;
    GameState.copyPass = new ShaderPass(CopyShader);
    GameState.renderPassGUI = new RenderPass(GameState.scene_gui, GameState.camera_gui);
    GameState.renderPassMGHud = new RenderPass(GameState.scene, GameState.currentCamera);
    // Swap camera layer mask for HUD-only draw after AccumulationBlurPass.
    const mgHudRender = GameState.renderPassMGHud.render.bind(GameState.renderPassMGHud);
    GameState.renderPassMGHud.render = (
      renderer: THREE.WebGLRenderer,
      writeBuffer: THREE.WebGLRenderTarget,
      readBuffer: THREE.WebGLRenderTarget,
      deltaTime: number,
      maskActive: boolean
    ) => {
      const cam = GameState.renderPassMGHud.camera as THREE.Camera | undefined;
      const prevMask = cam?.layers?.mask;
      if(cam){
        cam.layers.set(RenderLayer.MG_CAMERA_HUD);
      }
      mgHudRender(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
      if(cam && prevMask !== undefined){
        cam.layers.mask = prevMask;
      }
    };
    
    GameState.bloomPass = new BloomPass(0.5);
    GameState.bokehPass = new BokehPass(GameState.scene, GameState.currentCamera, {
      focus: 1.0,
      aperture:	0.0001,
      maxblur:	1.0,
      // width: ResolutionManager.getViewportWidth,
      // height: ResolutionManager.getViewportHeight
    });

    GameState.speedBlurPass = new AccumulationBlurPass(GameState.speedBlurRatio);
    GameState.speedBlurPass.enabled = false;

    GameState.renderPassAA.sampleLevel = 1;

    GameState.renderPass.renderToScreen = false;
    GameState.copyPass.renderToScreen = false;
    GameState.renderPassGUI.renderToScreen = false;
    GameState.renderPassMGHud.renderToScreen = false;

    GameState.renderPass.clear = true;
    GameState.bloomPass.clear = false;
    GameState.odysseyShaderPass.clear = false;
    GameState.renderPassAA.clear = false;
    GameState.copyPass.clear = false;
    GameState.renderPassGUI.clear = false;
    GameState.renderPassGUI.clearDepth = true;
    GameState.renderPassMGHud.clear = false;
    GameState.renderPassMGHud.clearDepth = true;
    GameState.renderPassMGHud.enabled = false;

    GameState.bokehPass.needsSwap = true;
    GameState.bokehPass.enabled = false;

    GameState.composer.addPass(GameState.renderPass);
    GameState.composer.addPass(GameState.speedBlurPass);
    // MG camera HUD after accumulation blur (screen-stable gauges).
    GameState.composer.addPass(GameState.renderPassMGHud);
    // FrameBufferModifications order before GUI:
    // 0x01 overbrighten (visualizePass1 off in shipping) →
    // 0x02 convolution (visualizePass2 on) → 0x20 force distortion →
    // film/sat (VideoEffects) → K2 dream → K2 fury
    GameState.composer.addPass(GameState.overbrightenPass);
    GameState.composer.addPass(GameState.convolutionBloomPass);
    GameState.composer.addPass(GameState.forceDistortionPass);
    GameState.composer.addPass(GameState.odysseyShaderPass);
    GameState.composer.addPass(GameState.dreamDistortionPass);
    GameState.composer.addPass(GameState.furyPass);
    // lens flare render after FrameBufferModifications, before GUI.
    GameState.composer.addPass(GameState.lensFlarePass);
    // Soft 4:3 cockpit mask for swoop/turret — after world FX, before GUI.
    GameState.composer.addPass(GameState.miniGameAspectMaskPass);
    // GameState.composer.addPass(GameState.bokehPass);
    // GameState.composer.addPass(GameState.renderPassAA);
    // GameState.composer.addPass(GameState.bloomPass);

    GameState.composer.addPass(GameState.renderPassGUI);
    GameState.composer.addPass(GameState.copyPass);

    GameState.renderPass.clearDepth = true;
    GameState.renderPassGUI.clearDepth = true;
    GameState.renderPass.clear = true;
    GameState.renderPassGUI.clear = false;
    GameState.renderPass.needsSwap = false;
    GameState.renderPassGUI.needsSwap = false;
    GameState.renderPassMGHud.needsSwap = false;

    /**
     * Initialize the game controls
     */
    GameState.controls = new IngameControls(GameState.currentCamera, GameState.canvas);

    /**
     * Initialize the FadeOverlayManager
     */
    GameState.FadeOverlayManager.Initialize();

    window.addEventListener('resize', () => {
      GameState.EventOnResize();
    });


    try{
      //init shaders
      PerformanceMonitor.start('ShaderManager.Init');
      GameState.ShaderManager.Init();
      PerformanceMonitor.stop('ShaderManager.Init');

      GameState.TutorialWindowTracker = [];

      /**
       * Initialize Audio for the GUI
       * INI Sound Options volumes are 0–100; GainNode expects 0–1 (same as GUI sliders).
       */
      const audioEngine = AudioEngine.GetAudioEngine();
      const iniVolumeToGain = (key: string) => {
        const raw = parseInt(GameState.iniConfig.getProperty(key)) || 0;
        return Math.max(0, Math.min(1, raw / 100));
      };
      AudioEngine.GAIN_MUSIC = iniVolumeToGain('Sound Options.Music Volume');
      AudioEngine.GAIN_VO = iniVolumeToGain('Sound Options.Voiceover Volume');
      AudioEngine.GAIN_SFX = iniVolumeToGain('Sound Options.Sound Effects Volume');
      AudioEngine.GAIN_GUI = iniVolumeToGain('Sound Options.Sound Effects Volume');
      AudioEngine.GAIN_MOVIE = iniVolumeToGain('Sound Options.Movie Volume');

      GameState.guiAudioEmitter = new AudioEmitter(audioEngine, AudioEngineChannel.GUI);
      GameState.guiAudioEmitter.maxDistance = 100;
      GameState.guiAudioEmitter.volume = 127;
      GameState.guiAudioEmitter.setPriorityGroupId(AudioPriorityGroup.GUI);
      GameState.guiAudioEmitter.load();
    
      GameState.audioEmitter = new AudioEmitter(audioEngine);
      GameState.audioEmitter.maxDistance = 50;
      GameState.audioEmitter.type = AudioEmitterType.GLOBAL;
      GameState.audioEmitter.setPriorityGroupId(AudioPriorityGroup.SCRIPTED_PLAYSOUND);
      GameState.audioEmitter.load();

      /**
       * Initialize the LightManager
       */
      GameState.lightManager.init(GameState);
      GameState.odysseyShadowManager.init(GameState.lightManager, GameState.scene);
      GameState.odysseyShadowManager.syncQualityFromLightManager();
      GameState.windManager.init(GameState);
      GameState.grassManager?.init(GameState);
      GameState.lightManager.setLightHelpersVisible(ConfigClient.get('GameState.debug.light_helpers') ? true : false);

      //AudioEngine.Unmute
      GameState.SetEngineMode(EngineMode.GUI);
      GameState.State = EngineState.RUNNING;
      GameState.inMenu = false;

      /**
       * Initialize the CursorManager
       */
      GameState.CursorManager.MenuManager = GameState.MenuManager;
      GameState.CursorManager.selected = undefined;
      GameState.CursorManager.hovered = undefined;
      await GameState.CursorManager.init();

      GameState.scene_cursor_holder.add( GameState.CursorManager.cursor );
      GameState.scene.add( GameState.CursorManager.reticle );
      GameState.scene.add( GameState.CursorManager.reticle2 );
      GameState.scene_gui.add( GameState.CursorManager.arrow );
      console.log('CursorManager: Complete');

      PerformanceMonitor.start('PartyManager.Initialize');
      GameState.PartyManager.Initialize();
      PerformanceMonitor.stop('PartyManager.Initialize');

      /**
       * Initialize the MenuManager
       */
      PerformanceMonitor.start('MenuManager.Init');
      GameState.MenuManager.Init();
      PerformanceMonitor.stop('MenuManager.Init');

      PerformanceMonitor.start('MenuManager.LoadMainGameMenus');
      await GameState.MenuManager.LoadMainGameMenus();
      PerformanceMonitor.stop('MenuManager.LoadMainGameMenus');

      /**
       * Preload the legal screen texture
       */
      if(GameState.GameKey == GameEngineType.TSL){
        await GameState.LegalScreenManager.Initialize();
      }

      /**
       * Preload fx textures
       */
      TextureLoader.enQueue(GameState.preloadTextures,
        undefined,
        TextureType.TEXTURE
      );
      void GameState.ensureForceDistortionTexture();

      // BeginIntro: K1 queues leclogo/biologo/legal BIKs; TSL queues
      // leclogo/obsidianent then legal screen texture, not a Legal movie.
      if(GameState.GameKey == GameEngineType.KOTOR){
        GameState.VideoManager.queueMovie('leclogo', true);
        GameState.VideoManager.queueMovie('biologo', true);
        GameState.VideoManager.queueMovie('legal', true);
      }else if(GameState.GameKey == GameEngineType.TSL){
        GameState.VideoManager.queueMovie('leclogo', true);
        GameState.VideoManager.queueMovie('obsidianent', true);
      }

      GameState.Ready = true;
      GameState.Start();
      // Shake is cached in CameraShakeManager.update; restore after render so it doesn't accumulate
      GameState.addEventListener('afterRender', () => GameState.CameraShakeManager.afterRender());
      console.log(PerformanceMonitor.toString());
    }catch(e){
      console.error(e);
    }
  }

  static Start(){

    if(GameState.Ready && !GameState.OnReadyCalled){
      GameState.OnReadyCalled = true;
      GameState.processEventListener('ready');
      window.dispatchEvent(new Event('resize'));

      if(GameState.forgePreviewHost){
        GameState.SetEngineMode(EngineMode.LOADING);
        GameState.State = EngineState.RUNNING;
        AudioEngine.Unmute(AudioEngineChannel.ALL);
        AudioEngine.Mute(AudioEngineChannel.MOVIE);
        GameState.Update();
        return;
      }

      // if(GameState.GameKey == GameEngineType.TSL){
      // GameState.SetEngineMode(EngineMode.LEGAL);
      // GameState.State = EngineState.RUNNING;
      // GameState.Update;
      // return;
      // }

      const onIntroComplete = () => {
        window.dispatchEvent(new Event('resize'));
        // TSL : after PlayMovieQueue, legal screen then main menu
        if(GameState.GameKey == GameEngineType.TSL){
          GameState.LegalScreenManager.Start();
          return;
        }
        GameState.MenuManager.MainMenu.Start();
        GameState.SetEngineMode(EngineMode.GUI);
        GameState.State = EngineState.RUNNING;
        AudioEngine.Unmute(AudioEngineChannel.ALL);
        AudioEngine.Mute(AudioEngineChannel.MOVIE);
      };

      GameState.VideoManager.playMovieQueue(onIntroComplete).catch((e) => {
        console.error(e);
        onIntroComplete();
      });
      //Start the game update loop
      GameState.Update();
    }
  }

  static EventOnResize(){
    GameState.ResolutionManager.recalculate();
    let width = asExtentInt(GameState.ResolutionManager.getViewportWidth());
    let height = asExtentInt(GameState.ResolutionManager.getViewportHeight());

    GameState.composer.setSize(width * GameState.rendererUpscaleFactor, height * GameState.rendererUpscaleFactor);

    GameState.FadeOverlayManager.plane.scale.set(width, height, 1);

    GameState.VideoManager.resize(width, height);

    const guiFrustum = orthoFrustumInt(width, height);
    GameState.camera_gui.left = guiFrustum.left;
    GameState.camera_gui.right = guiFrustum.right;
    GameState.camera_gui.top = guiFrustum.top;
    GameState.camera_gui.bottom = guiFrustum.bottom;

    GameState.camera_gui.updateProjectionMatrix();

    GameState.camera.aspect = width / height;
    GameState.camera.updateProjectionMatrix();

    GameState.renderer.setSize(width, height);  
    
    GameState.camera_dialog.aspect = GameState.camera.aspect;
    GameState.camera_dialog.updateProjectionMatrix();

    GameState.camera_animated.aspect = GameState.camera.aspect;
    GameState.camera_animated.updateProjectionMatrix();

    for(let i = 0; i < GameState.staticCameras.length; i++){
      GameState.staticCameras[i].aspect = GameState.camera.aspect;
      GameState.staticCameras[i].updateProjectionMatrix();
    }

    //GameState.bokehPass.renderTargetColor.setSize(width * GameState.rendererUpscaleFactor, height * GameState.rendererUpscaleFactor);

    GameState.screenCenter.x = ( (GameState.ResolutionManager.getViewportWidth()/2) / GameState.ResolutionManager.getViewportWidth() ) * 2 - 1;
    GameState.screenCenter.y = - ( (GameState.ResolutionManager.getViewportHeight()/2) / GameState.ResolutionManager.getViewportHeight() ) * 2 + 1; 

    GameState.MenuManager.Resize();

    GameState.depthTarget.setSize(GameState.ResolutionManager.getViewportWidth() * GameState.rendererUpscaleFactor, GameState.ResolutionManager.getViewportHeight() * GameState.rendererUpscaleFactor);
    GameState.syncDepthTargetTextureSize();

    if(GameState.ResolutionManager.vpScaleFactor && !GameState.forgePreviewHost){
      GameState.canvas.style.transform = 'scale('+GameState.ResolutionManager.vpScaleFactor+')';
    }else{
      GameState.canvas.style.transform = '';
    }

    if(GameState.forgePreviewHost){
      GameState.applyForgePreviewCanvasLayout();
    }

  }

  static updateRendererUpscaleFactor(){
    this.EventOnResize();
  }

  public static getCurrentPlayer(): ModuleCreature {
    if(GameState.Mode == EngineMode.MINIGAME){
      return GameState.module.area.miniGame.player as any;
    }
    let p = GameState.PartyManager.party[0];
    return p ? p : GameState.PartyManager.Player;
  }

  static ResetModuleAudio(){                        
    GameState.CutsceneManager.audioEmitter = 
    this.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine(), AudioEngineChannel.VO);
    // this.audioEmitter.maxDistance = 50;
    this.audioEmitter.type = AudioEmitterType.GLOBAL;
    // dialog VO uses One_Shot_Streams (group 3), not Unmaskable.
    this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.ONE_SHOT_STREAMS);
    this.audioEmitter.load();
    AudioEngine.ensureGameBusesAudible();
  }

  /**
   * door/trigger area transition: StartGlobalFade(0, wait=0, length=0.5)
   * then load after the fade. Skips the pre-fade if a load is already in progress.
   */
  static LoadModuleWithAreaTransitionFade(name = '', waypoint: string = null){
    if(GameState.loadingModule || GameState.areaTransitionPending){
      return;
    }
    if(!name){
      return;
    }
    // door/trigger EventHandler → SetTransitionPending(1, nextId) before fade/load
    if(GameState.module?.area){
      GameState.module.area.setTransitionPending(true);
    }
    GameState.areaTransitionPending = true;
    const length = GameState.FadeOverlayManager.AREA_TRANSITION_FADE_LENGTH;
    GameState.FadeOverlayManager.FadeOut(length, 0, 0, 0, 0);
    const delayMs = Math.max(0, length) * 1000;
    setTimeout(() => {
      GameState.areaTransitionPending = false;
      void GameState.LoadModule(name, waypoint);
    }, delayMs);
  }

  /**
   * Pass AI — fade then LoadModule, spawning at absolute XYZ (JumpToLocation cross-module).
   */
  static LoadModuleWithJumpSpawn(
    name: string,
    spawn: { x: number; y: number; z: number; ox: number; oy: number }
  ){
    if(GameState.loadingModule || GameState.areaTransitionPending){
      return;
    }
    if(!name){
      return;
    }
    GameState.pendingJumpSpawn = { ...spawn };
    GameState.LoadModuleWithAreaTransitionFade(name, null);
  }

  /**
   * Load a module
   * @param name 
   * @param waypoint - The waypoint to spawn the player at (if null, the player will spawn at the entry waypoint)
   * @param sMovie1 - The first movie to play
   * @param sMovie2 - The second movie to play
   * @param sMovie3 - The third movie to play
   * @param sMovie4 - The fourth movie to play
   * @param sMovie5 - The fifth movie to play
   * @param sMovie6 - The sixth movie to play
   */
  static async LoadModule(name = '', waypoint: string = null, sMovie1 = '', sMovie2 = '', sMovie3 = '', sMovie4 = '', sMovie5 = '', sMovie6 = ''){
    try{
      if(GameState.loadingModule){
        return;
      }
      EventManager.FireEvent('module.load', {
        name: name,
        waypoint: waypoint?.toString(),
        sMovie1: sMovie1,
        sMovie2: sMovie2,
        sMovie3: sMovie3,
        sMovie4: sMovie4,
        sMovie5: sMovie5,
        sMovie6: sMovie6
      });
      GameState.loadingModule = true;
      // Destination ARE not loaded yet — fall back to load_<module> / loadscreens row / custom
      const loadBg = consumeAreaTransitionLoadBackground(name, 0);
      await GameState.MenuManager.LoadScreen.setLoadBackground(loadBg);
      // Clear any leftover K2 hold so the load cover FadeOut is not blocked.
      GameState.FadeOverlayManager.holdForScript = false;
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);
      /**
       * Set the game mode to loading
       */
      GameState.SetEngineMode(EngineMode.LOADING);
      GameState.MenuManager.ClearMenus();

      GameState.UnloadModule();
      // Re-assert black cover after unload (UnloadModule clears fade state).
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);

      GameState.MenuManager.LoadScreen.setProgress(0);
      GameState.MenuManager.LoadScreen.showRandomHint();
      GameState.MenuManager.LoadScreen.open();

      await GameState.MenuManager.LoadInGameMenus();
      
      GameState.VideoEffectManager.SetVideoEffect(-1);
      GameState.ModuleObjectManager.playerSelectableObjects = [];
      GameState.VideoManager.queueMovie(sMovie1, true);
      GameState.VideoManager.queueMovie(sMovie2, true);
      GameState.VideoManager.queueMovie(sMovie3, true);
      GameState.VideoManager.queueMovie(sMovie4, true);
      GameState.VideoManager.queueMovie(sMovie5, true);
      GameState.VideoManager.queueMovie(sMovie6, true);
      GameState.SetEngineMode(EngineMode.LOADING);
      
      if(GameState.module){
        // StallEventSaveGame → SaveModuleStart sets is_save_game = 1
        // TransPending remains set from LoadModuleWithAreaTransitionFade until after stall save
        // Skip stall-save when restoring a save (isLoadingSave) — GAMEINPROGRESS already extracted
        if(!GameState.isLoadingSave){
          try{ await GameState.module.save(true); }catch(e){
            console.error(e);
          }
          // StartNewModule: DoModuleEnterSaveCleanup then AutoSaveOnEnteringModule → DoPCAutosave
          try{
            await ModuleSaveTable.doModuleEnterSaveCleanup(name);
            if(ModuleSaveTable.shouldAutoSaveOnEnteringModule(name)){
              await SaveGame.AutoSaveOnModuleEnter(name);
            }
          }catch(e){
            console.error(e);
          }
        }
        if(GameState.module.area){
          GameState.module.area.setTransitionPending(false);
        }
        try{ GameState.module.dispose(); }catch(e){
          console.error(e);
        }
      }

      //Remove all cached scripts and kill all running instances
      GameState.NWScript.Reload();

      //Resets all keys to their default state
      GameState.controls.initKeys();

      await GameState.FactionManager.Load();

      const module = await GameState.Module.Load(name, waypoint);
      GameState.module = module;
      GameState.scene.visible = false;

      console.log('Module.loadScene');
      await module.loadScene();

      await TextureLoader.LoadQueue( (ref: ITextureLoaderQueuedRef) => {
        const material = ref.material as any;
        if(material?.map){
          GameState.renderer.initTexture(material.map);
        }
      });

      try {
        collapseAreaRoomLightmaps(module.area?.rooms || []);
      }catch(e){
        console.warn('Lightmap atlas collapse failed', e);
      }

      // Full GPU warm-up under LoadScreen: maps/lightmaps/env/bump/grass + programs.
      // Moves first-visible stalls off gameplay VIS / frustum reveals.
      const rooms = module.area?.rooms || [];
      warmRoomGpuResources(rooms, GameState.renderer);
      if(GameState.currentCamera){
        compileAreaRoomsVisible(rooms, GameState.renderer, GameState.scene, GameState.currentCamera);
      }

      module.initEventQueue();

      console.log('Module.initScripts');
      await module.initScripts();

      //GameState.scene_gui.background = null;
      GameState.scene.visible = true;
      
      AudioEngine.Unmute();
      VideoManager.playMovieQueue( async () => {
        const runSpawnScripts = !GameState.isLoadingSave;
        GameState.isLoadingSave = false;

        GameState.ResetModuleAudio();

        GameState.renderer.setClearColor( new THREE.Color(GameState.module.area.sun.fogColor) );
        
        console.log('ModuleArea.initAreaObjects');
        // minigame areas: no party InGame HUD (swoop/turret).
        if(GameState.module.area.miniGame){
          GameState.SetEngineMode(EngineMode.MINIGAME);
        }else{
          GameState.MenuManager.InGameOverlay.recalculatePosition();
          GameState.MenuManager.InGameOverlay.open();
          GameState.SetEngineMode(EngineMode.INGAME);
          // Pass AE: PT_LAST_GUI_PNL — reopen death panel (GUI_PANEL_PLAYER_DEATH = 0)
          const lastGui = GameState.PartyManager?.LastGuiPanel | 0;
          const pc = GameState.PartyManager?.party?.[0];
          if(lastGui === 0 && pc?.isDead?.()){
            GameState.GameOverManager?.PopUpGUIPanel?.(pc, 0);
          }
        }
        await GameState.module.area.initAreaObjects(runSpawnScripts);
        console.log('ModuleArea: ready to play');
        GameState.module.readyToProcessEvents = true;
        // Snap camera + VIS/frustum before load UI hides (first world frame ready)
        GameState.module.area.primePostLoadReveal();

        if(GameState.Mode == EngineMode.INGAME){
          const anyCanLevel = GameState.PartyManager.party.some((p) => p.canLevelUp());
          if(anyCanLevel){
            GameState.audioEmitter.playSound('gui_level');
          }
        }

        //Reveal the area — MainLoop StartGlobalFade(1, wait=0.5, length=1.0)
        // FadeIn before LoadScreen.close so the fade plane is already opaque FADING_IN.
        AudioEngine.clearSoundModeStack();
        GameState.applyPostLoadRevealFade();
        // MainLoop after StartSounds: SetSoundMode(0) again (clears BusyWait mute under load).
        GameState.MenuManager.LoadScreen.close();
        GameState.module.area.updateDayNightCycle();
        GameState.module.area.musicBackgroundPlay();
        GameState.module.area.ambientSoundPlay();
        GameState.loadingModule = false;
      });
    }catch(e){
      GameState.loadingModule = false;
      console.error(e);
      throw e;
    }
  }

  /**
   * Initialize GameState for Forge module preview (no MainMenu / legal movies).
   * Safe to call again to reparent the canvas into a new host element.
   */
  static async InitForForgePreview(host: HTMLElement): Promise<void> {
    GameState.forgePreviewHost = true;
    GameState.setDOMElement(host);
    GameState.ResolutionManager.setViewportHost(host);
    GameState.attachForgePreviewResizeObserver(host);

    if(GameState.Ready && GameState.canvas){
      if(GameState.canvas.parentElement !== host){
        host.appendChild(GameState.canvas);
      }
      GameState.applyForgePreviewCanvasLayout();
      GameState.EventOnResize();
      GameState.ensureGuiListHexTextures();
      return;
    }
    await GameState.Init();
    GameState.ensureGuiListHexTextures();
    if(GameState.canvas){
      if(GameState.canvas.parentElement !== host){
        host.appendChild(GameState.canvas);
      }
      GameState.applyForgePreviewCanvasLayout();
      GameState.EventOnResize();
    }
  }

  /** AppState loads these for the full game; Forge preview must as well. */
  static ensureGuiListHexTextures(): void {
    if(GUIListBox.hexTextures?.size){ return; }
    GUIListBox.InitTextures?.();
  }

  /** Size/position the play canvas to the preview host without CSS stretch. */
  static applyForgePreviewCanvasLayout(): void {
    if(!GameState.canvas || !GameState.domElement){
      return;
    }
    const w = Math.max(1, GameState.domElement.clientWidth);
    const h = Math.max(1, GameState.domElement.clientHeight);
    GameState.canvas.style.setProperty('width', `${w}px`);
    GameState.canvas.style.setProperty('height', `${h}px`);
    GameState.canvas.style.setProperty('display', 'block');
    GameState.canvas.style.setProperty('position', 'absolute');
    GameState.canvas.style.setProperty('left', '0');
    GameState.canvas.style.setProperty('top', '0');
    GameState.canvas.style.removeProperty('transform');
  }

  static attachForgePreviewResizeObserver(host: HTMLElement): void {
    GameState.detachForgePreviewResizeObserver();
    if(typeof ResizeObserver === 'undefined'){
      return;
    }
    GameState.forgePreviewResizeObserver = new ResizeObserver(() => {
      if(!GameState.forgePreviewHost || GameState.ResolutionManager.viewportHost !== host){
        return;
      }
      GameState.ResolutionManager.syncWindowResolutionFromHost();
      GameState.ResolutionManager.recalculate();
      GameState.applyForgePreviewCanvasLayout();
      GameState.EventOnResize();
    });
    GameState.forgePreviewResizeObserver.observe(host);
  }

  static detachForgePreviewResizeObserver(): void {
    if(GameState.forgePreviewResizeObserver){
      GameState.forgePreviewResizeObserver.disconnect();
      GameState.forgePreviewResizeObserver = null;
    }
  }

  /** Tear down Forge preview viewport binding (call on Exit Preview). */
  static clearForgePreviewViewport(): void {
    GameState.detachForgePreviewResizeObserver();
    GameState.forgePreviewHost = false;
    GameState.ResolutionManager.setViewportHost(null);
    GameState.ResolutionManager.recalculate();
  }

  /**
   * Load a module from in-memory archives (Forge playable preview).
   * Skips intro movies and does not write a save on dispose of prior module.
   */
  static async LoadModuleFromArchives(archives: any[], waypoint: string = null, modName = 'preview'){
    try{
      if(GameState.loadingModule){
        return;
      }
      EventManager.FireEvent('module.load', {
        name: modName,
        waypoint: waypoint?.toString(),
        preview: true,
      });
      GameState.loadingModule = true;
      try{
        await GameState.MenuManager.LoadScreen.setLoadBackground('load_'+modName);
      }catch(e){
        console.warn('LoadModuleFromArchives: load background', e);
      }
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);
      GameState.SetEngineMode(EngineMode.LOADING);
      GameState.MenuManager.ClearMenus();

      GameState.UnloadModule();
      // Re-assert black cover after unload (UnloadModule clears fade state).
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);

      try{
        GameState.MenuManager.LoadScreen.setProgress(0);
        GameState.MenuManager.LoadScreen.open();
      }catch(e){
        console.warn('LoadModuleFromArchives: load screen', e);
      }

      try{
        await GameState.MenuManager.LoadInGameMenus();
      }catch(e){
        console.warn('LoadModuleFromArchives: LoadInGameMenus', e);
      }

      GameState.VideoEffectManager.SetVideoEffect(-1);
      GameState.ModuleObjectManager.playerSelectableObjects = [];
      GameState.SetEngineMode(EngineMode.LOADING);

      if(GameState.module){
        try{ GameState.module.dispose(); }catch(e){
          console.error(e);
        }
        GameState.module = undefined as any;
      }

      GameState.NWScript.Reload();
      GameState.controls.initKeys();
      await GameState.FactionManager.Load();

      if(!GameState.PartyManager.PlayerTemplate){
        GameState.PartyManager.PlayerTemplate = GameState.PartyManager.GeneratePlayerTemplate();
        GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
      }

      const module = await GameState.Module.LoadFromArchives(archives, waypoint, modName);
      if(!module?.area){
        throw new Error('Failed to load module from archives');
      }
      GameState.module = module;
      GameState.scene.visible = false;

      await module.loadScene();

      await TextureLoader.LoadQueue( (ref: ITextureLoaderQueuedRef) => {
        const material = ref.material as any;
        if(material?.map){
          GameState.renderer.initTexture(material.map);
        }
      });

      try {
        collapseAreaRoomLightmaps(module.area?.rooms || []);
      }catch(e){
        console.warn('Lightmap atlas collapse failed', e);
      }

      const rooms = module.area?.rooms || [];
      warmRoomGpuResources(rooms, GameState.renderer);
      if(GameState.currentCamera){
        compileAreaRoomsVisible(rooms, GameState.renderer, GameState.scene, GameState.currentCamera);
      }

      module.initEventQueue();
      await module.initScripts();

      GameState.scene.visible = true;
      AudioEngine.Unmute();

      const runSpawnScripts = true;
      GameState.isLoadingSave = false;
      GameState.ResetModuleAudio();

      try{
        GameState.MenuManager.InGameOverlay.recalculatePosition();
        GameState.MenuManager.InGameOverlay.open();
      }catch(e){
        console.warn('LoadModuleFromArchives: overlay', e);
      }

      GameState.renderer.setClearColor( new THREE.Color(GameState.module.area.sun.fogColor) );

      GameState.SetEngineMode(GameState.module.area.miniGame ? EngineMode.MINIGAME : EngineMode.INGAME);
      await GameState.module.area.initAreaObjects(runSpawnScripts);
      GameState.module.readyToProcessEvents = true;
      GameState.module.area.primePostLoadReveal();
      GameState.applyPostLoadRevealFade();
      try{ GameState.MenuManager.LoadScreen.close(); }catch(e){}
      GameState.module.area.musicBackgroundPlay();
      GameState.loadingModule = false;
      GameState.canvas?.focus();
    }catch(e){
      GameState.loadingModule = false;
      console.error(e);
      throw e;
    }
  }

  static RestoreEnginePlayMode(): void {
    if(GameState.module){
      if(GameState.module.area.miniGame){
        console.log('RestoreEnginePlayMode: MINIGAME');
        GameState.SetEngineMode(EngineMode.MINIGAME)
      }else{
        console.log('RestoreEnginePlayMode: INGAME');
        GameState.SetEngineMode(EngineMode.INGAME);
      }
    }else{
      console.log('RestoreEnginePlayMode: GUI');
      GameState.SetEngineMode(EngineMode.GUI);
    }
  }

  static SetEngineMode(mode: EngineMode){
    if(GameState.Mode == mode){
      return;
    }
    const prev = GameState.Mode;
    console.log('SetEngineMode: ', mode);
    GameState.Mode = mode;

    // Force dialog PVS recompute on enter (camera room may differ from player).
    if(mode == EngineMode.DIALOG && prev != EngineMode.DIALOG){
      if(GameState.module?.area){
        GameState.module.area.lastRoom = undefined;
      }
    }

    // Freelook camera enter/exit
    if(mode == EngineMode.FREELOOK && prev != EngineMode.FREELOOK){
      FollowerCamera.beginFreeLook();
    }else if(prev == EngineMode.FREELOOK && mode != EngineMode.FREELOOK){
      FollowerCamera.endFreeLook();
    }

    if(mode == EngineMode.LOADING){
      if(GameState.MenuManager.LoadScreen){
        GameState.MenuManager.LoadScreen.setProgress(0);
        GameState.MenuManager.LoadScreen.open();
      }
    }

    if(mode != EngineMode.INGAME){
      if(GameState.MenuManager.InGameBark)
        GameState.MenuManager.InGameBark.close();
  
      if(GameState.MenuManager.InGameAreaTransition)
        GameState.MenuManager.InGameAreaTransition.hideAreaTransition();
    }

    // Minigame: keep party InGameOverlay off the menu stack so GUI pop
    // (options etc.) cannot reshow the HUD via Remove → show.
    if(mode == EngineMode.MINIGAME){
      const overlay = GameState.MenuManager.InGameOverlay;
      if(overlay && (overlay.isVisible() || GameState.MenuManager.activeMenus.indexOf(overlay) >= 0)){
        overlay.close();
      }
    }else{
      if(prev == EngineMode.MINIGAME){
        FollowerCamera.detachMinigameCamera();
        // MG scripts may leave SWMG_SetSpeedBlurEffect on; Force Speed VFX keeps it.
        if(GameState.motionBlurVFXCount <= 0){
          GameState.SetSpeedBlurEffect(false);
        }
      }
      if(mode == EngineMode.INGAME && GameState.module && !GameState.module.area?.miniGame){
        const overlay = GameState.MenuManager.InGameOverlay;
        if(overlay && GameState.MenuManager.activeMenus.indexOf(overlay) < 0){
          overlay.recalculatePosition();
          overlay.open();
        }
      }
    }

    if(!(mode == EngineMode.INGAME || mode == EngineMode.DIALOG || mode == EngineMode.FREELOOK || mode == EngineMode.MINIGAME)){
      AudioEngine.Mute(AudioEngineChannel.SFX);
    }

    if(mode == EngineMode.INGAME || mode == EngineMode.DIALOG || mode == EngineMode.FREELOOK || mode == EngineMode.MINIGAME){
      AudioEngine.Unmute(AudioEngineChannel.SFX);
    }

    if(mode == EngineMode.GUI && GameState.FadeOverlayManager.material.visible){
      GameState.FadeOverlayManager.material.visible = false;
    }
  }

  static UnloadModule(){
    if(GameState.module){
      EventManager.FireEvent('module.unload', {
        name: GameState.module.name
      });
    }
    GameState.GameOverManager?.Reset?.();
    GameState.MenuManager.ClearMenus();
    GameState.deltaTime = 0;
    // GameState.initTimers;
    ResourceLoader.clearCache();

    GameState.scene.visible = false;
    GameState.SetEngineMode(EngineMode.LOADING);
    GameState.ModuleObjectManager.Reset();
    GameState.renderer.setClearColor(new THREE.Color(0, 0, 0));
    GameState.AlphaTest = 0;
    GameState.holdWorldFadeInForDialog = false;
    GameState.areaTransitionPending = false;
    GameState.FadeOverlayManager.Reset();
    // SWMG_SetSpeedBlurEffect / Force Speed leave AurEnableSpeedBlur set; clear so
    // AccumulationBlurPass does not smear the next module (AurDisableSpeedBlur).
    GameState.motionBlurVFXCount = 0;
    GameState.SetSpeedBlurEffect(false);
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.enabled = false;
    }
    const audioEngine = AudioEngine.GetAudioEngine();
    audioEngine.reset();

    GameState.lightManager.clearLights();
    GameState.windManager.clear();
    GameState.grassManager?.clear();

    GameState.CursorManager.selected = undefined;
    GameState.CursorManager.selectedObject = undefined;
    GameState.CursorManager.hovered = undefined;
    GameState.CursorManager.hoveredObject = undefined;

    GameState.staticCameras = [];
    GameState.CutsceneManager.clearOnModuleUnload();

    AudioEngine.Mute();
  }

  /**
   * After primePostLoadReveal: world FadeIn unless hold or dialog already active.
   * Forces hold when dialog is active so the deferred first entry releases with
   * HOLD_WORLD_FADE_IN_*. Re-enables dialog send and flushes any queued entry.
   */
  static applyPostLoadRevealFade(): void {
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: GameState.holdWorldFadeInForDialog,
      cutsceneActive: !!GameState.CutsceneManager?.active,
      mode: GameState.Mode,
    });
    if(plan.forceHold){
      GameState.holdWorldFadeInForDialog = true;
    }
    if(plan.assertDialogMode){
      GameState.SetEngineMode(EngineMode.DIALOG);
    }
    if(plan.startWorldFadeIn){
      GameState.FadeOverlayManager.FadeIn(
        GameState.FadeOverlayManager.WORLD_FADE_IN_LENGTH,
        0, 0, 0,
        GameState.FadeOverlayManager.WORLD_FADE_IN_WAIT
      );
    }
    // After hold/fade decision: allow entry send and flush queued first entry.
    GameState.CutsceneManager?.enableDialogSendAndFlush?.();
  }

  static ReloadTextureCache(){
    if(GameState.module && GameState.module.area){
      GameState.module.area.reloadTextures();
    }
  }

  static getCameraById(id = 0): THREE.PerspectiveCamera | undefined {
    for(let i = 0; i < GameState.staticCameras.length; i++){
      if(GameState.staticCameras[i].userData.ingameID == id)
        return GameState.staticCameras[i];
    }
    return undefined;
  }

  static forwardVector = new THREE.Vector3(0, 0, );

  /**
   * Graphics Options.V-Sync — defaults to off to match swkotor*-config.
   */
  static isVSyncEnabled(): boolean {
    if(!GameState.iniConfig) return false;
    const raw = GameState.iniConfig.getProperty('Graphics Options.V-Sync');
    if(raw === undefined || raw === null || raw === '') return false;
    return String(raw) !== '0';
  }

  private static clearScheduledUpdate(): void {
    if(GameState.updateRafId){
      cancelAnimationFrame(GameState.updateRafId);
      GameState.updateRafId = 0;
    }
    if(GameState.updateTimeoutId){
      clearTimeout(GameState.updateTimeoutId);
      GameState.updateTimeoutId = 0;
    }
  }

  /**
   * Schedule the next game tick: RAF when V-Sync is on; setTimeout(0) when off
   * for uncapped rate while still yielding so input and paint are not starved.
   * (MessageChannel is intentionally avoided — it can push 400+ FPS and starve the event loop.)
   */
  static scheduleNextUpdate(): void {
    const generation = GameState.updateLoopGeneration;
    GameState.clearScheduledUpdate();
    if(GameState.isVSyncEnabled()){
      GameState.updateRafId = requestAnimationFrame(() => {
        GameState.updateRafId = 0;
        if(generation !== GameState.updateLoopGeneration) return;
        GameState.Update();
      });
    }else{
      GameState.updateTimeoutId = setTimeout(() => {
        GameState.updateTimeoutId = 0;
        if(generation !== GameState.updateLoopGeneration) return;
        GameState.Update();
      }, 0) as unknown as number;
    }
  }

  /**
   * Called after Graphics Options.V-Sync is written so a pending RAF/timeout
   * tick does not double-fire under the old mode.
   */
  static applyVSyncOption(): void {
    GameState.updateLoopGeneration++;
    GameState.clearScheduledUpdate();
    // Re-arm immediately so toggling mid-session does not stall until the next tick.
    GameState.scheduleNextUpdate();
  }

  static Update(){
    
    GameState.scheduleNextUpdate();
    GameState.stats.begin();

    GameState.forwardVector.set(0, 0, -1);
    GameState.shadowSystemsUpdatedThisFrame = false;

    GameState.clock.update();
    const delta = GameState.clock.getDelta();
    GameState.processEventListener('beforeRender', [delta]);
    GameState.delta = delta;
    GameState.deltaTime += delta;
    // Wall-clock advance so menu/void shaders stay real-time at any FPS.
    GameState.deltaTimeFixed += delta;

    /**
     * Soft debugger freeze: still process controls, menus, audio, and render,
     * but skip world / script simulation while paused. Resume Continue/Step here
     * (not inside the BroadcastChannel handler) so long scripts do not block IPC.
     */
    if(GameState.debugMode && GameState.Debugger.pendingResume){
      GameState.processPendingDebuggerResume();
    }

    if(GameState.debugMode && GameState.Debugger.state !== DebuggerState.Idle){
      GameState.controls.Update(delta);
      GameState.MenuManager.Update(delta);
      AudioEngine.GetAudioEngine().update(delta, GameState.currentCamera.position, GameState.currentCamera.rotation, GameState.forwardVector);
      GameState.Render(delta);
      GameState.stats.end();
      GameState.processEventListener('afterRender', [delta]);
      return;
    }

    GameState.controls.Update(delta);
    GameState.scene_cursor_holder.visible =
      GameState.Mode != EngineMode.MOVIE &&
      GameState.Mode != EngineMode.LEGAL &&
      !GameState.controls?.controllerHidesCursor;
    if(GameState.Mode == EngineMode.MOVIE || GameState.VideoManager.isMoviePlaying()){
      GameState.Mode = EngineMode.MOVIE;
      GameState.UpdateMovie(delta);
      return;
    }

    if(GameState.Mode == EngineMode.LEGAL){
      GameState.UpdateLegal(delta);
      return;
    }

    GameState.VideoEffectManager.Update(delta);
    // CycleTIDTextureController — once per rendered frame
    TextureAnimationManager.update(delta);

    GameState.MenuManager.Update(delta);

    if(!GameState.loadingTextures && TextureLoader.queue.length){
      GameState.loadingTextures = true;
      TextureLoader.LoadQueue().then( () => {
        GameState.loadingTextures = false;
      });
    } 

    if(GameState.MenuManager.InGamePause)
      GameState.MenuManager.InGamePause.hide();

    switch(GameState.Mode){
      case EngineMode.LOADING:
        break;
      case EngineMode.GUI:
        GameState.UpdateGUI(delta);
        break;
      case EngineMode.INGAME:
        GameState.UpdateIngame(delta);
        break;
      case EngineMode.DIALOG:
        GameState.UpdateDialog(delta);
        break;
      case EngineMode.MINIGAME:
        GameState.UpdateMinigame(delta);
        break;
      case EngineMode.FREELOOK:
        GameState.UpdateFreeLook(delta);
        break;
    }

    // Advance fade on the common path when covering the world — avoids stall if
    // Mode is wrong while the overlay still obscures (single Update, no double-step).
    if(
      GameState.FadeOverlayManager.isFading() ||
      GameState.FadeOverlayManager.isObscuring()
    ){
      GameState.FadeOverlayManager.Update(delta);
    }

    // MainLoop: UpdateAreaTransitionGUI after world/object updates.
    if(GameState.MenuManager.InGameAreaTransition)
      GameState.MenuManager.InGameAreaTransition.updateAreaTransitionGUI();

    AudioEngine.GetAudioEngine().update(delta, GameState.currentCamera.position, GameState.currentCamera.rotation, GameState.forwardVector);

    GameState.Render(delta);

    //NoClickTimer: Update
    if( ((GameState.Mode == EngineMode.MINIGAME || GameState.Mode == EngineMode.DIALOG) || (GameState.Mode == EngineMode.INGAME)) && GameState.State != EngineState.PAUSED){
      if(GameState.noClickTimer){
        GameState.noClickTimer -= (1 * delta);
        if(GameState.noClickTimer < 0){
          GameState.noClickTimer = 0;
        }
      }
    }

    GameState.stats.end();
    GameState.processEventListener('afterRender', [delta]);
  }

  static UpdateMovie(delta: number = 0){
    GameState.VideoManager.update(delta);
    GameState.renderer.render(GameState.scene_movie, GameState.camera_gui);
    GameState.stats.end();
    GameState.processEventListener('afterRender', [delta]);
  }

  static UpdateGUI(delta: number = 0){
    //NOP
  }

  /**
   * Rebuild viewport frustum / camera position from the live camera locals.
   * Must run after FollowerCamera (or any camera pose write) — otherwise
   * matrixWorldInverse stays on the previous render pose and objects cull wrong while turning.
   */
  static updateViewportFrustum(){
    if(!GameState.currentCamera) return;
    GameState.currentCamera.updateMatrixWorld();
    GameState.frustumMat4.multiplyMatrices(
      GameState.currentCamera.projectionMatrix,
      GameState.currentCamera.matrixWorldInverse
    );
    GameState.viewportFrustum.setFromProjectionMatrix(GameState.frustumMat4);
    GameState.currentCameraPosition.set(0, 0, 0);
    GameState.currentCameraPosition.applyMatrix4(GameState.currentCamera.matrixWorld);
  }

  static updateShadowSystems(_delta: number, focus?: THREE.Vector3){
    if(!GameState.areShadowsEnabled()){ return; }
    GameState.odysseyShadowManager?.update(
      GameState.currentCamera ?? undefined,
      focus ?? GameState.lightManager?.focusPosition,
      _delta
    );
    GameState.shadowSystemsUpdatedThisFrame = true;
  }

  static UpdateIngame(delta: number = 0){
    // MainLoop: UpdateRoom(pos) before DoPassiveSelection
    if(GameState.module?.readyToProcessEvents && GameState.module.area){
      GameState.module.area.updateRoomVisibility(0);
    }

    //Get Selectable Objects In Range (gated on fade inside TickSelectableObjects)
    GameState.ModuleObjectManager.TickSelectableObjects(delta);

    // Party-leader dialog waits on IsGlobalFading then swaps PC into the
    // leader slot — still INGAME until startConversation resumes after fade-out.
    GameState.CutsceneManager.tickPendingPartyDialogSwitch();

    //Update Mode Camera
    //Make sure we are using the follower camera while ingame
    GameState.currentCamera = GameState.camera;
    GameState.VideoEffectManager.SetVideoEffect(-1);
    if(GameState.getCurrentPlayer()){
      GameState.forwardVector.copy(GameState.getCurrentPlayer().forceVector).multiplyScalar(100);
      GameState.forwardVector.z = -1;
    }

    // Death sequence: slow world time (UpdateDeathSequence → SetGameSpeed)
    GameState.GameOverManager.UpdateDeathSequence(delta);
    // Cap hitch frames so movement / collision cannot tunnel walls or trip stuck teleports
    const MAX_SIM_DELTA = 0.1;
    const simDelta = Math.min(
      delta * (GameState.timeScale > 0 ? GameState.timeScale : 1),
      MAX_SIM_DELTA
    );

    if(GameState.State != EngineState.PAUSED){
      GameState.updateTime(simDelta);
    }

    //Handle Module Tick
    if(
      GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length
    ){
      GameState.module.tickPaused(simDelta);
    }else{
      GameState.module.tick(simDelta);

      //Update the Bark Overlay if it is visible
      if(GameState.MenuManager.InGameBark?.bVisible){
        GameState.MenuManager.InGameBark.update(delta);
      }
    }

    // Party wipe / combat-clear resurrect (TempDeathUpdate) — wall-clock delta
    GameState.GameOverManager.TempDeathUpdate(delta);

    // UpdateAutoSaveTimer — drives AutoSaveOnEnter=yes on next module transition
    if(GameState.State != EngineState.PAUSED && !GameState.isLoadingSave){
      ModuleSaveTable.updateAutoSaveTimer(delta);
    }

    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.getCurrentPlayer());
    GameState.updateShadowSystems(delta, GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
    
    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: true });
  }

  static UpdateDialog(delta: number = 0){
    if(GameState.State != EngineState.PAUSED){
      GameState.updateTime(delta);
    }
    const isEntryMode = GameState.MenuManager.InGameDialog.isVisible() && !GameState.MenuManager.InGameDialog.LB_REPLIES.isVisible() && GameState.scene_cursor_holder.visible;
    if(isEntryMode){
      GameState.scene_cursor_holder.visible = false;
    }
    // MainLoop: UpdateCamera before UpdateRoom so dialog room cull
    // probes the current shot pose, not the previous frame's.
    GameState.CutsceneManager.update(delta);
    // World timer keeps running in dialog unless paused (same policy as freelook).
    if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
      GameState.module.tickPaused(delta);
    }else{
      GameState.module.tick(delta);
    }
    if(GameState.MenuManager.InGameBark?.bVisible){
      GameState.MenuManager.InGameBark.update(delta);
    }
    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.currentCamera);
    GameState.updateShadowSystems(delta, GameState.currentCamera?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
    
    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: true });
  }

  static UpdateMinigame(delta: number = 0){
    if(GameState.State != EngineState.PAUSED){
      GameState.updateTime(delta);
    }

    // Minigames run inside the area; keep module/calendar ticking unless paused.
    if(GameState.module){
      if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
        GameState.module.tickPaused(delta);
      }else{
        GameState.module.tick(delta);
      }
    }

    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.getCurrentPlayer());
    GameState.updateShadowSystems(delta, GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: false });
  }

  static UpdateFreeLook(delta: number = 0){
    // Freelook camera — video effect from appearance.freelookeffect
    GameState.VideoEffectManager.SetVideoEffect(-1);
    const player = GameState.getCurrentPlayer();
    if(player){
      const appearance = player.getAppearance();
      if(appearance){
        const effectId = appearance.freelookeffect;
        if(!isNaN(effectId) && effectId >= 0){
          GameState.VideoEffectManager.SetVideoEffect(effectId);
        }
      }
    }

    GameState.currentCamera = GameState.camera;
    GameState.scene_cursor_holder.visible = false;

    if(GameState.State != EngineState.PAUSED){
      GameState.updateTime(delta);
    }

    // Keep world ticking while freelooking (keeps simulation running)
    if(GameState.module){
      if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
        GameState.module.tickPaused(delta);
      }else{
        GameState.module.tick(delta);
      }
    }

    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.getCurrentPlayer());
    GameState.updateShadowSystems(delta, GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    if(GameState.module?.area){
      GameState.module.area.updateRoomAnimatedLights(delta);
      GameState.module.area.updateRoomWindUniforms();
    }
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
  }

  static UpdateLegal(delta: number = 0){
    GameState.LegalScreenManager.Update(delta);
    GameState.renderer.render(GameState.LegalScreenManager.scene, GameState.camera_gui);
    GameState.stats.end();
    GameState.processEventListener('afterRender', [delta]);
  }

  static Render(delta: number = 0){
    RenderPerfStats.beginFrame(GameState.renderer);

    GameState.renderPass.camera = GameState.currentCamera;
    GameState.renderPassAA.camera = GameState.currentCamera;
    GameState.bokehPass.camera = GameState.currentCamera;
    if(GameState.renderPassMGHud){
      GameState.renderPassMGHud.camera = GameState.currentCamera;
    }

    // Shadow selection runs in Update* via updateShadowSystems. Only re-select here
    // when that pass did not run (GUI/LOADING/debugger). Maps + uniforms are gated.
    if(GameState.areShadowsEnabled()){
      if(!GameState.shadowSystemsUpdatedThisFrame){
        const focus = GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition;
        const shadowTarget = GameState.getCurrentPlayer() ?? GameState.currentCamera;
        if(GameState.lightManager && shadowTarget){
          GameState.lightManager.update(0, shadowTarget);
        }
        GameState.odysseyShadowManager?.update(GameState.currentCamera, focus, delta);
      }
      const mapsMarked = !!GameState.odysseyShadowManager?.markShadowMapForRender(GameState.renderer);
      if(mapsMarked){
        OdysseyLightingBinder.refreshSceneShadowMapUniforms(GameState.scene);
        // Consume mark-triggered flag; post-compose refresh only if matrices change.
        GameState.odysseyShadowManager?.consumeUniformsRefreshNeeded();
      }else if(GameState.odysseyShadowManager?.consumeUniformsRefreshNeeded()){
        OdysseyLightingBinder.refreshSceneShadowMapUniforms(GameState.scene);
      }
    }

    // WebGL2: bind shared lighting / shadow / wind UBOs once before world draws.
    OdysseyUniformBuffers.beginFrame(GameState.renderer);
    OdysseyLightingBinder.packShadowUbo(GameState.odysseyShadowManager);

    if(RenderPerfStats.enabled){
      RenderPerfStats.beginPhase('depthPre');
    }
    GameState.renderDepthPrepass();
    if(RenderPerfStats.enabled){
      RenderPerfStats.endPhase();
    }

    // UpdateMotionBlur — after WASD / path locomotion this frame.
    GameState.syncMotionBlurRatio();

    // FrameBufferModifications bit 0x10 — speed blur / Force Speed.
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.ratio = GameState.speedBlurRatio;
      GameState.speedBlurPass.enabled = resolveSpeedBlurPass({
        frameBufferIniEnabled: GameState.isFrameBufferEffectsEnabled(),
        enableSpeedBlur: GameState.speedBlurEnabled,
      });
    }

    // doFrameBufferFX (INI "Graphics Options"."Frame Buffer") + nonempty
    // forcePushBucket → RenderForceDistortion before GUI.
    if(GameState.forceDistortionPass){
      const needed = GameState.forceDistortionNeeded;
      GameState.forceDistortionNeeded = false;
      if(needed && !GameState.forceDistortionTexture){
        // Sync fallback so the pass can run this frame; async upgrades to real asset
        GameState.forceDistortionTexture = GameState.createFallbackDistortionTexture();
        GameState.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
        void GameState.ensureForceDistortionTexture();
      }
      // ManageSceneBSP only fills forcePushBucket when rooms.size != 0.
      const rooms = GameState.module?.area?.rooms;
      const roomedOk = !GameState.module?.area || !!(rooms && rooms.length > 0);
      GameState.forceDistortionPass.enabled =
        needed &&
        roomedOk &&
        GameState.isFrameBufferEffectsEnabled() &&
        !!GameState.forceDistortionTexture;
      if(GameState.forceDistortionPass.enabled){
        GameState.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
    }

    const composer = GameState.composer;
    const cam = GameState.currentCamera;
    const prevCamLayers = cam?.layers?.mask;
    const miniGame = GameState.module?.area?.miniGame;
    const mgCamera = miniGame?.player?.camera;
    const hudPass = GameState.renderPassMGHud;
    if(hudPass){
      hudPass.enabled = !!mgCamera;
    }
    if(GameState.miniGameAspectMaskPass){
      const maskOn = resolveMiniGameAspectMaskPass({
        engineMode: GameState.Mode,
        hasMiniGame: !!miniGame,
        miniGameType: miniGame?.type,
      });
      GameState.miniGameAspectMaskPass.enabled = maskOn;
      if(maskOn){
        GameState.miniGameAspectMaskPass.setMiniGameType(miniGame?.type);
      }
    }
    // Skip composer pass entirely when flares are off or no flare lights exist.
    if(GameState.lensFlarePass){
      const flareLights = GameState.lightManager?.getLensFlareLights?.() ?? [];
      GameState.lensFlarePass.enabled =
        !!GameState.lensFlarePass.renderLensFlares && flareLights.length > 0;
    }
    if(cam){
      // World pass: exclude MG camera HUD (drawn after AccumulationBlurPass).
      cam.layers.enable(RenderLayer.DEFAULT);
      cam.layers.disable(RenderLayer.MG_CAMERA_HUD);
    }

    if(RenderPerfStats.enabled){
      GameState.renderComposerWithPerfPhases(composer, delta);
    }else{
      composer.render(delta);
    }
    // Soft-depth split may disable the world RenderPass for one frame.
    if(GameState.renderPass){
      GameState.renderPass.enabled = true;
    }
    if(cam && prevCamLayers !== undefined){
      cam.layers.mask = prevCamLayers;
    }

    if(GameState.areShadowsEnabled()){
      // May bump frameEpoch / set _uniformsRefreshNeeded when shadow matrices
      // changed during the compose pass. Defer the full receiver refresh to the
      // next frame's pre-compose path so dirty frames do not pay twice.
      GameState.odysseyShadowManager?.noteShadowMapRendered();
    }

    if(RenderPerfStats.enabled){
      RenderPerfStats.endFrame();
      RenderPerfStats.maybeLog(60);
    }
  }

  /**
   * Run EffectComposer while attributing `renderer.info` draw deltas to
   * world / gui / post buckets (shadow depth is hooked via shadowMap.render).
   */
  static renderComposerWithPerfPhases(composer: { passes: any[]; render: (delta?: number) => void }, delta: number): void {
    const wraps: Array<{ pass: any; orig: (...args: any[]) => void }> = [];
    for(let i = 0; i < composer.passes.length; i++){
      const pass = composer.passes[i];
      if(!pass?.enabled || typeof pass.render !== 'function'){ continue; }
      const orig = pass.render.bind(pass);
      wraps.push({ pass, orig });
      const name = pass.constructor?.name || '';
      pass.render = (...args: any[]) => {
        if(pass === GameState.renderPassGUI || pass === GameState.renderPassMGHud){
          RenderPerfStats.beginPhase('gui');
        }else if(pass === GameState.renderPass){
          RenderPerfStats.beginPhase('world');
        }else{
          RenderPerfStats.beginPhase('post');
        }
        const ret = orig(...args);
        RenderPerfStats.endPhase();
        return ret;
      };
      void name;
    }
    try {
      composer.render(delta);
    }finally{
      for(let i = 0; i < wraps.length; i++){
        wraps[i].pass.render = wraps[i].orig;
      }
    }
  }

  /**
   * SetFrameBuffer / AurEnableFrameBufferEffects — INI
   * "Graphics Options"."Frame Buffer" (defaults to "1" in swkotor*-config).
   */
  static isFrameBufferEffectsEnabled(): boolean {
    if(!GameState.iniConfig) return true;
    const raw = GameState.iniConfig.getProperty('Graphics Options.Frame Buffer');
    if(raw === undefined || raw === null || raw === '') return true;
    return String(raw) !== '0';
  }

  /**
   * ClientOptions minigame_yaxis — INI
   * "Game Options"."Reverse Minigame YAxis" (turret Z / mouse Y invert).
   */
  static isMinigameYAxisReversed(): boolean {
    if(!GameState.iniConfig) return false;
    const raw = GameState.iniConfig.getProperty('Game Options.Reverse Minigame YAxis');
    if(raw === undefined || raw === null || raw === '') return false;
    return String(raw) !== '0';
  }

  /**
   * Load Scene ctor global distortiontex for RenderForceDistortion.
   * Installs a procedural fallback immediately so the pass can run while
   * the real asset loads asynchronously.
   */
  static async ensureForceDistortionTexture(): Promise<void> {
    if(GameState.forceDistortionTexture && !(GameState.forceDistortionTexture as any)._forceDistortionFallback){
      return;
    }
    if(!GameState.forceDistortionTexture){
      GameState.forceDistortionTexture = GameState.createFallbackDistortionTexture();
      if(GameState.forceDistortionPass){
        GameState.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
    }
    try {
      const tex = await TextureLoader.Load('distortiontex');
      if(tex){
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        GameState.forceDistortionTexture = tex;
        if(GameState.forceDistortionPass){
          GameState.forceDistortionPass.setDistortionTexture(tex);
        }
        if(GameState.dreamDistortionPass){
          GameState.dreamDistortionPass.setDistortionTexture(tex);
        }
        if(GameState.furyPass){
          GameState.furyPass.setDistortionTexture(tex);
        }
      }
    }catch(e){
      console.warn('Failed to load distortiontex', e);
    }
  }

  /** Procedural stand-in when distortiontex is absent from game files. */
  static createFallbackDistortionTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for(let i = 0; i < size * size; i++){
      // Centered near 0.5 so 2*(c-0.5)*scale yields small UV offsets
      const r = 128 + ((Math.random() * 48) | 0) - 24;
      const g = 128 + ((Math.random() * 48) | 0) - 24;
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = 128;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    (tex as any)._forceDistortionFallback = true;
    return tex;
  }

  /**
   * Soft-particle depth: prefer opaque→blit→soft split into the composer
   * readBuffer (skips MeshDepthMaterial full-scene prepass). Falls back to
   * the legacy depth override prepass when blit is unavailable.
   */
  static renderDepthPrepass(): void {
    if(!GameState.softDepthNeeded || !GameState.depthTarget || !GameState.renderer || !GameState.currentCamera) return;
    GameState.softDepthNeeded = false;

    const composer = GameState.composer;
    const colorTarget = composer?.readBuffer;
    if(composer && colorTarget && GameState.renderPass){
      const splitOk = runOdysseySoftDepthSplit({
        scene: GameState.scene,
        renderer: GameState.renderer,
        camera: GameState.currentCamera,
        colorTarget,
        depthSampleTarget: GameState.depthTarget,
      });
      if(splitOk){
        // World already in readBuffer — skip the composer RenderPass this frame.
        GameState.renderPass.enabled = false;
        return;
      }
    }

    runOdysseyDepthPrepass({
      scene: GameState.scene,
      renderer: GameState.renderer,
      camera: GameState.currentCamera,
      depthTarget: GameState.depthTarget,
    });
  }

  /** Keep DepthTexture.image size in sync after WebGLRenderTarget.setSize. */
  static syncDepthTargetTextureSize(): void {
    const rt = GameState.depthTarget;
    const dt = rt?.depthTexture;
    if(!rt || !dt) return;
    if(!dt.image){
      dt.image = { width: rt.width, height: rt.height } as any;
    }else{
      dt.image.width = rt.width;
      dt.image.height = rt.height;
    }
    dt.needsUpdate = true;
  }

  static updateTime(delta: number = 0){
    GameState.time += delta;

    if(GameState.deltaTime > 1000)
      GameState.deltaTime = GameState.deltaTime % 1;
  }

  /**
   * Get a screenshot of the current game from the view of the player camera
   * @param width - The width of the screenshot (default: 256)
   * @param height - The height of the screenshot (default: 256)
   * @returns A promise that resolves to a TGAObject
   */
  static async GetScreenShot(width = 256, height = 256): Promise<TGAObject> {

    if (!GameState.lastGameplayThumb) {
      GameState.lastGameplayThumb = new OffscreenCanvas(width, height);
      GameState.lastGameplayThumbCtx = GameState.lastGameplayThumb.getContext('2d')!;
    }else{
      GameState.lastGameplayThumb.width = width;
      GameState.lastGameplayThumb.height = height;
    }

    /**
     * Initialize the render target
     */
    if (!GameState.lastGameplayThumbRT) {
      GameState.lastGameplayThumbRT = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: true,
        stencilBuffer: false,
      });
    }else{
      GameState.lastGameplayThumbRT.setSize(width, height);
      GameState.lastGameplayThumbRT.texture.needsUpdate = true;
    }

    // Render WORLD ONLY into a tiny RT
    const prevRT = GameState.renderer.getRenderTarget();
    GameState.renderer.setRenderTarget(GameState.lastGameplayThumbRT);
    GameState.renderer.clear(true, true, true);
    GameState.renderer.render(GameState.scene, GameState.camera); // gameplay world camera
    GameState.renderer.setRenderTarget(prevRT);

    // Read pixels (small 256x256 so this is quick)
    const pixels = new Uint8Array(width * height * 4);
    GameState.renderer.readRenderTargetPixels(GameState.lastGameplayThumbRT, 0, 0, width, height, pixels);

    // Flip Y + force alpha
    const flipped = new Uint8ClampedArray(pixels.length);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      const src = (width - 1 - y) * rowBytes;
      const dst = y * rowBytes;
      flipped.set(pixels.subarray(src, src + rowBytes), dst);
    }
    for (let i = 3; i < flipped.length; i += 4) flipped[i] = 255;

    // Store into the cached canvas
    GameState.lastGameplayThumbCtx!.putImageData(new ImageData(flipped, width, height), 0, 0);

    // Prefer the last clean gameplay frame (pre-menu)
    if (GameState.lastGameplayThumb) {
      return TGAObject.FromCanvas(GameState.lastGameplayThumb);
    }

    // Fallback: if no cached frame exists yet, grab current frame
    const bmp = await createImageBitmap(GameState.canvas);
    const ssCanvas = new OffscreenCanvas(width, height);
    const ctx = ssCanvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, width, height);
    return TGAObject.FromCanvas(ssCanvas);
  }

}