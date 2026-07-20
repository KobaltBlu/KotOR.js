import * as THREE from "three";
import {
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager,
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, ShadowBlobManager, WindManager, MenuManager, ModuleObjectManager, PartyManager,
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager,
  VideoEffectManager, VideoManager, PazaakManager, UINotificationManager, GuiTimingBarManager, GameOverManager, CutsceneManager, LegalScreenManager, EventManager
} from "@/managers";

import type { SWRuleSet } from "@/engine/rules/SWRuleSet";

import type { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "@/talents";
import type { ModuleObject, ModuleCreature, Module, ModuleDoor } from "@/module";
import type { NWScript } from "@/nwscript/NWScript";
import type { SaveGame } from "@/engine/SaveGame";
import type { GameEffectFactory } from "@/effects/GameEffectFactory";
import type { GameEventFactory } from "@/events/GameEventFactory";

import type { ActionMenuManager } from "@/engine/menu/ActionMenuManager";
import type { ActionFactory } from "@/actions/ActionFactory";

import { IngameControls } from "@/controls/IngameControls";
// import { Mouse } from "@/controls/Mouse";

import { INIConfig } from "@/engine/INIConfig";
import { consumeAreaTransitionLoadBackground } from "@/engine/area-transition-bmp";

// import { OdysseyObject3D } from "@/three/odyssey";
import { AudioEngine, AudioEmitter } from "@/audio";
import { TGAObject } from "@/resource/TGAObject";

import { IGameStateGroups } from "@/interface/engine/IGameStateGroups";
import { ITextureLoaderQueuedRef } from "@/interface/loaders/ITextureLoaderQueuedRef";

import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { EngineState, EngineMode, GameEngineType, GameEngineEnv, EngineDebugType } from "@/enums/engine";
import { TextureType } from "@/enums/loaders/TextureType";

import { EngineContext } from "@/engine/EngineContext";

import { ConfigClient } from "@/utility/ConfigClient";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { OdysseyShaderPass } from "@/shaders/pass/OdysseyShaderPass";
import { ResourceLoader, TextureLoader } from "@/loaders";

//THREE.js imports
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import Stats from 'three/examples/jsm/libs/stats.module'
// import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
// import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";

// import { ModuleTriggerType } from "@/enums";
import { Planetary } from "@/engine/Planetary";
import { Debugger } from "@/engine/Debugger";
import { DebuggerState } from "@/enums/server/DebuggerState";
import type { IPCMessage } from "@/server/ipc/IPCMessage";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { IPCMessageTypeDebug } from "@/enums/server/ipc/IPCMessageTypeDebug";
import { PerformanceMonitor } from "@/utility/PerformanceMonitor";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";

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
    // "mgPazaakStart": []
  };

  static PerformanceMonitor: typeof PerformanceMonitor;
  static AppearanceManager: typeof AppearanceManager;
  static AutoPauseManager: typeof AutoPauseManager;
  static CameraShakeManager: typeof CameraShakeManager;
  static CharGenManager: typeof CharGenManager;
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
  static MenuManager: typeof MenuManager;
  static ModuleObjectManager: typeof ModuleObjectManager;
  static PartyManager: typeof PartyManager;
  static ResolutionManager: typeof ResolutionManager;
  static ShaderManager: typeof ShaderManager;
  static TLKManager: typeof TLKManager;
  static TwoDAManager: typeof TwoDAManager;
  static PazaakManager: typeof PazaakManager;
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
  
  static Ready = false;
  
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
    SHADOW_LIGHTS: false,
  };
  
  static IsPaused = false;

  /** TimeStop effect: world paused with exclusion list (retail pause bit 1). */
  static timeStopActive = false;
  static timeStopPausedByEffect = false;
  static timeStopExclusions: Set<number> = new Set();
  
  static Mode: EngineMode = EngineMode.GUI;
  /** CClientOptions::camera_mode — default 3 (OnAStick); SetCameraMode / drive gate */
  static clientCameraMode: number = 3;
  /**
   * Retail hsMode @ 008338e8 — message-panel key sequence sets 1;
   * freelook then enters Navigate (hover) and bumps to 2.
   */
  static cameraHsMode: number = 0;
  static holdWorldFadeInForDialog = false;
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
  /** Retail SetGameSpeed / world timer snapshot scale (death sequence slows this). */
  static timeScale: number = 1;

  static canvas: HTMLCanvasElement;
  static context: WebGLRenderingContext;
  static rendererUpscaleFactor: number;
  static renderer: THREE.WebGLRenderer;
  static depthTarget: THREE.WebGLRenderTarget;
  /**
   * Set by DEPTH_TEXTURE emitters during tick. When true, Render runs a
   * scene depth prepass into depthTarget (emitters hidden) for soft particles.
   */
  static softDepthNeeded: boolean = false;
  private static _depthPrepassHidden: THREE.Object3D[] = [];
  static clock: THREE.Clock;
  static stats: Stats;

  static lightManager: LightManager;
  static shadowBlobManager: ShadowBlobManager;
  static windManager: WindManager;

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

  // Scene light-model ambient = ARE DynAmbientColor (CAurScene::SetAmbient @ LoadArea).
  // Sun/moon ambient = directional light ambient channel; diffuse = gidy_sun_diff.
  static ambientColor = new THREE.Color(0xFFFFFF);
  static sunAmbientColor = new THREE.Color(0x000000);
  static sunColor = new THREE.Color(0xFFFFFF);
  /** Direction toward retail gidy_sun at (4000, 4500, 7000) — LoadArea. */
  static sunDirection = new THREE.Vector3(4000, 4500, 7000).normalize();
  /** @deprecated Use ambientColor — kept for rare debug callers. */
  static globalLight: { color: THREE.Color; intensity: number } | undefined;
  /** @deprecated Use sunColor — kept for rare debug callers. */
  static sunLight: { color: THREE.Color; intensity: number; position: THREE.Vector3 } | undefined;
  /** Retail global `shadowAlpha` (0–1) from day/night cycle — stencil shadow darkness. */
  static shadowAlpha = 0;
  /**
   * ARE SunShadows / MoonShadows for the active day/night lighting period.
   * When false, stencil disks and creature Fx_Shadow blobs are hidden.
   */
  static areaShadowsEnabled = true;
  /** Retail global `beamingProjectionAlpha` (0–0.05) from dawn/dusk — SetBeaming blend alpha. */
  static beamingProjectionAlpha = 0;
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
  static copyPass: ShaderPass;
  static renderPassGUI: RenderPass;
  static bloomPass: BloomPass;
  static bokehPass: BokehPass;
  
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
    'fx_tex_25', 'fx_tex_26', 'fx_tex_stealth'];

  static domElement: HTMLElement;

  static GetDebugState(type: EngineDebugType){
    return !!this.debug[type];
  }

  static ToggleDebugState(type: EngineDebugType){
    GameState.SetDebugState(type, !this.debug[type]);
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
        //   const creature = GameState.module.area.doors[i]
        //   if(!creature.debugLabel){
        //     continue;
        //   }
        //   creature.debugLabel.container.visible = enabled;
        // }

        // for(let i = 0; i < GameState.module.area.placeables.length; i++){
        //   const creature = GameState.module.area.placeables[i]
        //   if(!creature.debugLabel){
        //     continue;
        //   }
        //   creature.debugLabel.container.visible = enabled;
        // }

        // for(let i = 0; i < GameState.module.area.triggers.length; i++){
        //   const creature = GameState.module.area.triggers[i]
        //   if(!creature.debugLabel){
        //     continue;
        //   }
        //   creature.debugLabel.container.visible = enabled;
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
      console.log('Debugger: Open');
      GameState.debugMode = true;
    }); 
    GameState.Debugger.addEventListener('close', () => {
      console.log('Debugger: Close');
      GameState.debugMode = false;
    });
    GameState.Debugger.addEventListener('message', (msg: IPCMessage) => {
      if(msg.type == IPCMessageType.SetScriptBreakpoint){
        const instanceUUID = msg.getParam(0).getString();
        const address = msg.getParam(1).getInt32();
        const instance = GameState.NWScript.NWScriptInstanceMap.get(instanceUUID);
        if(instance){
          console.log("Setting breakpoint", address, "on instance", instanceUUID);
          instance.setBreakpoint(address);
        }
      }else if(msg.type == IPCMessageType.RemoveScriptBreakpoint){
        const instanceUUID = msg.getParam(0).getString();
        const address = msg.getParam(1).getInt32();
        const instance = GameState.NWScript.NWScriptInstanceMap.get(instanceUUID);
        if(instance){
          console.log("Removing breakpoint", address, "on instance", instanceUUID);
          instance.removeBreakpoint(address);
        }
      }else if(msg.type == IPCMessageType.ContinueScript){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const instruction = GameState.Debugger.currentInstruction;
          const seek = instruction.address;
          GameState.Debugger.currentInstruction = undefined;
          GameState.Debugger.state = DebuggerState.Idle;
          GameState.Debugger.currentScript.seekTo(seek);
          GameState.Debugger.currentScript.runScript(true);
        }
      }else if(msg.type == IPCMessageType.StepOverInstruction){
        if(GameState.Debugger.currentScript && GameState.Debugger.currentInstruction){
          const instruction = GameState.Debugger.currentInstruction;
          const seek = instruction.address;
          GameState.Debugger.currentInstruction = undefined;
          GameState.Debugger.state = DebuggerState.IntructionStepOver;
          GameState.Debugger.currentScript.seekTo(seek);
          GameState.Debugger.currentScript.runScript(true);
        }
      }else if(msg.type == IPCMessageType.Debug && msg.subType == IPCMessageTypeDebug.ToggleDebugState){
        const type = msg.getParam(0).getString();
        GameState.ToggleDebugState(type as EngineDebugType);
      }
    });

    GameState.lightManager = new GameState.LightManager();
    OdysseyLightingBinder.setActiveManager(GameState.lightManager);
    GameState.shadowBlobManager = new ShadowBlobManager();
    GameState.windManager = new GameState.WindManager();
    WindManager.setInstance(GameState.windManager);
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
    
    //transferToOffscreen() causes issues with savegame screenshots
    //GameState.canvas = GameState.canvas.transferControlToOffscreen();

    GameState.canvas.style.setProperty('width', '0');
    GameState.canvas.style.setProperty('height', '0');

    GameState.rendererUpscaleFactor = 1;
    // Request stencil up front for retail-equivalent shadow disks. Attributes
    // must be set on the first getContext call for the canvas.
    GameState.context = GameState.canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      depth: true,
      stencil: true,
      preserveDrawingBuffer: false,
    }) as WebGLRenderingContext;
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
    GameState.renderer.setSize( GameState.ResolutionManager.getViewportWidth(), GameState.ResolutionManager.getViewportHeight() );
    GameState.renderer.setClearColor(0x000000);

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
		GameState.depthTarget = new THREE.WebGLRenderTarget( GameState.ResolutionManager.getViewportWidth(), GameState.ResolutionManager.getViewportHeight(), pars );
    GameState.depthTarget.texture.generateMipmaps = false;
    GameState.depthTarget.stencilBuffer = false;
    GameState.depthTarget.depthBuffer = true;
    GameState.depthTarget.depthTexture = new THREE.DepthTexture(GameState.ResolutionManager.getViewportWidth(), GameState.ResolutionManager.getViewportHeight());
    GameState.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    GameState.clock = new THREE.Clock();
    GameState.stats = Stats();
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
    // Animated clip defaults match SetAnimatedCamera @ 00641010 (0.1, 10000)
    GameState.camera_animated = new THREE.PerspectiveCamera( 55, GameState.ResolutionManager.getViewportWidth() / GameState.ResolutionManager.getViewportHeight(), 0.1, 10000 );
    GameState.camera_animated.up = new THREE.Vector3( 0, 1, 0 );
    GameState.camera.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    GameState.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    
    GameState.camera_gui = new THREE.OrthographicCamera(
      GameState.ResolutionManager.getViewportWidth() / -2,
      GameState.ResolutionManager.getViewportWidth() / 2,
      GameState.ResolutionManager.getViewportHeight() / 2,
      GameState.ResolutionManager.getViewportHeight() / -2,
      1, 1000
    );
    GameState.camera_gui.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera_gui.position.z = 500;
    GameState.camera_gui.updateProjectionMatrix();
    GameState.scene_gui.add(new THREE.AmbientLight(0x60534A));
    GameState.scene_movie.add(new THREE.AmbientLight(0x60534A));

    FollowerCamera.facing = Math.PI/2;
    FollowerCamera.speed = 0;

    //Static Camera's that are in the .git file of the module
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
    // GameState.scene.add(GameState.group.weather_effects);

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
    // Enable stencil on composer targets for retail-equivalent shadow disks.
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
    GameState.composer.renderTarget2 = GameState.composer.renderTarget1.clone();
    GameState.composer.writeBuffer = GameState.composer.renderTarget1;
    GameState.composer.readBuffer = GameState.composer.renderTarget2;
    GameState.renderPass = new RenderPass(GameState.scene, GameState.currentCamera);
    GameState.renderPassAA = new SSAARenderPass (GameState.scene, GameState.currentCamera);
    GameState.odysseyShaderPass = new OdysseyShaderPass();
    GameState.copyPass = new ShaderPass(CopyShader);
    GameState.renderPassGUI = new RenderPass(GameState.scene_gui, GameState.camera_gui);
    
    GameState.bloomPass = new BloomPass(0.5);
    GameState.bokehPass = new BokehPass(GameState.scene, GameState.currentCamera, {
      focus: 1.0,
      aperture:	0.0001,
      maxblur:	1.0,
      // width: ResolutionManager.getViewportWidth(),
      // height: ResolutionManager.getViewportHeight()
    });

    GameState.renderPassAA.sampleLevel = 1;

    GameState.renderPass.renderToScreen = false;
    GameState.copyPass.renderToScreen = false;
    GameState.renderPassGUI.renderToScreen = false;

    GameState.renderPass.clear = true;
    GameState.bloomPass.clear = false;
    GameState.odysseyShaderPass.clear = false;
    GameState.renderPassAA.clear = false;
    GameState.copyPass.clear = false;
    GameState.renderPassGUI.clear = false;
    GameState.renderPassGUI.clearDepth = true;

    GameState.bokehPass.needsSwap = true;
    GameState.bokehPass.enabled = false;

    GameState.composer.addPass(GameState.renderPass);
    // GameState.composer.addPass(GameState.bokehPass);
    // GameState.composer.addPass(GameState.renderPassAA);
    // GameState.composer.addPass(GameState.odysseyShaderPass);
    // GameState.composer.addPass(GameState.bloomPass);

    GameState.composer.addPass(GameState.renderPassGUI);
    GameState.composer.addPass(GameState.copyPass);

    GameState.renderPass.clearDepth = true;
    GameState.renderPassGUI.clearDepth = true;
    GameState.renderPass.clear = true;
    GameState.renderPassGUI.clear = false;
    GameState.renderPass.needsSwap = false;
    GameState.renderPassGUI.needsSwap = false;

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
      GameState.shadowBlobManager.init(GameState.lightManager, GameState.scene);
      GameState.windManager.init(GameState);
      GameState.lightManager.setLightHelpersVisible(ConfigClient.get('GameState.debug.light_helpers') ? true : false);

      //AudioEngine.Unmute()
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
      GameState.scene.add( GameState.CursorManager.testPoints );
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

      if(GameState.GameKey == GameEngineType.KOTOR){
        GameState.VideoManager.queueMovie('leclogo', true);
        GameState.VideoManager.queueMovie('biologo', true);
        GameState.VideoManager.queueMovie('legal', true);
      }else if(GameState.GameKey == GameEngineType.TSL){
        GameState.VideoManager.queueMovie('leclogo', true);
        GameState.VideoManager.queueMovie('ObsidianEnt', true);
        GameState.VideoManager.queueMovie('Legal', true);
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
      
      // if(GameState.GameKey == GameEngineType.TSL){
      //   GameState.SetEngineMode(EngineMode.LEGAL);
      //   GameState.State = EngineState.RUNNING;
      //   GameState.Update();
      //   return;
      // }

      GameState.VideoManager.playMovieQueue( () => {
        window.dispatchEvent(new Event('resize'));
        GameState.MenuManager.MainMenu.Start();
        GameState.SetEngineMode(EngineMode.GUI);
        GameState.State = EngineState.RUNNING;
        AudioEngine.Unmute(AudioEngineChannel.ALL);
        AudioEngine.Mute(AudioEngineChannel.MOVIE);
      }).catch((e) => {
        console.error(e);
        window.dispatchEvent(new Event('resize'));
        GameState.MenuManager.MainMenu.Start();
        GameState.SetEngineMode(EngineMode.GUI);
        GameState.State = EngineState.RUNNING;
        AudioEngine.Unmute(AudioEngineChannel.ALL);
        AudioEngine.Mute(AudioEngineChannel.MOVIE);
      });
      //Start the game update loop
      GameState.Update();
    }
  }

  static EventOnResize(){
    GameState.ResolutionManager.recalculate();
    let width = GameState.ResolutionManager.getViewportWidth();
    let height = GameState.ResolutionManager.getViewportHeight();

    GameState.composer.setSize(width * GameState.rendererUpscaleFactor, height * GameState.rendererUpscaleFactor);

    GameState.FadeOverlayManager.plane.scale.set(width, height, 1);

    GameState.VideoManager.resize(width, height);

    GameState.camera_gui.left = width / -2;
    GameState.camera_gui.right = width / 2;
    GameState.camera_gui.top = height / 2;
    GameState.camera_gui.bottom = height / -2;

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

    if(GameState.ResolutionManager.vpScaleFactor){
      GameState.canvas.style.transform = 'scale('+GameState.ResolutionManager.vpScaleFactor+')';
    }else{
      GameState.canvas.style.transform = '';
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
    this.audioEmitter.maxDistance = 50;
    this.audioEmitter.type = AudioEmitterType.GLOBAL;
    // Retail dialog VO uses One_Shot_Streams (group 3), not Unmaskable.
    this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.ONE_SHOT_STREAMS);
    this.audioEmitter.load();
    AudioEngine.ensureGameBusesAudible();
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
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);
      /**
       * Set the game mode to loading
       */
      GameState.SetEngineMode(EngineMode.LOADING);
      GameState.MenuManager.ClearMenus();

      GameState.UnloadModule();

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
        try{ await GameState.module.save(); }catch(e){
          console.error(e);
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

        GameState.MenuManager.InGameOverlay.recalculatePosition();
        GameState.MenuManager.InGameOverlay.open();

        GameState.renderer.compile(GameState.scene, GameState.currentCamera);
        GameState.renderer.setClearColor( new THREE.Color(GameState.module.area.sun.fogColor) );
        
        console.log('ModuleArea.initAreaObjects');
        GameState.SetEngineMode(GameState.module.area.miniGame ? EngineMode.MINIGAME : EngineMode.INGAME);
        await GameState.module.area.initAreaObjects(runSpawnScripts);
        console.log('ModuleArea: ready to play');
        GameState.module.readyToProcessEvents = true;

        if(GameState.Mode == EngineMode.INGAME){
          const anyCanLevel = GameState.PartyManager.party.some((p) => p.canLevelUp());
          if(anyCanLevel){
            GameState.audioEmitter.playSound('gui_level');
          }
        }

        //Reveal the area — retail MainLoop StartGlobalFade(1, wait=0.5, length=1.0)
        GameState.MenuManager.LoadScreen.close();
        // Retail MainLoop after StartSounds: SetSoundMode(0) again (clears BusyWait mute under load).
        AudioEngine.clearSoundModeStack();
        if(!GameState.holdWorldFadeInForDialog){
          GameState.FadeOverlayManager.FadeIn(
            GameState.FadeOverlayManager.WORLD_FADE_IN_LENGTH,
            0, 0, 0,
            GameState.FadeOverlayManager.WORLD_FADE_IN_WAIT
          );
        }
        GameState.module.area.updateDayNightCycle();
        GameState.module.area.musicBackgroundPlay();
        GameState.module.area.ambientSoundPlay();
        GameState.loadingModule = false;
      });
    }catch(e){
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

    // CSWCameraFreeLook enter/exit
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
        GameState.MenuManager.InGameAreaTransition.hide();
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
    // GameState.initTimers();
    ResourceLoader.clearCache();

    GameState.scene.visible = false;
    GameState.SetEngineMode(EngineMode.LOADING);
    GameState.ModuleObjectManager.Reset();
    GameState.renderer.setClearColor(new THREE.Color(0, 0, 0));
    GameState.AlphaTest = 0;
    GameState.holdWorldFadeInForDialog = false;
    const audioEngine = AudioEngine.GetAudioEngine();
    audioEngine.reset();

    GameState.lightManager.clearLights();
    GameState.windManager.clear();

    GameState.CursorManager.selected = undefined;
    GameState.CursorManager.selectedObject = undefined;
    GameState.CursorManager.hovered = undefined;
    GameState.CursorManager.hoveredObject = undefined;

    GameState.staticCameras = [];
    GameState.CutsceneManager.paused = false;

    AudioEngine.Mute();
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

  static Update(){
    
    requestAnimationFrame( GameState.Update );

    GameState.forwardVector.set(0, 0, -1);

    const delta = GameState.clock.getDelta();
    GameState.processEventListener('beforeRender', [delta]);
    GameState.delta = delta;
    GameState.deltaTime += delta;
    GameState.deltaTimeFixed += (1/60);

    /**
     * Pause the main loop if the debugger is active
     */
    if(GameState.debugMode && !!GameState.Debugger.state){
      return;
    }

    GameState.controls.Update(delta);
    GameState.scene_cursor_holder.visible = GameState.Mode != EngineMode.MOVIE && GameState.Mode != EngineMode.LEGAL;
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

    GameState.MenuManager.Update(delta);
    if(GameState.MenuManager.InGameAreaTransition)
      GameState.MenuManager.InGameAreaTransition.hide();

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

    GameState.stats.update();
    GameState.processEventListener('afterRender', [delta]);
  }

  static UpdateMovie(delta: number = 0){
    GameState.VideoManager.update(delta);
    GameState.renderer.render(GameState.scene_movie, GameState.camera_gui);
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

  static UpdateIngame(delta: number = 0){
    //Get Selectable Objects In Range
    GameState.ModuleObjectManager.TickSelectableObjects(delta);

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
    const simDelta = delta * (GameState.timeScale > 0 ? GameState.timeScale : 1);

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

    GameState.FadeOverlayManager.Update(delta);
    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.getCurrentPlayer());
    GameState.shadowBlobManager.update(GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
    
    //Handle the visibility of the PAUSE overlay
    if(
      GameState.State == EngineState.PAUSED &&
      !GameState.timeStopActive &&
      GameState.MenuManager.InGameOverlay.isVisible()
    ){
      if(!GameState.MenuManager.InGamePause.isVisible())
        GameState.MenuManager.InGamePause.show();
    }else{
      if(GameState.MenuManager.InGamePause.isVisible())
        GameState.MenuManager.InGamePause.hide();
    }
    if(GameState.MenuManager.InGameAreaTransition.transitionObject){
      GameState.MenuManager.InGameAreaTransition.show();
    }
  }

  static UpdateDialog(delta: number = 0){
    if(GameState.State != EngineState.PAUSED){
      GameState.updateTime(delta);
    }
    const isEntryMode = GameState.MenuManager.InGameDialog.isVisible() && !GameState.MenuManager.InGameDialog.LB_REPLIES.isVisible() && GameState.scene_cursor_holder.visible;
    if(isEntryMode){
      GameState.scene_cursor_holder.visible = false;
    }
    // World timer keeps running in dialog unless paused (same policy as freelook).
    if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
      GameState.module.tickPaused(delta);
    }else{
      GameState.module.tick(delta);
    }
    GameState.CutsceneManager.update(delta);
    if(GameState.MenuManager.InGameBark?.bVisible){
      GameState.MenuManager.InGameBark.update(delta);
    }
    GameState.FadeOverlayManager.Update(delta);
    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.currentCamera);
    GameState.shadowBlobManager.update(GameState.currentCamera?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
    
    //Handle the visibility of the PAUSE overlay
    if(
      GameState.State == EngineState.PAUSED &&
      !GameState.timeStopActive &&
      GameState.MenuManager.InGameOverlay.isVisible()
    ){
      if(!GameState.MenuManager.InGamePause.isVisible())
        GameState.MenuManager.InGamePause.show();
    }else{
      if(GameState.MenuManager.InGamePause.isVisible())
        GameState.MenuManager.InGamePause.hide();
    }
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

    GameState.FadeOverlayManager.Update(delta);
    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.getCurrentPlayer());
    GameState.shadowBlobManager.update(GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);

    //Handle the visibility of the PAUSE overlay
    if(
      GameState.State == EngineState.PAUSED &&
      !GameState.timeStopActive &&
      GameState.MenuManager.InGameOverlay.isVisible()
    ){
      if(!GameState.MenuManager.InGamePause.isVisible())
        GameState.MenuManager.InGamePause.show();
    }else{
      if(GameState.MenuManager.InGamePause.isVisible())
        GameState.MenuManager.InGamePause.hide();
    }
  }

  static UpdateFreeLook(delta: number = 0){
    // CSWCameraFreeLook — video effect from appearance.freelookeffect
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

    // Keep world ticking while freelooking (retail keeps simulation running)
    if(GameState.module){
      if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
        GameState.module.tickPaused(delta);
      }else{
        GameState.module.tick(delta);
      }
    }

    GameState.FadeOverlayManager.Update(delta);
    GameState.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.getCurrentPlayer());
    GameState.shadowBlobManager.update(GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    if(GameState.module?.area){
      GameState.module.area.updateRoomAnimatedLights(delta);
      GameState.module.area.updateRoomWindUniforms();
    }
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
  }

  static UpdateLegal(delta: number = 0){
    GameState.LegalScreenManager.Update(delta);
    GameState.renderer.render(this.scene, GameState.camera_gui);
    GameState.processEventListener('afterRender', [delta]);
  }

  static Render(delta: number = 0){
    GameState.renderPass.camera = GameState.currentCamera;
    GameState.renderPassAA.camera = GameState.currentCamera;
    GameState.bokehPass.camera = GameState.currentCamera;

    GameState.renderDepthPrepass();

    // Orchestrate stencil-preserving clear for shadow disks:
    // 1) clear color/depth/stencil into the composer read buffer
    //    (RenderPass draws into readBuffer — see three RenderPass.js)
    // 2) write caster masks (colorWrite disabled)
    // 3) clear color/depth only, preserving stencil
    // 4) render composer with RenderPass.clear = false
    const renderer = GameState.renderer;
    const composer = GameState.composer;
    const prevTarget = renderer.getRenderTarget();
    const prevRenderPassClear = GameState.renderPass.clear;
    const stencilTarget = composer?.readBuffer;
    if(GameState.shadowBlobManager && GameState.currentCamera && stencilTarget){
      renderer.setRenderTarget(stencilTarget);
      renderer.clear(true, true, true);
      GameState.shadowBlobManager.renderStencilMasks(
        renderer,
        GameState.scene,
        GameState.currentCamera,
        false
      );
      renderer.clear(true, true, false);
      GameState.renderPass.clear = false;
    }
    composer.render(delta);
    GameState.renderPass.clear = prevRenderPassClear;
    renderer.setRenderTarget(prevTarget);
  }

  /**
   * Fill depthTarget.depthTexture with scene depth (no emitters) for soft
   * particle DEPTH_TEXTURE sampling. Skipped unless an emitter requested it.
   */
  static renderDepthPrepass(): void {
    if(!GameState.depthTarget || !GameState.softDepthNeeded) return;
    GameState.softDepthNeeded = false;

    const hidden = GameState._depthPrepassHidden;
    hidden.length = 0;
    GameState.scene.traverse((obj) => {
      if((obj as any).type === 'OdysseyEmitter' && obj.visible){
        obj.visible = false;
        hidden.push(obj);
      }
    });

    const renderer = GameState.renderer;
    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.setRenderTarget(GameState.depthTarget);
    renderer.autoClear = false;
    renderer.clear(true, true, true);
    renderer.render(GameState.scene, GameState.currentCamera);
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;

    for(let i = 0; i < hidden.length; i++){
      hidden[i].visible = true;
    }
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