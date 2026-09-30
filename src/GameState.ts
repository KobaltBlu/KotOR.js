import * as THREE from "three";
import {
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, LevelUpManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager,
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, OdysseyShadowManager, WindManager, GrassManager, MenuManager, ModuleObjectManager, PartyManager,
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager,
  VideoEffectManager, VideoManager, PazaakManager, UINotificationManager, GuiTimingBarManager, GameOverManager, CutsceneManager, LegalScreenManager, TutorialManager
} from "@/managers";

import type { SWRuleSet } from "@/engine/rules/SWRuleSet";

import type { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "@/talents";
import type { ModuleCreature, Module } from "@/module";
import type { NWScript } from "@/nwscript/NWScript";
import type { SaveGame } from "@/engine/SaveGame";
import type { GameEffectFactory } from "@/effects/GameEffectFactory";
import type { GameEventFactory } from "@/events/GameEventFactory";

import type { ActionMenuManager } from "@/engine/menu/ActionMenuManager";
import type { ActionFactory } from "@/actions/ActionFactory";

import type { IngameControls } from "@/controls/IngameControls";

import { INIConfig } from "@/engine/INIConfig";
import { UpdateLoopArm } from "@/engine/updateLoopSchedule";
import { OdysseyRenderPipeline } from "@/engine/OdysseyRenderPipeline";
import { GameLoop } from "@/engine/GameLoop";
import { GameRuntimeBootstrap } from "@/engine/GameRuntimeBootstrap";
import { GameStateEvents } from "@/engine/GameStateEvents";

import type { AudioEmitter } from "@/audio";
import type { TGAObject } from "@/resource/TGAObject";

import { IGameStateGroups } from "@/interface/engine/IGameStateGroups";
import { EngineState, EngineMode, GameEngineType, GameEngineEnv, EngineDebugType } from "@/enums/engine";
import { TextureType } from "@/enums/loaders/TextureType";

import { FollowerCamera } from "@/engine/FollowerCamera";
import type { OdysseyShaderPass } from "@/shaders/pass/OdysseyShaderPass";
import type { ForceDistortionPass } from "@/shaders/pass/ForceDistortionPass";
import type { OverbrightenPass } from "@/shaders/pass/OverbrightenPass";
import type { ConvolutionBloomPass } from "@/shaders/pass/ConvolutionBloomPass";
import type { DreamDistortionPass } from "@/shaders/pass/DreamDistortionPass";
import type { FuryPass } from "@/shaders/pass/FuryPass";
import type { MiniGameAspectMaskPass } from "@/shaders/pass/MiniGameAspectMaskPass";
import type { OdysseyLensFlarePass } from "@/shaders/pass/OdysseyLensFlarePass";
import { TextureLoader } from "@/loaders";
import { MotionBlurController } from "@/engine/MotionBlurController";
import { GameDebuggerBridge } from "@/engine/GameDebuggerBridge";
import { GameplayCapture } from "@/engine/GameplayCapture";
import { EngineModeController } from "@/engine/EngineModeController";
import { ModuleLoadCoordinator } from "@/engine/ModuleLoadCoordinator";
import { ForgePreviewHost } from "@/apps/forge/ForgePreviewHost";

//THREE.js imports
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import type { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import type { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import type { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import type { BloomPass } from "three/examples/jsm/postprocessing/BloomPass";
import type { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
import type { AccumulationBlurPass } from "@/shaders/pass/AccumulationBlurPass";
import type Stats from 'three/examples/jsm/libs/stats.module'

import { Planetary } from "@/engine/Planetary";
import { Debugger } from "@/engine/Debugger";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { PerformanceMonitor } from "@/utility/PerformanceMonitor";
import { EngineContext } from "./engine/EngineContext";

// Preserve r149-like color appearance until a dedicated color-management pass.
THREE.ColorManagement.enabled = false;

export interface GameStateInitializeOptions {
  Game: GameEngineType,
  GameDirectory: string, //path to the local game install directory
  Env: GameEngineEnv,
};

export class GameState implements EngineContext {

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

  /** Pending Update callback arm (at most one RAF or timeout). */
  static updateLoop = new UpdateLoopArm();
  
  static Ready = false;
  /** When true, Init skips MainMenu/legal and stays ready for Forge module preview. */
  static forgePreviewHost = false;
  
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

  /** DOM placeholder — events, focus, CSS scale/contrast, Forge reparent. */
  static canvas: HTMLCanvasElement;
  /**
   * GPU surface when `transferControlToOffscreen` succeeded; null keeps
   * WebGL on the HTML canvas (fallback).
   */
  static offscreenCanvas: OffscreenCanvas | null = null;
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

  /** @see GameDebuggerBridge.dumpLiveScriptsToDebugger */
  static dumpLiveScriptsToDebugger(){
    GameDebuggerBridge.dumpLiveScriptsToDebugger();
  }

  /** @see GameDebuggerBridge.sendInspectorSnapshot */
  static sendInspectorSnapshot(type: IPCMessageType, payload: unknown){
    GameDebuggerBridge.sendInspectorSnapshot(type, payload);
  }

  /** @see GameDebuggerBridge.sendScriptResource */
  static sendScriptResource(
    resref: string,
    ok: boolean,
    source: 'override' | 'key' | 'module' | 'runtime' | 'missing',
    bytecode?: Uint8Array | null,
  ){
    GameDebuggerBridge.sendScriptResource(resref, ok, source, bytecode);
  }

  /** @see GameDebuggerBridge.resolveScriptResourceBytes */
  static async resolveScriptResourceBytes(resref: string): Promise<{
    buffer: Uint8Array;
    source: 'override' | 'key' | 'module' | 'runtime';
  } | null> {
    return GameDebuggerBridge.resolveScriptResourceBytes(resref);
  }

  /** @see GameDebuggerBridge.finishPausedScriptOnDebuggerClose */
  static finishPausedScriptOnDebuggerClose(){
    GameDebuggerBridge.finishPausedScriptOnDebuggerClose();
  }

  /** @see GameDebuggerBridge.processPendingDebuggerResume */
  static processPendingDebuggerResume(){
    GameDebuggerBridge.processPendingDebuggerResume();
  }

  /** @see MotionBlurController.SetSpeedBlurEffect */
  static SetSpeedBlurEffect(enabled: boolean, ratio: number = 0.75){
    MotionBlurController.SetSpeedBlurEffect(enabled, ratio);
  }

  /** @see MotionBlurController.applyMotionBlurVFX */
  static applyMotionBlurVFX(target: ModuleCreature | undefined, progFX: number){
    MotionBlurController.applyMotionBlurVFX(target, progFX);
  }

  /** @see MotionBlurController.removeMotionBlurVFX */
  static removeMotionBlurVFX(){
    MotionBlurController.removeMotionBlurVFX();
  }

  /** @see MotionBlurController.syncMotionBlurRatio */
  static syncMotionBlurRatio(){
    MotionBlurController.syncMotionBlurRatio();
  }

  static setDOMElement(element: HTMLElement){
    GameState.domElement = element;
  }

  /**
   * Initialize the GameState
   */
  static async Init(){
    GameDebuggerBridge.attach();

    GameRuntimeBootstrap.createWorldManagers();
    GameStateEvents.processEventListener('init');

    GameRuntimeBootstrap.createRuntime();

    try{
      //init shaders
      PerformanceMonitor.start('ShaderManager.Init');
      GameState.ShaderManager.Init();
      PerformanceMonitor.stop('ShaderManager.Init');

      GameState.TutorialWindowTracker = [];

      GameRuntimeBootstrap.initAudioEmitters();
      GameRuntimeBootstrap.initWorldManagers();

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
      GameLoop.Start();
      // Shake is cached in CameraShakeManager.update; restore after render so it doesn't accumulate
      GameStateEvents.addEventListener('afterRender', () => GameState.CameraShakeManager.afterRender());
      console.log(PerformanceMonitor.toString());
    }catch(e){
      console.error(e);
    }
  }

  /** @see GameLoop.Start */
  static Start(): void {
    GameLoop.Start();
  }

  public static getCurrentPlayer(): ModuleCreature {
    if(GameState.Mode == EngineMode.MINIGAME){
      return GameState.module.area.miniGame.player as any;
    }
    let p = GameState.PartyManager.party[0];
    return p ? p : GameState.PartyManager.Player;
  }

  /** @see ModuleLoadCoordinator.ResetModuleAudio */
  static ResetModuleAudio(){
    ModuleLoadCoordinator.ResetModuleAudio();
  }

  /** @see ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade */
  static LoadModuleWithAreaTransitionFade(name = '', waypoint: string = null){
    ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade(name, waypoint);
  }

  /** @see ModuleLoadCoordinator.LoadModuleWithJumpSpawn */
  static LoadModuleWithJumpSpawn(
    name: string,
    spawn: { x: number; y: number; z: number; ox: number; oy: number }
  ){
    ModuleLoadCoordinator.LoadModuleWithJumpSpawn(name, spawn);
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
   * @see ModuleLoadCoordinator.LoadModule
   */
  static async LoadModule(name = '', waypoint: string = null, sMovie1 = '', sMovie2 = '', sMovie3 = '', sMovie4 = '', sMovie5 = '', sMovie6 = ''){
    return ModuleLoadCoordinator.LoadModule(name, waypoint, sMovie1, sMovie2, sMovie3, sMovie4, sMovie5, sMovie6);
  }

  /** @see ForgePreviewHost.InitForForgePreview */
  static async InitForForgePreview(host: HTMLElement): Promise<void> {
    return ForgePreviewHost.InitForForgePreview(host);
  }

  /** @see ForgePreviewHost.ensureGuiListHexTextures */
  static ensureGuiListHexTextures(): void {
    ForgePreviewHost.ensureGuiListHexTextures();
  }

  /** @see ForgePreviewHost.applyForgePreviewCanvasLayout */
  static applyForgePreviewCanvasLayout(): void {
    ForgePreviewHost.applyForgePreviewCanvasLayout();
  }

  /** @see ForgePreviewHost.attachForgePreviewResizeObserver */
  static attachForgePreviewResizeObserver(host: HTMLElement): void {
    ForgePreviewHost.attachForgePreviewResizeObserver(host);
  }

  /** @see ForgePreviewHost.detachForgePreviewResizeObserver */
  static detachForgePreviewResizeObserver(): void {
    ForgePreviewHost.detachForgePreviewResizeObserver();
  }

  /** @see ForgePreviewHost.clearForgePreviewViewport */
  static clearForgePreviewViewport(): void {
    ForgePreviewHost.clearForgePreviewViewport();
  }

  /** @see ForgePreviewHost.LoadModuleFromArchives */
  static async LoadModuleFromArchives(archives: any[], waypoint: string = null, modName = 'preview'){
    return ForgePreviewHost.LoadModuleFromArchives(archives, waypoint, modName);
  }

  /** @see EngineModeController.RestoreEnginePlayMode */
  static RestoreEnginePlayMode(): void {
    EngineModeController.RestoreEnginePlayMode();
  }

  /** @see EngineModeController.SetEngineMode */
  static SetEngineMode(mode: EngineMode){
    EngineModeController.SetEngineMode(mode);
  }

  /** @see ModuleLoadCoordinator.UnloadModule */
  static UnloadModule(){
    ModuleLoadCoordinator.UnloadModule();
  }

  /** @see ModuleLoadCoordinator.applyPostLoadRevealFade */
  static applyPostLoadRevealFade(): void {
    ModuleLoadCoordinator.applyPostLoadRevealFade();
  }

  /** @see ModuleLoadCoordinator.ReloadTextureCache */
  static ReloadTextureCache(){
    ModuleLoadCoordinator.ReloadTextureCache();
  }

  static getCameraById(id = 0): THREE.PerspectiveCamera | undefined {
    for(let i = 0; i < GameState.staticCameras.length; i++){
      if(GameState.staticCameras[i].userData.ingameID == id)
        return GameState.staticCameras[i];
    }
    return undefined;
  }

  static forwardVector = new THREE.Vector3(0, 0, );

  /** @see GameLoop.isVSyncEnabled */
  static isVSyncEnabled(): boolean {
    return GameLoop.isVSyncEnabled();
  }

  /** @see GameLoop.scheduleNextUpdate */
  static scheduleNextUpdate(workMs = 0): void {
    GameLoop.scheduleNextUpdate(workMs);
  }

  /** @see GameLoop.applyVSyncOption */
  static applyVSyncOption(): void {
    GameLoop.applyVSyncOption();
  }

  /** @see GameLoop.Update */
  static Update(): void {
    GameLoop.Update();
  }

  /** @see GameLoop.UpdateMovie */
  static UpdateMovie(delta: number = 0): void {
    GameLoop.UpdateMovie(delta);
  }

  /** @see GameLoop.UpdateGUI */
  static UpdateGUI(delta: number = 0): void {
    GameLoop.UpdateGUI(delta);
  }

  /** @see GameLoop.updateViewportFrustum */
  static updateViewportFrustum(): void {
    GameLoop.updateViewportFrustum();
  }

  /** @see GameLoop.updateShadowSystems */
  static updateShadowSystems(_delta: number, focus?: THREE.Vector3): void {
    GameLoop.updateShadowSystems(_delta, focus);
  }

  /** @see GameLoop.UpdateIngame */
  static UpdateIngame(delta: number = 0): void {
    GameLoop.UpdateIngame(delta);
  }

  /** @see GameLoop.UpdateDialog */
  static UpdateDialog(delta: number = 0): void {
    GameLoop.UpdateDialog(delta);
  }

  /** @see GameLoop.UpdateMinigame */
  static UpdateMinigame(delta: number = 0): void {
    GameLoop.UpdateMinigame(delta);
  }

  /** @see GameLoop.UpdateFreeLook */
  static UpdateFreeLook(delta: number = 0): void {
    GameLoop.UpdateFreeLook(delta);
  }

  /** @see GameLoop.UpdateLegal */
  static UpdateLegal(delta: number = 0): void {
    GameLoop.UpdateLegal(delta);
  }

  /** @see OdysseyRenderPipeline.renderFrame */
  static Render(delta: number = 0): void {
    OdysseyRenderPipeline.renderFrame(delta);
  }

  /** @see OdysseyRenderPipeline.renderComposerWithPerfPhases */
  static renderComposerWithPerfPhases(composer: { passes: any[]; render: (delta?: number) => void }, delta: number): void {
    OdysseyRenderPipeline.renderComposerWithPerfPhases(composer, delta);
  }

  /** @see OdysseyRenderPipeline.isFrameBufferEffectsEnabled */
  static isFrameBufferEffectsEnabled(): boolean {
    return OdysseyRenderPipeline.isFrameBufferEffectsEnabled();
  }

  /** @see OdysseyRenderPipeline.ensureForceDistortionTexture */
  static async ensureForceDistortionTexture(): Promise<void> {
    return OdysseyRenderPipeline.ensureForceDistortionTexture();
  }

  /** @see OdysseyRenderPipeline.createFallbackDistortionTexture */
  static createFallbackDistortionTexture(): THREE.DataTexture {
    return OdysseyRenderPipeline.createFallbackDistortionTexture();
  }

  /** @see ModuleLoadCoordinator.warmModuleGpuForArea */
  static async warmModuleGpuForArea(): Promise<void> {
    return ModuleLoadCoordinator.warmModuleGpuForArea();
  }

  /** @see OdysseyRenderPipeline.renderDepthPrepass */
  static renderDepthPrepass(): void {
    OdysseyRenderPipeline.renderDepthPrepass();
  }

  /** @see GameplayCapture.captureFramebufferToOffscreenCanvas */
  static captureFramebufferToOffscreenCanvas(width: number, height: number): OffscreenCanvas {
    return GameplayCapture.captureFramebufferToOffscreenCanvas(width, height);
  }

  /** @see GameplayCapture.GetScreenShot */
  static async GetScreenShot(width = 256, height = 256): Promise<TGAObject> {
    return GameplayCapture.GetScreenShot(width, height);
  }

}