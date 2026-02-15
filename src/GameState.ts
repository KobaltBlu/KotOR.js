import * as THREE from "three";
import {
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager,
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, MenuManager, ModuleObjectManager, PartyManager,
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager,
  VideoEffectManager, VideoManager, PazaakManager, UINotificationManager, CutsceneManager
} from "./managers";

import type { SWRuleSet } from "./engine/rules/SWRuleSet";

import type { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "./talents";
import type { ModuleObject, ModuleCreature, Module, ModuleDoor } from "./module";
import type { NWScript } from "./nwscript/NWScript";
import type { SaveGame } from "./engine/SaveGame";
import type { GameEffectFactory } from "./effects/GameEffectFactory";
import type { GameEventFactory } from "./events/GameEventFactory";

import type { ActionMenuManager } from "./engine/menu/ActionMenuManager";
import type { ActionFactory } from "./actions/ActionFactory";

import { IngameControls } from "./controls/IngameControls";
// import { Mouse } from "./controls/Mouse";

import { INIConfig } from "./engine/INIConfig";

// import { OdysseyObject3D } from "./three/odyssey";
import { AudioEngine, AudioEmitter } from "./audio";
import { TGAObject } from "./resource/TGAObject";

import { IGameStateGroups } from "./interface/engine/IGameStateGroups";
import { ITextureLoaderQueuedRef } from "./interface/loaders/ITextureLoaderQueuedRef";

import { AudioEngineChannel } from "./enums/audio/AudioEngineChannel";
import { EngineState, EngineMode, GameEngineType, GameEngineEnv, EngineDebugType } from "./enums/engine";
import { TextureType } from "./enums/loaders/TextureType";

import { EngineContext } from "./engine/EngineContext";

import { ConfigClient } from "./utility/ConfigClient";
import { FollowerCamera } from "./engine/FollowerCamera";
import { OdysseyShaderPass } from "./shaders/pass/OdysseyShaderPass";
import { ResourceLoader, TextureLoader } from "./loaders";

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
import { BitWise } from "./utility/BitWise";
import { ModuleObjectType } from "./enums/module/ModuleObjectType";
import { AudioEmitterType } from "./enums/audio/AudioEmitterType";
// import { GUIControlTypeMask } from "./enums/gui/GUIControlTypeMask";

import { ModuleTriggerType } from "./enums";
import { Planetary } from "./engine/Planetary";
import { Debugger } from "./engine/Debugger";
import { DebuggerState } from "./enums/server/DebuggerState";
import type { IPCMessage } from "./server/ipc/IPCMessage";
import { IPCMessageType } from "./enums/server/ipc/IPCMessageType";
import { IPCMessageTypeDebug } from "./enums/server/ipc/IPCMessageTypeDebug";
import { PerformanceMonitor } from "./utility/PerformanceMonitor";

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
  static MenuManager: typeof MenuManager;
  static ModuleObjectManager: typeof ModuleObjectManager;
  static PartyManager: typeof PartyManager;
  static ResolutionManager: typeof ResolutionManager;
  static ShaderManager: typeof ShaderManager;
  static TLKManager: typeof TLKManager;
  static TwoDAManager: typeof TwoDAManager;
  static PazaakManager: typeof PazaakManager;
  static UINotificationManager: typeof UINotificationManager;
  static CutsceneManager: typeof CutsceneManager;
  static lastGameplayThumb?: OffscreenCanvas;
  static lastGameplayThumbCtx?: OffscreenCanvasRenderingContext2D;
  static lastGameplayThumbRT?: THREE.WebGLRenderTarget;


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
  
  static OpeningMoviesComplete = false;
  static Ready = false;
  
  static CameraDebugZoom = 1;
  
  static raycaster = new THREE.Raycaster();
  static mouse = new THREE.Vector2();
  static mouseUI = new THREE.Vector2();
  static screenCenter = new THREE.Vector3();
  
  static SOLOMODE = false;
  static isLoadingSave = false;
  
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
  
  static Mode: EngineMode = EngineMode.GUI;
  static holdWorldFadeInForDialog = false;
  static autoRun = false;
  static AlphaTest = 0.5;
  static noClickTimer = 0;
  static maxSelectableDistance = 20;

  static delta: number = 0;
  static clampedDelta: number = 0;

  static SaveGame: SaveGame;
  
  static currentGamepad: Gamepad;
  static videoEffect: number = -1;
  static onScreenShot?: Function;
  static time: number = 0;
  static deltaTime: number = 0;
  static deltaTimeFixed: number = 0;

  static canvas: HTMLCanvasElement;
  static context: WebGLRenderingContext;
  static rendererUpscaleFactor: number;
  static renderer: THREE.WebGLRenderer;
  static depthTarget: THREE.WebGLRenderTarget;
  static clock: THREE.Clock;
  static stats: Stats;

  static lightManager: LightManager;

  static limiter: { 
    fps: number; 
    fpsInterval: number; 
    startTime: number; 
    now: number; 
    then: number; 
    elapsed: number; 
    setFPS: (fps?: number) => void; 
  };

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

  //GameState properties
  static globalLight: THREE.AmbientLight;
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
    GameState.context = GameState.canvas.getContext( 'webgl' );

    GameState.rendererUpscaleFactor = 1;
    GameState.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas: GameState.canvas,
      context: GameState.context,
      logarithmicDepthBuffer: true,
      alpha: true,
      preserveDrawingBuffer: false
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

    GameState.limiter = {
      fps : 30,
      fpsInterval: 1000/30,
      startTime: Date.now(),
      now: 0,
      then: 0,
      elapsed: 0,
      setFPS: function(fps = 30){
        this.fps = fps;
        this.fpsInterval = 1000 / this.fps;
      }
    };

    GameState.limiter.then = GameState.limiter.startTime;

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
    GameState.camera_animated = new THREE.PerspectiveCamera( 55, GameState.ResolutionManager.getViewportWidth() / GameState.ResolutionManager.getViewportHeight(), 0.01, 15000 );
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

    //0x60534A
    GameState.globalLight = new THREE.AmbientLight(0xFFFFFF);
    GameState.globalLight.position.x = 0;
    GameState.globalLight.position.y = 0;
    GameState.globalLight.position.z = 0;
    GameState.globalLight.intensity  = 1;

    GameState.scene.add(GameState.globalLight);

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
    GameState.composer.addPass(GameState.odysseyShaderPass);
    GameState.composer.addPass(GameState.bloomPass);

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
       */
      const audioEngine = AudioEngine.GetAudioEngine();
      AudioEngine.GAIN_MUSIC = parseInt(GameState.iniConfig.getProperty('Sound Options.Music Volume')) || 0
      AudioEngine.GAIN_VO = parseInt(GameState.iniConfig.getProperty('Sound Options.Voiceover Volume')) || 0
      AudioEngine.GAIN_SFX = parseInt(GameState.iniConfig.getProperty('Sound Options.Sound Effects Volume')) || 0
      AudioEngine.GAIN_GUI = parseInt(GameState.iniConfig.getProperty('Sound Options.Sound Effects Volume')) || 0
      AudioEngine.GAIN_MOVIE = parseInt(GameState.iniConfig.getProperty('Sound Options.Movie Volume')) || 0

      GameState.guiAudioEmitter = new AudioEmitter(audioEngine, AudioEngineChannel.GUI);
      GameState.guiAudioEmitter.maxDistance = 100;
      GameState.guiAudioEmitter.volume = 127;
      GameState.guiAudioEmitter.load();
    
      GameState.audioEmitter = new AudioEmitter(audioEngine);
      GameState.audioEmitter.maxDistance = 50;
      GameState.audioEmitter.type = AudioEmitterType.GLOBAL;
      GameState.audioEmitter.load();

      /**
       * Initialize the LightManager
       */
      GameState.lightManager.init(GameState);
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
       * Preload fx textures
       */
      TextureLoader.enQueue(GameState.preloadTextures,
        undefined,
        TextureType.TEXTURE
      );
      PerformanceMonitor.start('TextureLoader.LoadQueue');
      await TextureLoader.LoadQueue();
      PerformanceMonitor.stop('TextureLoader.LoadQueue');

      if(GameState.GameKey == GameEngineType.KOTOR){
        GameState.VideoManager.queueMovie('leclogo');
        GameState.VideoManager.queueMovie('biologo');
        GameState.VideoManager.queueMovie('legal');
      }

      GameState.Ready = true;
      if(GameState.OpeningMoviesComplete){
        GameState.Start();
      }
      console.log(PerformanceMonitor.toString());
    }catch(e){
      console.error(e);
    }
  }

  static Start(){
    if(GameState.Ready && !GameState.OnReadyCalled){
      GameState.OnReadyCalled = true;
      GameState.processEventListener('ready');
      GameState.VideoManager.playMovieQueue();
      GameState.MenuManager.MainMenu.Start();
      window.dispatchEvent(new Event('resize'));

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

    if (GameState.VideoManager.bikObject) {
      GameState.VideoManager.bikObject.resize(width, height);
    }

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

  static tUpdateSelectable = 0;

  public static getSelectableObjectsInRange(player: ModuleObject): ModuleObject[] {

    const objects = [
      ...GameState.module.area.placeables, 
      ...GameState.module.area.doors, 
      ...GameState.module.area.creatures,
      ...GameState.module.area.triggers.filter((trig) => trig.type == ModuleTriggerType.TRAP)
    ];

    for(let i = 0; i < GameState.PartyManager.party.length; i++){
      if(!i){ continue; }
      objects.push(GameState.PartyManager.party[i]);
    }

    const selectableObjects: ModuleObject[] = [];

    const objCount = objects.length;
    let obj: ModuleObject;
    let dir = new THREE.Vector3();
    const losZ = 1;
    const playerPosition = player.position.clone();
    playerPosition.z += losZ;

    const targetPosition = new THREE.Vector3();
    
    let distance = 0;
    for(let i = 0; i < objCount; i++){
      obj = objects[i];

      if(!obj.isUseable()){ continue; }

      const isDoor = BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor);
      if(isDoor){
        if((obj as ModuleDoor).isOpen()){ continue; };
      }

      targetPosition.copy(obj.position);
      if(!BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
        targetPosition.z += losZ;
      }else{
        targetPosition.z += 0.1;
      }

      distance = targetPosition.distanceTo(playerPosition);
      if(distance > GameState.maxSelectableDistance){
        continue;
      }

      dir.copy(targetPosition);
      dir.sub(playerPosition);
      // dir.negate();
      dir.normalize();

      if(obj.model){
        GameState.raycaster.set(playerPosition, dir);

        //Check that we can see the object
        let los = GameState.raycaster.intersectObjects([...GameState.group.room_walkmeshes.children, obj.model], true);

        //If the object a door ignore it's walkmesh
        if(isDoor && los.length){
          los = los.filter( (intersect) => {
            intersect.object.uuid != obj.collisionManager.walkmesh.mesh.uuid
          });
        }

        const intersect = los[0];
        if(intersect && Array.isArray(obj.model.userData.uuids) && obj.model.userData.uuids.indexOf(intersect.object.uuid) == -1){
          continue;
        }
      }
      
      selectableObjects.push(obj);
    }

    if(selectableObjects.indexOf(GameState.CursorManager.selectedObject) == -1){
      GameState.CursorManager.selectedObject = undefined;
      GameState.CursorManager.selected = undefined;
    }

    if(selectableObjects.indexOf(GameState.CursorManager.hoveredObject) == -1){
      GameState.CursorManager.hoveredObject = undefined;
      GameState.CursorManager.hovered = undefined;
    }

    return selectableObjects;
  }

  static ResetModuleAudio(){                        
    GameState.CutsceneManager.audioEmitter = 
    this.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine(), AudioEngineChannel.VO);
    this.audioEmitter.maxDistance = 50;
    this.audioEmitter.type = AudioEmitterType.GLOBAL;
    this.audioEmitter.load();
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
    GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);
    /**
     * Set the game mode to loading
     */
    GameState.SetEngineMode(EngineMode.LOADING);
    GameState.MenuManager.ClearMenus();

    GameState.UnloadModule();

    GameState.MenuManager.LoadScreen.setProgress(0);
    await GameState.MenuManager.LoadScreen.setLoadBackground('load_'+name);
    GameState.MenuManager.LoadScreen.showRandomHint();
    GameState.MenuManager.LoadScreen.open();

    await GameState.MenuManager.LoadInGameMenus();
    
    GameState.VideoEffectManager.SetVideoEffect(-1);
    CursorManager.selectableObjects = [];
    GameState.VideoManager.queueMovie(sMovie1);
    GameState.VideoManager.queueMovie(sMovie2);
    GameState.VideoManager.queueMovie(sMovie3);
    GameState.VideoManager.queueMovie(sMovie4);
    GameState.VideoManager.queueMovie(sMovie5);
    GameState.VideoManager.queueMovie(sMovie6);
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

    //Reveal the area
    GameState.MenuManager.LoadScreen.close();
    if(!GameState.holdWorldFadeInForDialog){
      GameState.FadeOverlayManager.FadeIn(2.5, 0, 0, 0, 1);
    }
    GameState.module.area.musicBackgroundPlay();
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
    console.log('SetEngineMode: ', mode);
    GameState.Mode = mode;
    if(mode == EngineMode.LOADING){
      if(GameState.MenuManager.LoadScreen){
        GameState.MenuManager.LoadScreen.setProgress(0);
        GameState.MenuManager.LoadScreen.open();
      }
    }

    if(mode != EngineMode.INGAME){
      if(GameState.MenuManager.InGameBark)
        GameState.MenuManager.InGameBark.hide();
  
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

  static getCameraById(id = 0){
    for(let i = 0; i < GameState.staticCameras.length; i++){
      if(GameState.staticCameras[i].userData.ingameID == id)
        return GameState.staticCameras[i];
    }

    return GameState.currentCamera;
  }

  static forwardVector = new THREE.Vector3(0, 0, );

  static Update(){
    
    requestAnimationFrame( GameState.Update );

    // if(GameState.Debugger.showFPS && GameState.stats.m){
      // GameState.stats.showPanel(GameState.Debugger.showFPS);
    // }

    GameState.forwardVector.set(0, 0, -1);

    let delta = GameState.clock.getDelta();
    GameState.processEventListener('beforeRender', [delta]);
    GameState.delta = delta;
    GameState.deltaTime += delta;
    GameState.deltaTimeFixed += (1/60);
    GameState.clampedDelta = Math.max(0, Math.min(delta, 0.016666666666666666 * 5));

    GameState.limiter.now = Date.now();
    GameState.limiter.elapsed = GameState.limiter.now - GameState.limiter.then;

    /**
     * Pause the main loop if the debugger is active
     */
    if(GameState.debugMode && !!GameState.Debugger.state){

      return;
    }

    GameState.controls.Update(delta);
    GameState.scene_cursor_holder.visible = GameState.Mode != EngineMode.MOVIE;
    if(GameState.Mode == EngineMode.MOVIE || GameState.VideoManager.isMoviePlaying()){
      GameState.Mode = EngineMode.MOVIE;
      GameState.VideoManager.update(delta);
      GameState.renderer.render(GameState.scene_movie, GameState.camera_gui);
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

    if(
      GameState.Mode == EngineMode.MINIGAME || 
      GameState.Mode == EngineMode.DIALOG || 
      GameState.Mode == EngineMode.INGAME ||
      GameState.Mode == EngineMode.FREELOOK
    ){

      //Get Selectable Objects In Range
      if(GameState.Mode == EngineMode.INGAME){
        GameState.tUpdateSelectable -= delta || 0;
        if(GameState.tUpdateSelectable <= 0){
          //Update the cache of selectable objects
          CursorManager.selectableObjects = GameState.getSelectableObjectsInRange(PartyManager.party[0]);
          GameState.tUpdateSelectable = 0.5;
        }
      }

      //Update Mode Camera
      if(GameState.Mode == EngineMode.INGAME){
        //Make sure we are using the follower camera while ingame
        GameState.currentCamera = GameState.camera;
        GameState.VideoEffectManager.SetVideoEffect(-1);
        if(GameState.getCurrentPlayer()){
          GameState.forwardVector.copy(GameState.getCurrentPlayer().forceVector).multiplyScalar(100);
          GameState.forwardVector.z = -1;
        }
      }else if(GameState.Mode == EngineMode.FREELOOK){
        GameState.VideoEffectManager.SetVideoEffect(-1);
        const player = GameState.getCurrentPlayer();
        if(player){
          const appearance = player.getAppearance();
          if(appearance){
            const effectId = appearance.freelookeffect;
            if(!isNaN(effectId)){
              GameState.VideoEffectManager.SetVideoEffect(effectId);
            }
          }
        }
      }

      GameState.frustumMat4.multiplyMatrices( GameState.currentCamera.projectionMatrix, GameState.currentCamera.matrixWorldInverse )
      GameState.viewportFrustum.setFromProjectionMatrix(GameState.frustumMat4);
      GameState.currentCameraPosition.set(0, 0, 0);
      GameState.currentCameraPosition.applyMatrix4(FollowerCamera.camera.matrix);

      GameState.updateTime(delta);

      //Handle Module Tick
      if(
        GameState.State == EngineState.PAUSED ||
        GameState.MenuManager.activeModals.length
      ){
        GameState.module.tickPaused(delta);
      }else{
        GameState.module.tick(delta);

        //Update the Bark Overlay if it is visible
        if(GameState.MenuManager.InGameBark?.bVisible){
          GameState.MenuManager.InGameBark.update(delta);
        }
      }
      
      //TODO: Move Cursor Logic Into Global Cursor Manager
      if(GameState.Mode == EngineMode.DIALOG){
        if(
          GameState.MenuManager.InGameDialog.isVisible() && 
          !GameState.MenuManager.InGameDialog.LB_REPLIES.isVisible() && 
          GameState.scene_cursor_holder.visible
        ){
          GameState.scene_cursor_holder.visible = false;
        }
        GameState.CutsceneManager.update(delta);
      }

      if(
        GameState.Mode == EngineMode.INGAME || 
        GameState.Mode == EngineMode.DIALOG
      ){
        GameState.FadeOverlayManager.Update(delta);
        GameState.frustumMat4.multiplyMatrices( GameState.currentCamera.projectionMatrix, GameState.currentCamera.matrixWorldInverse )
        GameState.viewportFrustum.setFromProjectionMatrix(GameState.frustumMat4);
        if(GameState.Mode == EngineMode.DIALOG){
          GameState.lightManager.update(delta, GameState.currentCamera);
          GameState.module.area.updateRoomAnimatedLights(delta);
        }else{
          GameState.lightManager.update(delta, GameState.getCurrentPlayer());
          GameState.currentCamera = GameState.camera;
          GameState.module.area.updateRoomAnimatedLights(delta);
        }
        
        //Handle the visibility of the PAUSE overlay
        if(GameState.State == EngineState.PAUSED && GameState.MenuManager.InGameOverlay.isVisible()){
          if(!GameState.MenuManager.InGamePause.isVisible())
            GameState.MenuManager.InGamePause.show();
        }else{
          if(GameState.MenuManager.InGamePause.isVisible())
            GameState.MenuManager.InGamePause.hide();
        }
      }else if(GameState.Mode == EngineMode.MINIGAME){
        GameState.FadeOverlayManager.Update(delta);
        GameState.lightManager.update(delta, GameState.getCurrentPlayer());
        GameState.module.area.updateRoomAnimatedLights(delta);
      }

      if(GameState.Mode == EngineMode.INGAME){
        if(GameState.MenuManager.InGameAreaTransition.transitionObject){
          GameState.MenuManager.InGameAreaTransition.show();
        }
      }

      //Handle visibility state for debug helpers
      if(GameState.Mode == EngineMode.INGAME){
        let obj: any;
        for(let i = 0, len = GameState.group.room_walkmeshes.children.length; i < len; i++){
          obj = GameState.group.room_walkmeshes.children[i];
          if(obj.type === 'Mesh'){
            obj.material.visible = true;//ConfigClient.get('GameState.debug.show_collision_meshes');
          }
        }
  
        for(let i = 0, len = GameState.walkmeshList.length; i < len; i++){
          obj = GameState.walkmeshList[i];
          if(obj.type === 'Mesh'){
            obj.material.visible = true;//ConfigClient.get('GameState.debug.show_collision_meshes');
          }
        }
    
        for(let i = 0, len = GameState.collisionList.length; i < len; i++){
          obj = GameState.collisionList[i];
          if(obj.type === 'Mesh'){
            obj.material.visible = false;
          }
        }
        
        for(let i = 0, len = GameState.group.path_helpers.children.length; i < len; i++){
          obj = GameState.group.path_helpers.children[i];
          if(obj){
            obj.visible = ConfigClient.get('GameState.debug.show_path_helpers');
          }
        }
      }

    }

    AudioEngine.GetAudioEngine().update(delta, GameState.currentCamera.position, GameState.currentCamera.rotation, GameState.forwardVector);
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);

    GameState.renderPass.camera = GameState.currentCamera;
    //GameState.renderPassAA.camera = GameState.currentCamera;
    GameState.bokehPass.camera = GameState.currentCamera;

    GameState.composer.render(delta);

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