import * as THREE from "three";

import { AnimatedTexture } from "./AnimatedTexture";
import { CombatEngine } from "./combat";
import { GameMenu, MenuManager, GUIListBox } from "./gui";
import { Module, ModuleObject, ModuleDoor, ModulePlaceable, ModuleCreature, ModuleArea } from "./module";
import { IngameControls, Mouse } from "./controls";

import { PartyManager } from "./managers/PartyManager";
import { CursorManager } from "./managers/CursorManager";
import { FadeOverlayManager } from "./managers/FadeOverlayManager";
import { ShaderManager } from "./managers/ShaderManager";
import { LightManager } from "./managers/LightManager";
import { TwoDAManager } from "./managers/TwoDAManager";
import { CameraShakeManager } from "./managers/CameraShakeManager";

import { INIConfig } from "./INIConfig";
import { FactionManager } from "./FactionManager";
import { LoadingScreen } from "./LoadingScreen";
import { Planetary } from "./Planetary";
import { SaveGame } from "./SaveGame";
import { VideoPlayer } from "./VideoPlayer";

import { MDLLoader } from "./three/MDLLoader";
import EngineLocation from "./engine/EngineLocation";
import { OdysseyModel3D, OdysseyObject3D } from "./three/odyssey";
import { NWScript } from "./nwscript/NWScript";
import { AudioEngine, AudioEmitter } from "./audio";
import { ResourceLoader } from "./resource/ResourceLoader";
import { TGAObject } from "./resource/TGAObject";
import { TextureLoader } from "./loaders/TextureLoader";

import { EngineGlobals } from "./interface/engine/EngineGlobals";
import { GameStateGroups } from "./interface/engine/GameStateGroups";

import { AudioEngineChannel } from "./enums/audio/AudioEngineChannel";
import { TextureType } from "./enums/loaders/TextureType";
import { CreatureType } from "./enums/nwscript/CreatureType";
import { ReputationType } from "./enums/nwscript/ReputationType";
import { EngineState } from "./enums/engine/EngineState";
import { EngineMode } from "./enums/engine/EngineMode";
import { GameEngineType } from "./enums/engine/GameEngineType";
import { GameEngineEnv } from "./enums/engine/GameEngineEnv";
import { EngineContext } from "./enums/engine/EngineContext";
import { ModuleObjectType } from "./enums/nwscript/ModuleObjectType";

import { ApplicationProfile } from "./utility/ApplicationProfile";
import { ConfigClient } from "./utility/ConfigClient";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import { ModuleObjectManager } from "./managers/ModuleObjectManager";
import Stats from 'three/examples/jsm/libs/stats.module'
import { GlobalVariableManager } from "./managers/GlobalVariableManager";

const saturationShader: any = {
  uniforms: {
    "tDiffuse": { type: "t", value: null },
    "saturation": { type: "f", value: 1.0 },
  },
  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "}"
  ].join("\n"),
  fragmentShader: [
    "uniform sampler2D tDiffuse;",
    "varying vec2 vUv;",
    "uniform float saturation;",
    "void main() {",
      "vec3 original_color = texture2D(tDiffuse, vUv).rgb;",
      "vec3 lumaWeights = vec3(.25,.50,.25);",
      "vec3 grey = vec3(dot(lumaWeights,original_color));",
      "gl_FragColor = vec4(grey + saturation * (original_color - grey) ,1.0);",
    "}"
  ].join("\n")
};


// These are for GetFirstInPersistentObject() and GetNextInPersistentObject()
export const PERSISTENT_ZONE_ACTIVE = 0;
export const PERSISTENT_ZONE_FOLLOW = 1;

export interface GameStateInitializeOptions {
  Game: GameEngineType,
  GameDirectory: string, //path to the local game install directory
  Env: GameEngineEnv,
};

export class GameState implements EngineContext {

  static eventListeners: any = {
    "init": [],
    "start": [],
    "ready": [],

    "beforeRender": [],
    "afterRender": [],
  };

  static activeMenu: GameMenu;
  static activeGUIElement: any;
  static hoveredGUIElement: any;


  static Location: any;

  static GameKey: GameEngineType = GameEngineType.KOTOR;
  static iniConfig: INIConfig;
  static AnimatedTextures: AnimatedTexture[] = [];
  static ModelLoader: MDLLoader = new MDLLoader();
  
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
  
  static debug = {
    controls: false,
    selectedObject: false
  };
  
  static IsPaused = false;
  static inDialog = false;
  
  static Mode: EngineMode = EngineMode.MAINMENU;
  static holdWorldFadeInForDialog = false;
  static autoRun = false;
  static AlphaTest = 0.5;
  static noClickTimer = 0;
  static maxSelectableDistance = 20;

  static delta: number = 0;
  static clampedDelta: number = 0;

  static SaveGame: SaveGame;
  
  static _emitters = {};
  
  static currentGamepad: Gamepad;
  static models: any[];
  static videoEffect: any;
  static onScreenShot?: Function;
  static time: number;
  static deltaTime: number;

  static canvas: HTMLCanvasElement;
  static context: WebGLRenderingContext;
  static rendererUpscaleFactor: number;
  static renderer: THREE.WebGLRenderer;
  static depthTarget: THREE.WebGLRenderTarget;
  static clock: THREE.Clock;
  static stats: Stats;

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

  //Cursor properties
  static selected: any;
  static hovered: any;

  static scene: any;
  static scene_gui: any;

  //Camera properties
  static frustumMat4: any;
  static camera: THREE.PerspectiveCamera;
  static currentCamera: THREE.Camera;
  static followerCamera: THREE.PerspectiveCamera;
  static camera_dialog: THREE.PerspectiveCamera;
  static camera_animated: THREE.PerspectiveCamera;
  static camera_gui: THREE.OrthographicCamera;
  static currentCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  static staticCameras: THREE.PerspectiveCamera[];
  static animatedCameras: any[];
  static staticCameraIndex: number;
  static animatedCameraIndex: number;
  static cameraMode: any;
  static viewportFrustum: THREE.Frustum;
  static viewportProjectionMatrix: THREE.Matrix4;

  //GameState properties
  static globalLight: THREE.AmbientLight;
  static player: ModuleCreature;
  static playerFeetOffset: THREE.Vector3;
  static collisionList: any[];
  static walkmeshList: any[];

  static group: GameStateGroups = {
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
  };
  static weather_effects: any[];
  static interactableObjects: any[];

  static scene_cursor_holder: THREE.Group;
  static controls: IngameControls;

  //Render pass properties
  static composer: any;
  static renderPass: any;
  static renderPassAA: any;
  static saturationPass: any;
  static colorPass: any;
  static copyPass: any;
  static renderPassGUI: any;
  static bloomPass: any;
  static bokehPass: any;
  static filmPass: any;
  
  static module: Module;
  static TutorialWindowTracker: any[];
  static audioEngine: AudioEngine;
  static audioEmitter: AudioEmitter;
  static guiAudioEmitter: any;
  static State: EngineState;
  static inMenu: boolean;
  static OnReadyCalled: boolean;
  static selectedObject: any;
  static hoveredObject: any;
  
  static loadingTextures: boolean;
  static MenuActive: any;
  static VideoEffect: any;

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

  static Init(){
    GameState.processEventListener('init');
    if(GameState.GameKey == 'TSL'){
      GameState.iniConfig = new INIConfig('swkotor2.ini', INIConfig.defaultConfigs.swKotOR2);
    }else{
      GameState.iniConfig = new INIConfig('swkotor.ini', INIConfig.defaultConfigs.swKotOR);
    }
    
    GameState.models = [];

    GameState.videoEffect = null;

    GameState.activeGUIElement = undefined;
    GameState.hoveredGUIElement = undefined;
    GameState.onScreenShot = undefined;

    GameState.time = 0;
    GameState.deltaTime = 0;

    GameState.canvas = document.createElement( 'canvas' );
    //GameState.canvas = GameState.renderer.domElement;

    GameState.canvas.classList.add('noselect');
    GameState.canvas.setAttribute('tabindex', '1');
    document.getElementById('renderer-container').appendChild(GameState.canvas);
    
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
      logarithmicDepthBuffer: false,
      alpha: true,
      preserveDrawingBuffer: false
    });

    GameState.renderer.autoClear = false;
    GameState.renderer.setSize( window.innerWidth, window.innerHeight );
    GameState.renderer.setClearColor(0x000000);

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		GameState.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    GameState.depthTarget.texture.generateMipmaps = false;
    GameState.depthTarget.stencilBuffer = false;
    GameState.depthTarget.depthBuffer = true;
    GameState.depthTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    GameState.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    (window as any).renderer = GameState.renderer;

    GameState.clock = new THREE.Clock();
    GameState.stats = Stats();

    GameState.activeMenu = undefined;

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

    GameState.selected = undefined;
    GameState.hovered = undefined;

    GameState.scene = new THREE.Scene();
    GameState.scene_gui = new THREE.Scene();
    GameState.frustumMat4 = new THREE.Matrix4();
    GameState.camera = GameState.followerCamera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 0.01, 15000 );

    GameState.camera_dialog = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 0.01, 15000 );
    GameState.camera_dialog.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera_animated = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 0.01, 15000 );
    GameState.camera_animated.up = new THREE.Vector3( 0, 1, 0 );
    GameState.camera.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    GameState.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    
    GameState.camera_gui = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1, 1000
    );
    GameState.camera_gui.up = new THREE.Vector3( 0, 0, 1 );
    GameState.camera_gui.position.z = 500;
    GameState.camera_gui.updateProjectionMatrix();
    GameState.scene_gui.add(new THREE.AmbientLight(0x60534A));

    GameState.followerCamera.userData.facing = Math.PI/2;
    GameState.followerCamera.userData.speed = 0;

    //Static Camera's that are in the .git file of the module
    GameState.staticCameras = [];
    //Animates Camera's are MDL files that have a camera_hook and animations for use in dialog
    GameState.animatedCameras = [];

    GameState.staticCameraIndex = 0;
    GameState.animatedCameraIndex = 0;
    // GameState.cameraMode = GameState.CameraMode.EDITOR;
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

    GameState.player = undefined;//new ModuleCreature();//AuroraObject3D();
    GameState.playerFeetOffset = new THREE.Vector3(0,0,1);

    GameState.collisionList = [];
    GameState.walkmeshList = [];
    GameState.group = {
      creatures: new THREE.Group(),
      doors: new THREE.Group(),
      placeables: new THREE.Group(),
      rooms: new THREE.Group(),
      grass: new THREE.Group(),
      sounds: new THREE.Group(),
      triggers: new THREE.Group(),
      waypoints: new THREE.Group(),
      party: new THREE.Group(),
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      shadow_lights: new THREE.Group(),
      path_helpers: new THREE.Group(),
      emitters: new THREE.Group(),
      effects: new THREE.Group(),
      stunt: new THREE.Group(),
      weather_effects: new THREE.Group(),
      room_walkmeshes: new THREE.Group(),
    };

    GameState.weather_effects = [];

    GameState.scene.add(GameState.group.rooms);
    // GameState.scene.add(GameState.group.grass);
    GameState.scene.add(GameState.group.placeables);
    GameState.scene.add(GameState.group.doors);
    GameState.scene.add(GameState.group.creatures);
    // //GameState.scene.add(GameState.group.waypoints);
    // //GameState.scene.add(GameState.group.sounds);
    // GameState.scene.add(GameState.group.triggers);
    // GameState.scene.add(GameState.group.stunt);
    // GameState.scene.add(GameState.group.weather_effects);

    GameState.scene.add(GameState.group.lights);
    // GameState.scene.add(GameState.group.light_helpers);
    // GameState.scene.add(GameState.group.shadow_lights);
    // GameState.scene.add(GameState.group.path_helpers);
    // GameState.scene.add(GameState.group.emitters);
    // GameState.scene.add(GameState.group.effects);

    GameState.scene.add(GameState.group.party);
    // GameState.scene.add(GameState.group.room_walkmeshes);

    GameState.group.light_helpers.visible = false;

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

    GameState.controls = new IngameControls(GameState.currentCamera, GameState.canvas, this);

    // document.getElementById('#renderer-containe').appendChild(GameState.stats.dom);
    // if(!ConfigClient.get('GameState.debug.show_fps'))
    //   GameState.stats.showPanel(false);

    //BEGIN: PostProcessing
    GameState.composer = new EffectComposer(GameState.renderer);
    GameState.renderPass = new RenderPass(GameState.scene, GameState.currentCamera);
    GameState.renderPassAA = new SSAARenderPass (GameState.scene, GameState.currentCamera);
    GameState.saturationPass = new ShaderPass(saturationShader);
    GameState.colorPass = new ShaderPass(ColorCorrectionShader);
    GameState.copyPass = new ShaderPass(CopyShader);
    GameState.renderPassGUI = new RenderPass(GameState.scene_gui, GameState.camera_gui);
    
    GameState.bloomPass = new BloomPass(0.5);
    GameState.bokehPass = new BokehPass(GameState.scene, GameState.currentCamera, {
      focus: 1.0,
      aperture:	0.0001,
      maxblur:	1.0,
      width: window.innerWidth,
      height: window.innerHeight
    });
    GameState.filmPass = new FilmPass(1, 0.325, 512);

    GameState.renderPassAA.sampleLevel = 1;

    GameState.renderPass.renderToScreen = false;
    GameState.copyPass.renderToScreen = false;
    GameState.renderPassGUI.renderToScreen = false;

    GameState.renderPass.clear = true;
    GameState.bloomPass.clear = false;
    GameState.filmPass.clear = false;
    GameState.colorPass.clear = false;
    GameState.saturationPass.clear = false;
    GameState.renderPassAA.clear = false;
    GameState.copyPass.clear = false;
    GameState.renderPassGUI.clear = false;
    GameState.renderPassGUI.clearDepth = true;

    GameState.colorPass.uniforms.powRGB.value.set(1, 1, 1);
    GameState.colorPass.uniforms.mulRGB.value.set(0.5, 0.5, 0.5);

    GameState.bokehPass.needsSwap = true;
    GameState.bokehPass.enabled = false;

    GameState.composer.addPass(GameState.renderPass);
    // GameState.composer.addPass(GameState.bokehPass);
    // GameState.composer.addPass(GameState.renderPassAA);
    // GameState.composer.addPass(GameState.filmPass);
    // GameState.composer.addPass(GameState.colorPass);
    // GameState.composer.addPass(GameState.saturationPass);
    // GameState.composer.addPass(GameState.bloomPass);

    GameState.composer.addPass(GameState.renderPassGUI);
    GameState.composer.addPass(GameState.copyPass);

    GameState.renderPass.clearDepth = true;
    GameState.renderPassGUI.clearDepth = true;
    GameState.renderPass.clear = true;
    GameState.renderPassGUI.clear = false;
    GameState.renderPass.needsSwap = false;
    GameState.renderPassGUI.needsSwap = false;

    FadeOverlayManager.Initialize();

    window.addEventListener('resize', () => {
      GameState.EventOnResize();
    });
    console.log('Game: Start')
    try{
      ShaderManager.Init();
      GameState.Start();
    }catch(e){
      console.error(e);
    }
  }

  static Start(){

    GameState.TutorialWindowTracker = [];
    LightManager.setLightHelpersVisible(ConfigClient.get('GameState.debug.light_helpers') ? true : false);

    GameState.audioEngine = new AudioEngine();
    GameState.initGUIAudio();
    LightManager.init();

    Planetary.Init();

    GameState.audioEmitter = new AudioEmitter({
      engine: GameState.audioEngine,
      props: {
        XPosition: 0,
        YPosition: 0,
        ZPosition: 0
      },
      template: {
        sounds: [],
        isActive: true,
        isLooping: false,
        isRandom: false,
        isRandomPosition: false,
        interval: 0,
        intervalVariation: 0,
        maxDistance: 100,
        volume: 127,
        positional: 0
      },
      onLoad: () => {
      },
      onError: () => {
      }
    });

    //AudioEngine.Unmute()
    GameState.Mode = EngineMode.MAINMENU;
    GameState.State = EngineState.RUNNING;
    GameState.inMenu = false;
    GlobalVariableManager.Init();
    
    console.log('SaveGames: Loading');
    SaveGame.GetSaveGames().then( () => {
      console.log('SaveGames: Complete');
      
      console.log('CursorManager: Init');
      CursorManager.init( () => {
        console.log('CursorManager: Complete');
        console.log('MenuLoader: Init');
        MenuManager.Init();
        MenuManager.LoadGameMenus().then( () => {
          console.log('MenuLoader: Complete');

          MenuManager.MenuJournal.childMenu = MenuManager.MenuTop;
          MenuManager.MenuInventory.childMenu = MenuManager.MenuTop;
          MenuManager.MenuEquipment.childMenu = MenuManager.MenuTop;
          MenuManager.MenuCharacter.childMenu = MenuManager.MenuTop;
          MenuManager.MenuMessages.childMenu = MenuManager.MenuTop;
          MenuManager.MenuOptions.childMenu = MenuManager.MenuTop;
          MenuManager.MenuMap.childMenu = MenuManager.MenuTop;
          MenuManager.MenuAbilities.childMenu = MenuManager.MenuTop;

          //Preload fx textures
          TextureLoader.enQueue(
            ['fx_tex_01', 'fx_tex_02', 'fx_tex_03', 'fx_tex_04', 'fx_tex_05', 'fx_tex_06', 'fx_tex_07', 'fx_tex_08',
            'fx_tex_09', 'fx_tex_10', 'fx_tex_11', 'fx_tex_12', 'fx_tex_13', 'fx_tex_14', 'fx_tex_15', 'fx_tex_16',
            'fx_tex_17', 'fx_tex_18', 'fx_tex_19', 'fx_tex_20', 'fx_tex_21', 'fx_tex_22', 'fx_tex_23', 'fx_tex_24',
            'fx_tex_25', 'fx_tex_26', 'fx_tex_stealth'],
            undefined,
            TextureType.TEXTURE
          );

          TextureLoader.LoadQueue(() => {
            GameState.Ready = true;
            LoadingScreen.main.Hide();
            if(GameState.OpeningMoviesComplete){
              GameState.OnReady();
            }
          });
        });

      });

    });

  }

  static OnReady(){
    if(GameState.Ready && !GameState.OnReadyCalled){
      GameState.OnReadyCalled = true;
      GameState.processEventListener('ready');
      MenuManager.MainMenu.Open();
      window.dispatchEvent(new Event('resize'));
      // this.setTestingGlobals();
      //GameState.Update = GameState.Update.bind(this);
      console.log('begin');
      GameState.Update();
    }
  }

  static EventOnResize(){
    let width = window.innerWidth;
    let height = window.innerHeight;

    GameState.composer.setSize(width * GameState.rendererUpscaleFactor, height * GameState.rendererUpscaleFactor);

    FadeOverlayManager.plane.scale.set(width, height, 1);
    
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

    /*if(GameState.scene_gui.background != null){
      let x = width / 1600;
      let y = height / 1200;

      GameState.scene_gui.background.repeat.set(x, y);
      GameState.scene_gui.background.offset.set( (1.0 - x) / 2, (1.0 - y) / 2);
    }*/

    GameState.screenCenter.x = ( (window.innerWidth/2) / window.innerWidth ) * 2 - 1;
    GameState.screenCenter.y = - ( (window.innerHeight/2) / window.innerHeight ) * 2 + 1; 

    MenuManager.Resize();

    GameState.depthTarget.setSize(window.innerWidth * GameState.rendererUpscaleFactor, window.innerHeight * GameState.rendererUpscaleFactor);
  }

  static initGUIAudio(){
    try{

      GameState.guiAudioEmitter = new AudioEmitter({
        engine: GameState.audioEngine,
        props: {
          XPosition: 0,
          YPosition: 0,
          ZPosition: 0
        },
        template: {
          sounds: [],
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 100,
          volume: 127,
          positional: 0
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });

      GameState.audioEngine.AddEmitter(GameState.guiAudioEmitter);
    }catch(e){

    }
  }

  static updateRendererUpscaleFactor(){
    this.EventOnResize();
  }

  public static getCurrentPlayer(): ModuleCreature {
    let p = PartyManager.party[0];
    return p ? p : GameState.player;
  }

  public static onMouseHitInteractive( onSuccess?: Function){
    
    GameState.raycaster.setFromCamera( Mouse.position, GameState.currentCamera );
    let intersects = GameState.raycaster.intersectObjects( GameState.interactableObjects, true );

    const getNodeModuleObject = function (node: THREE.Object3D, isCurrentPlayerSelectable: boolean = false): ModuleObject|undefined {
      const moduleObject: ModuleObject = node?.userData?.moduleObject;
      if(moduleObject){
        if(moduleObject != GameState.getCurrentPlayer() || isCurrentPlayerSelectable){
          return moduleObject;
        }
      }
      return;
    }

    if(intersects.length){
      const intersection = intersects[0],
          obj = intersection.object;
      
      let searching = true;

      //Does this node contain a ModuleObject reference
      const moduleObject = getNodeModuleObject(obj);
      if(moduleObject){
        if(typeof onSuccess === 'function')
          onSuccess(moduleObject, intersection);
        return;
      }else{
        //Bubble up to try and find a ModuleObject reference
        obj.traverseAncestors( (parentNode: THREE.Object3D) => {
          if(!searching) return;
          const moduleObject = getNodeModuleObject(parentNode);
          if(moduleObject){
            searching = false;
            if(typeof onSuccess === 'function')
              onSuccess(moduleObject, intersection);
            return;
          }
        });
      }
    }
  }

  public static setReticleSelectedObject( object: ModuleObject ){
    if(object instanceof ModuleObject){
      GameState.selected = object.getReticleNode();
      if(GameState.selected){
        GameState.selected.getWorldPosition(CursorManager.reticle2.position);
        GameState.selectedObject = object;
      }

      if(object instanceof ModuleDoor){      
        CursorManager.setReticle2('reticleF2');
      }else if(object instanceof ModulePlaceable){
        if(!object.isUseable()){
          return;
        }      
        CursorManager.setReticle2('reticleF2');
      }else if(object instanceof ModuleCreature){
        if(object.isHostile(GameState.getCurrentPlayer())){
          CursorManager.setReticle2('reticleH2');
        }else{
          CursorManager.setReticle2('reticleF2');
        }
      }
    }
  }

  public static setReticleHoveredObject( object: ModuleObject ){
    if(object instanceof ModuleObject){
      let distance = GameState.getCurrentPlayer().position.distanceTo(object.position);
      let canChangeCursor = (distance <= GameState.maxSelectableDistance) || (GameState.hoveredObject == GameState.selectedObject);

      GameState.hovered = object.getReticleNode();
      if(GameState.hovered){
        GameState.hovered.getWorldPosition(CursorManager.reticle.position);
        GameState.hoveredObject = object;
      }

      if(object instanceof ModuleDoor){
        if(canChangeCursor)
          CursorManager.setCursor('door');
        else
          CursorManager.setCursor('select');

        CursorManager.setReticle('reticleF');
      }else if(object instanceof ModulePlaceable){
        if(!object.isUseable()){
          return;
        }
        if(canChangeCursor)
          CursorManager.setCursor('use');
        else
          CursorManager.setCursor('select');

        CursorManager.setReticle('reticleF');
      }else if(object instanceof ModuleCreature){

        if(object.isHostile(GameState.getCurrentPlayer())){
          if(!object.isDead()){
            if(canChangeCursor)
              CursorManager.setCursor('attack');
            else
              CursorManager.setCursor('select');

            CursorManager.setReticle('reticleH');
          }else{
            if(canChangeCursor)
              CursorManager.setCursor('use');
            else
              CursorManager.setCursor('select');

            CursorManager.setReticle('reticleF');
          }
        }else{
          if(canChangeCursor)
            CursorManager.setCursor('talk');
          else
            CursorManager.setCursor('select');

          CursorManager.setReticle('reticleF');
        }

      }
    }
  }

  static updateCursorPosition(){
    CursorManager.setCursor('default');
    GameState.scene_cursor_holder.position.x = Mouse.positionClient.x - (window.innerWidth/2) + (32/2);
    GameState.scene_cursor_holder.position.y = (Mouse.positionClient.y*-1) + (window.innerHeight/2) - (32/2);
  }

  static updateCursor(){
    let cursorCaptured = false;
    let guiHoverCaptured = false;

    GameState.hoveredGUIElement = undefined;

    let uiControls = GameState.controls.MenuGetActiveUIElements();
    let controlCount = uiControls.length;
    for(let i = 0; i < controlCount; i++){
      let control = uiControls[i];
      if(!control.isVisible())
        continue;

      //if(control === GameState.mouse.clickItem){
      if(control instanceof GUIListBox && GameState.hoveredGUIElement == undefined){
        GameState.hoveredGUIElement = control;
      }

      if(!(control.widget.parent.type === 'Scene')){
        if(!guiHoverCaptured){
          let cMenu = control.menu;
          cMenu.SetWidgetHoverActive(control, true);
          guiHoverCaptured = false;
        }

        if(typeof control.isClickable == 'function'){
          if(control.isClickable()){
            CursorManager.setCursor('select');
            cursorCaptured = true;
          }
        }
      }
      //}
    }

    CursorManager.arrow.visible = false;
    if(GameState.selectedObject instanceof ModuleObject){
      if(GameState.selectedObject.position.distanceTo(GameState.getCurrentPlayer().position) > GameState.maxSelectableDistance){
        GameState.selectedObject = undefined;
      }
    }

    if(!cursorCaptured && GameState.Mode == EngineMode.INGAME && !GameState.inDialog && !GameState.MenuActive){
      if(MenuManager.GetCurrentMenu() == MenuManager.InGameOverlay){
        if(GameState.scene_cursor_holder.visible){
          //console.log(GameState.scene_cursor_holder.position);
          let hoveredObject = false;
          GameState.onMouseHitInteractive( (moduleObject: ModuleObject) => {
            if(moduleObject instanceof ModuleObject && moduleObject.isUseable()){
              if(moduleObject != GameState.getCurrentPlayer()){
                GameState.setReticleHoveredObject(moduleObject);
              }
            }else{
              GameState.hovered = GameState.hoveredObject = undefined;
            }
          });
        }else{
          if(!GameState.selectedObject){
            let closest = ModuleObjectManager.GetNearestInteractableObject();
            GameState.setReticleSelectedObject(closest);
            GameState.setReticleHoveredObject(closest);
          }
        }
      }
    }

    if(GameState.hovered instanceof OdysseyObject3D && !GameState.inDialog){
      GameState.hovered.getWorldPosition(CursorManager.reticle.position);
      CursorManager.reticle.visible = true;
    }else{
      CursorManager.reticle.visible = false;
    }

    if(GameState.selected instanceof OdysseyObject3D && !GameState.inDialog && !MenuManager.MenuContainer.bVisible){
      GameState.selected.getWorldPosition(CursorManager.reticle2.position);
      CursorManager.reticle2.visible = true;
      if(GameState.selectedObject instanceof ModuleDoor){      
        CursorManager.setReticle2('reticleF2');
      }else if(GameState.selectedObject instanceof ModulePlaceable){
        if(!GameState.selectedObject.isUseable()){
          return;
        }      
        CursorManager.setReticle2('reticleF2');
      }else if(GameState.selectedObject instanceof ModuleCreature){
        if(GameState.selectedObject.isHostile(GameState.getCurrentPlayer())){
          CursorManager.setReticle2('reticleH2');
        }else{
          CursorManager.setReticle2('reticleF2');
        }
      }
    }else{
      CursorManager.reticle2.visible = false;
    }

  }




  static LoadModule(name = '', waypoint: string = null, sMovie1 = '', sMovie2 = '', sMovie3 = '', sMovie4 = '', sMovie5 = '', sMovie6 = ''){
    GameState.UnloadModule();
    VideoPlayer.Load(sMovie1, () => {
      VideoPlayer.Load(sMovie2, () => {
        VideoPlayer.Load(sMovie3, () => {
          VideoPlayer.Load(sMovie4, () => {
            VideoPlayer.Load(sMovie5, () => {
              VideoPlayer.Load(sMovie6, async () => {
                //MenuManager.InGameOverlay.Hide();
                GameState.Mode = EngineMode.LOADING;
                
                if(GameState.module instanceof Module){
                  try{ await GameState.module.save(); }catch(e){
                    console.error(e);
                  }
                  try{ GameState.module.dispose(); }catch(e){
                    console.error(e);
                  }
                }

                //Remove all cached scripts and kill all running instances
                NWScript.Reload();

                //Resets all keys to their default state
                GameState.controls.InitKeys();

                FactionManager.Load().then( () => {

                  Module.BuildFromExisting(name, waypoint, (module: Module) => {

                    GameState.scene.visible = false;

                    MenuManager.LoadScreen.setLoadBackground('load_'+name, () => {
                      MenuManager.LoadScreen.showRandomHint();
                      MenuManager.LoadScreen.Open();

                      console.log('Module.loadScene');
                      module.loadScene( (d: any) => {
                        TextureLoader.LoadQueue( () => {
                          FadeOverlayManager.FadeOut(0, 0, 0, 0);
                          module.initEventQueue();
                          console.log('Module.initScripts');
                          module.initScripts( () => {
                            MenuManager.LoadScreen.Close();
                            window.setTimeout( ()=> {
                              //GameState.scene_gui.background = null;
                              GameState.scene.visible = true;
                              
                              AudioEngine.Unmute();
                              if(GameState.module.area.MiniGame){
                                GameState.Mode = EngineMode.MINIGAME
                              }else{
                                GameState.Mode = EngineMode.INGAME;
                              }

                              let runSpawnScripts = !GameState.isLoadingSave;
                              GameState.isLoadingSave = false;
                              
                              MenuManager.InGameComputer.audioEmitter = MenuManager.InGameDialog.audioEmitter = this.audioEmitter = new AudioEmitter({
                                engine: GameState.audioEngine,
                                channel: AudioEngineChannel.VO,
                                props: {
                                  XPosition: 0,
                                  YPosition: 0,
                                  ZPosition: 0
                                },
                                template: {
                                  sounds: [],
                                  isActive: true,
                                  isLooping: false,
                                  isRandom: false,
                                  isRandomPosition: false,
                                  interval: 0,
                                  intervalVariation: 0,
                                  maxDistance: 50,
                                  volume: 127,
                                  positional: 0
                                },
                                onLoad: () => {
                                },
                                onError: () => {
                                }
                              });
                              GameState.audioEngine.AddEmitter(this.audioEmitter);
                              MenuManager.InGameOverlay.RecalculatePosition();
                              MenuManager.InGameOverlay.Open();
                              GameState.renderer.compile(GameState.scene, GameState.currentCamera);

                              if(GameState.module.area.MiniGame){
                                GameState.Mode = EngineMode.MINIGAME
                              }else{
                                GameState.Mode = EngineMode.INGAME;
                              }
                              
                              //console.log('inDialog', GameState.inDialog);
                              //console.log('HOLDFADE', GameState.holdWorldFadeInForDialog, GameState.inDialog);
                              
                              //console.log('runSpawnScripts', runSpawnScripts);
                              console.log('ModuleArea.initAreaObjects');
                              GameState.module.area.initAreaObjects(runSpawnScripts).then( () => {
                                console.log('ModuleArea: ready to play');
                                GameState.module.readyToProcessEvents = true;

                                if(!GameState.holdWorldFadeInForDialog)
                                  FadeOverlayManager.FadeIn(1, 0, 0, 0);

                                if(GameState.Mode == EngineMode.INGAME){
                
                                  let anyCanLevel = false;
                                  for(let i = 0; i < PartyManager.party.length; i++){
                                    if(PartyManager.party[i].canLevelUp()){
                                      anyCanLevel = true;
                                    }
                                  }
                
                                  if(anyCanLevel){
                                    GameState.audioEmitter.PlaySound('gui_level');
                                  }
                
                                }

                              });       
                              
                              GameState.renderer.setClearColor( new THREE.Color(GameState.module.area.SunFogColor) );
                            });

                          });
                          
                        });

                      })

                      //console.log(module);

                      MenuManager.LoadScreen.setProgress(0);

                    });

                  });

                });
              });
            });
          });
        });
      });
    });
  }

  static UnloadModule(){
    MenuManager.ClearMenus();
    GameState.deltaTime = 0;
    // GameState.initTimers();
    ResourceLoader.clearCache();

    GameState.scene.visible = false;
    GameState.inDialog = false;
    ModuleObject.COUNT = 1;
    GameState.renderer.setClearColor(new THREE.Color(0, 0, 0));
    GameState.AlphaTest = 0;
    GameState.holdWorldFadeInForDialog = false;
    GameState.audioEngine.stopBackgroundMusic();
    GameState.audioEngine.Reset();
    CombatEngine.Reset();

    LightManager.clearLights();

    GameState.selected = undefined;
    GameState.selectedObject = undefined;
    GameState.hovered = undefined;
    GameState.hoveredObject = undefined;

    GameState.staticCameras = [];

    if(!AudioEngine.isMuted)
      AudioEngine.Mute();
  }

  static UpdateVideoEffect(){
    if(!isNaN(parseInt(GameState.videoEffect))){
      let effect = TwoDAManager.datatables.get('videoeffects').rows[GameState.videoEffect];
      if(parseInt(effect.enablesaturation)){
        GameState.saturationPass.enabled = true;
        GameState.colorPass.enabled = true;
        GameState.saturationPass.uniforms.saturation.value = parseFloat(effect.saturation);
        GameState.colorPass.uniforms.addRGB.value.set(
          parseFloat(effect.modulationred)-1,
          parseFloat(effect.modulationgreen)-1,
          parseFloat(effect.modulationblue)-1
        );
      }else{
        GameState.saturationPass.enabled = false;
        GameState.colorPass.enabled = false;
      }

      if(parseInt(effect.enablescannoise)){
        GameState.filmPass.uniforms.grayscale.value = true;
        GameState.filmPass.enabled = true;
        GameState.filmPass.uniforms.sCount.value = Math.floor(Math.random() * 256) + 250;
      }else{
        GameState.filmPass.uniforms.grayscale.value = false;
        GameState.filmPass.enabled = false;
      }

    }else{
      GameState.saturationPass.enabled = false;
      GameState.filmPass.enabled = false;
      GameState.colorPass.enabled = false;
    }
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

  static Update(){
    
    /*if(!GameState.visible){
      requestAnimationFrame( GameState.Update );
      return;
    }*/
    requestAnimationFrame( GameState.Update );

    if(!ConfigClient.get('GameState.debug.show_fps')){
      // GameState.stats.showPanel(false);
    }

    let delta = GameState.clock.getDelta();
    GameState.processEventListener('beforeRender', [delta]);
    GameState.delta = delta;
    GameState.clampedDelta = Math.max(0, Math.min(delta, 0.016666666666666666 * 5));

    GameState.limiter.now = Date.now();
    GameState.limiter.elapsed = GameState.limiter.now - GameState.limiter.then;

    GameState.UpdateVideoEffect();
    MenuManager.Update(delta);

    if(!GameState.loadingTextures && TextureLoader.queue.length){
      GameState.loadingTextures = true;
      TextureLoader.LoadQueue( () => {
        GameState.loadingTextures = false;
      });
    } 

    GameState.scene_cursor_holder.visible = true;

    if(GameState.Mode == EngineMode.MINIGAME || (GameState.Mode == EngineMode.INGAME && !GameState.MenuActive && !MenuManager.InGameConfirm.bVisible)){
      //GameState.viewportFrustum.setFromProjectionMatrix(GameState.currentCamera.projectionMatrix);
      GameState.frustumMat4.multiplyMatrices( GameState.currentCamera.projectionMatrix, GameState.currentCamera.matrixWorldInverse )
      GameState.viewportFrustum.setFromProjectionMatrix(GameState.frustumMat4);
      GameState.currentCameraPosition.set(0, 0, 0);
      GameState.currentCameraPosition.applyMatrix4(GameState.followerCamera.matrix);
      GameState.updateTime(delta);

      if(GameState.Mode == EngineMode.MINIGAME || MenuManager.GetCurrentMenu() == MenuManager.InGameOverlay || MenuManager.GetCurrentMenu() == MenuManager.InGameDialog || MenuManager.GetCurrentMenu() == MenuManager.InGameComputer){
        if(GameState.State != EngineState.PAUSED){
          GameState.module.tick(delta);
        }else{
          GameState.module.tickPaused(delta);
        }
      }else if(MenuManager.GetCurrentMenu() == MenuManager.MenuContainer){
        GameState.module.tickPaused(delta);
      }
      
      if(GameState.inDialog){
        if(MenuManager.InGameDialog.IsVisible() && !MenuManager.InGameDialog.LB_REPLIES.isVisible() && GameState.scene_cursor_holder.visible){
          GameState.scene_cursor_holder.visible = false;
        }
      }

    }

    if(GameState.Mode == EngineMode.INGAME){

      FadeOverlayManager.Update(delta);
      GameState.frustumMat4.multiplyMatrices( GameState.currentCamera.projectionMatrix, GameState.currentCamera.matrixWorldInverse )
      GameState.viewportFrustum.setFromProjectionMatrix(GameState.frustumMat4);
      if(GameState.inDialog){
        LightManager.update(delta, GameState.currentCamera);
      }else{
        LightManager.update(delta, GameState.getCurrentPlayer());
      }
      //MenuManager.InGameOverlay.Update(delta);
      //MenuManager.InGameAreaTransition.Update(delta);

      if(!GameState.inDialog){
        GameState.currentCamera = GameState.camera;
      }
      
      if(GameState.State == EngineState.PAUSED && !GameState.MenuActive){
        if(!MenuManager.InGamePause.IsVisible())
          MenuManager.InGamePause.Show();
        
        MenuManager.InGamePause.Update(delta);
      }else{
        if(MenuManager.InGamePause.IsVisible() || GameState.MenuActive)
          MenuManager.InGamePause.Hide();
      }
    }else if(GameState.Mode == EngineMode.MINIGAME){
      FadeOverlayManager.Update(delta);
      if(GameState.inDialog){
        LightManager.update(delta, GameState.currentCamera);
      }else{
        LightManager.update(delta, GameState.getCurrentPlayer());
      }
      //MenuManager.InGameOverlay.Hide();
    }

    if(GameState.Mode == EngineMode.INGAME){
      let obj: any;
      for(let i = 0, len = GameState.group.room_walkmeshes.children.length; i < len; i++){
        obj = GameState.group.room_walkmeshes.children[i];
        if(obj.type === 'Mesh'){
          obj.material.visible = ConfigClient.get('GameState.debug.show_collision_meshes');
        }
      }

      for(let i = 0, len = GameState.walkmeshList.length; i < len; i++){
        obj = GameState.walkmeshList[i];
        if(obj.type === 'Mesh'){
          obj.material.visible = ConfigClient.get('GameState.debug.show_collision_meshes');
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

    GameState.audioEngine.Update(GameState.currentCamera.position, GameState.currentCamera.rotation);
    GameState.controls.Update(delta);
    CameraShakeManager.update(delta, GameState.currentCamera);

    GameState.updateCursorPosition();
    GameState.renderPass.camera = GameState.currentCamera;
    //GameState.renderPassAA.camera = GameState.currentCamera;
    GameState.bokehPass.camera = GameState.currentCamera;

    // render scene into target
    //GameState.renderer.setRenderTarget( GameState.depthTarget );
    //GameState.renderer.render( GameState.scene, GameState.currentCamera );
    // render post FX
    //GameState.renderer.setRenderTarget( null );

    GameState.composer.render(delta);

    if(typeof GameState.onScreenShot === 'function'){
      console.log('Screenshot', GameState.onScreenShot);
      
      GameState.renderer.clear();
      GameState.renderer.render(GameState.scene, GameState.currentCamera);

      let ssCallback = GameState.onScreenShot;
      let screenshot = new Image();
      screenshot.src = GameState.canvas.toDataURL('image/png');
      screenshot.onload = function() {
        let ssCanvas = new OffscreenCanvas(256, 256);
        let ctx = ssCanvas.getContext('2d');
        ctx.drawImage(screenshot, 0, 0, 256, 256);

        let tga = TGAObject.FromCanvas(ssCanvas);
        ssCallback(tga);
      };
      
      GameState.composer.render(delta);
      GameState.onScreenShot = undefined;
    }

    CameraShakeManager.afterRender();

    //NoClickTimer
    if( ((GameState.Mode == EngineMode.MINIGAME) || (GameState.Mode == EngineMode.INGAME)) && GameState.State != EngineState.PAUSED){
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
    GameState.deltaTime += delta;

    if(GameState.deltaTime > 1000)
      GameState.deltaTime = GameState.deltaTime % 1;
  }

  public static isObjectPC(object: ModuleObject){
    return GameState.player === object;
  }

  public static async InitializeGameState(options: GameStateInitializeOptions = {} as GameStateInitializeOptions){
    const _default = {
      Game: GameEngineType.KOTOR,
      Env: GameEngineEnv.NODE,
    } as GameStateInitializeOptions;
    options = {..._default, ...options};

    GameState.GameKey = options.Game;

  }

}
