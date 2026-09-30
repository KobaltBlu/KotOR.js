import * as THREE from "three";
import Stats from 'three/examples/jsm/libs/stats.module';

import { GameState } from "@/GameState";
import { IngameControls } from "@/controls/IngameControls";
import { OdysseyRenderPipeline } from "@/engine/OdysseyRenderPipeline";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { EngineDebugType } from "@/enums/engine";
import { freezeGuiObject } from "@/gui/guiMatrix";
import { orthoFrustumInt } from "@/gui/GUICoord";
import { odysseyOpaqueRenderSort } from "@/utility/odysseyOpaqueRenderSort";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";

const namedGroup = (name: string = 'na'): THREE.Group => {
  const group = new THREE.Group();
  group.name = name;
  // Groups are never translated; freeze so scene.updateMatrixWorld does not
  // force-recompute every child when the group root recomposes each frame.
  group.matrixAutoUpdate = false;
  group.updateMatrix();
  return group;
};

/**
 * THREE.js renderer, scenes, cameras, scene groups, composer hookup, and input/fade wiring.
 */
export class GameRuntimeBootstrap {
  static createRuntime(): void {
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

    // Transfer before any getContext. HTML canvas stays the DOM/input
    // placeholder; OffscreenCanvas owns WebGL. Falls back to HTML GL when
    // transfer is unavailable.
    GameState.offscreenCanvas = null;
    if(typeof GameState.canvas.transferControlToOffscreen === 'function'){
      try{
        GameState.offscreenCanvas = GameState.canvas.transferControlToOffscreen();
        console.log('GameState: WebGL on OffscreenCanvas (transferControlToOffscreen)');
      }catch(e){
        GameState.offscreenCanvas = null;
        console.warn('GameState: transferControlToOffscreen failed; using HTML canvas', e);
      }
    }else{
      console.log('GameState: WebGL on HTMLCanvasElement (no transferControlToOffscreen)');
    }

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
    const glTarget: HTMLCanvasElement | OffscreenCanvas =
      GameState.offscreenCanvas ?? GameState.canvas;
    GameState.context = glTarget.getContext('webgl2', glAttrs) as WebGL2RenderingContext | null;
    if(!GameState.context){
      throw new Error('KotOR.js requires WebGL 2. This browser or GPU does not provide a WebGL2 context.');
    }
    GameState.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas: glTarget,
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
    GameState.setRendererSize(
      GameState.ResolutionManager.getViewportWidth(),
      GameState.ResolutionManager.getViewportHeight(),
    );
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
    // Scene roots never move; freezing avoids a force-flagged walk of every
    // object when Object3D.updateMatrix unconditionally dirties matrixWorld.
    GameState.scene.matrixAutoUpdate = false;
    GameState.scene.updateMatrix();
    // GUI scenes: freeze locals and disable the renderer's per-frame world walk.
    // Children are frozen via childadded; world matrices flush explicitly.
    freezeGuiObject(GameState.scene_gui);
    GameState.scene_gui.matrixWorldAutoUpdate = false;
    freezeGuiObject(GameState.scene_movie);
    GameState.scene_movie.matrixWorldAutoUpdate = false;
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
    GameState.group.room_walkmeshes.visible = GameState.debug[EngineDebugType.ROOM_WALKMESH] || GameState.debug[EngineDebugType.DOOR_WALKMESH] || GameState.debug[EngineDebugType.PLACEABLE_WALKMESH];
    GameState.group.light_helpers.visible = GameState.debug[EngineDebugType.LIGHT_HELPERS];
    GameState.group.shadow_lights.visible = GameState.debug[EngineDebugType.SHADOW_LIGHTS];
    GameState.group.path_helpers.visible = GameState.debug[EngineDebugType.PATH_FINDING];
    GameState.group.collision_helpers.visible = GameState.debug[EngineDebugType.COLLISION_HELPERS];

    GameState.interactableObjects = [
      GameState.group.placeables, 
      GameState.group.doors, 
      GameState.group.creatures, 
      GameState.group.party,
      //GameState.group.rooms
      GameState.group.room_walkmeshes
    ];

    GameState.scene_cursor_holder = new THREE.Group();
    freezeGuiObject(GameState.scene_cursor_holder);
    GameState.scene_gui.add(GameState.scene_cursor_holder);

    OdysseyRenderPipeline.initComposer();

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
  }
}
