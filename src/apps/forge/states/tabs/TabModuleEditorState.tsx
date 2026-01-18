import React from "react";
import { UI3DRenderer, UI3DRendererEventListenerTypes, GroupType } from "../../UI3DRenderer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./";
import * as THREE from 'three';
import * as KotOR from '../../KotOR';
import { Project } from "../../Project";
import { ForgeArea } from "../../module-editor/ForgeArea";
import { ForgeModule } from "../../module-editor/ForgeModule";
import { TabModuleEditor } from "../../components/tabs/tab-module-editor/TabModuleEditor";
import { ForgeGameObject } from "../../module-editor/ForgeGameObject";
import { ForgeCreature } from "../../module-editor/ForgeCreature";
import { ForgeCamera } from "../../module-editor/ForgeCamera";
import { ForgeDoor } from "../../module-editor/ForgeDoor";
import { ForgeEncounter } from "../../module-editor/ForgeEncounter";
import { ForgeItem } from "../../module-editor/ForgeItem";
import { ForgePlaceable } from "../../module-editor/ForgePlaceable";
import { ForgeSound } from "../../module-editor/ForgeSound";
import { ForgeStore } from "../../module-editor/ForgeStore";
import { ForgeTrigger } from "../../module-editor/ForgeTrigger";
import { ForgeWaypoint } from "../../module-editor/ForgeWaypoint";
import { ModalBlueprintBrowserState, BlueprintType } from "../../states/modal/ModalBlueprintBrowserState";
import { ForgeState } from "../../states/ForgeState";
import { ForgeRoom } from "../../module-editor/ForgeRoom";

export enum TabModuleEditorControlMode {
  SELECT = 0,
  TRANSFORM_CONTROL = 2,
  ROTATE_CONTROL = 3,
  SCALE_CONTROL = 4,
  ADD_GAME_OBJECT = 5
};

export enum GameObjectType {
  ROOM = 'room',
  CREATURE = 'creature',
  CAMERA = 'camera',
  DOOR = 'door',
  ENCOUNTER = 'encounter',
  ITEM = 'item',
  PLACEABLE = 'placeable',
  SOUND = 'sound',
  STORE = 'store',
  TRIGGER = 'trigger',
  WAYPOINT = 'waypoint'
};

export class TabModuleEditorState extends TabState {

  tabName: string = `Module Editor`;
  controlMode: TabModuleEditorControlMode = TabModuleEditorControlMode.SELECT;
  selectedGameObjectType: GameObjectType | undefined;
  selectedBlueprintResRef: string = '';

  ui3DRenderer: UI3DRenderer;
  module: ForgeModule | undefined;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;
  
  // Ghost preview for object placement
  ghostPreviewMesh: THREE.Mesh;
  previewPosition: THREE.Vector3 = new THREE.Vector3();
  previewValid: boolean = false;
  
  // Selected game object
  selectedGameObject: ForgeGameObject | undefined;
  
  // Mouse vector for raycasting (reused to avoid allocation)
  private mouseVector: THREE.Vector2 = new THREE.Vector2();

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.singleInstance = true;
    this.isClosable = true;
    
    // Create UI3DRenderer first
    this.ui3DRenderer = new UI3DRenderer();
    
    // Geometry
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    // Create ghost preview mesh for object placement
    const ghostGeometry = new THREE.BoxGeometry(1, 1, 1);
    const ghostMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    this.ghostPreviewMesh = new THREE.Mesh(ghostGeometry, ghostMaterial);
    this.ghostPreviewMesh.visible = false;

    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseDown', this.onMouseDown.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseMove', this.onMouseMove.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', this.onSelect.bind(this));
    
    // Listen for keyboard events (Delete key to remove selected object)
    this.addEventListener('onKeyDown', this.onKeyDown.bind(this));

    // Add ground mesh and ghost preview to scene when scene is available
    // The scene is initialized in UI3DRenderer, but buildScene() is called when canvas is attached
    const addMeshesToScene = () => {
      if(this.ui3DRenderer?.scene){
        if(!this.ui3DRenderer.scene.children.includes(this.groundMesh)){
          this.ui3DRenderer.scene.add(this.groundMesh);
        }
        if(!this.ui3DRenderer.scene.children.includes(this.ghostPreviewMesh)){
          this.ui3DRenderer.scene.add(this.ghostPreviewMesh);
        }
      }
    };
    
    // Try to add immediately if scene exists (scene is initialized in UI3DRenderer class definition)
    if(this.ui3DRenderer.scene){
      addMeshesToScene();
    }
    
    // Also listen for when canvas is attached (which calls buildScene and ensures scene is ready)
    this.ui3DRenderer.addEventListener('onCanvasAttached', addMeshesToScene);
    this.setContentView(<TabModuleEditor tab={this}></TabModuleEditor>);

    // Listen to transform controls changes to update point positions
    // Add listener immediately if transform controls exist, otherwise wait for canvas attachment
    if(this.ui3DRenderer.transformControls){
      this.ui3DRenderer.transformControls.addEventListener('change', this.onTransformControlsChange.bind(this));
    } else {
      // Wait for canvas to be attached so transform controls are built
      this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', () => {
        if(this.ui3DRenderer.transformControls){
          this.ui3DRenderer.transformControls.addEventListener('change', this.onTransformControlsChange.bind(this));
        }
      });
    }
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  destroy(): void {
    // Dispose ghost preview
    if(this.ghostPreviewMesh){
      this.ui3DRenderer.scene.remove(this.ghostPreviewMesh);
      this.ghostPreviewMesh.geometry.dispose();
      (this.ghostPreviewMesh.material as THREE.Material).dispose();
    }
    
    this.ui3DRenderer.destroy();
    // this.disposeLayout();
    super.destroy();
  }

  animate(delta: number = 0){
    // Don't update ghost preview every frame - only on mouse move
    this.processEventListener('onAnimate', [delta]);

    // this.ui3DRenderer.transformControls.space = 'local';
    if(this.selectedGameObject){
      if(this.selectedGameObject instanceof ForgeCamera){
        const camera = this.selectedGameObject as ForgeCamera;
        // Ensure rotation order is maintained
        // camera.rotation.reorder('YZX');
        // // Sync quaternion from rotation
        // camera.quaternion.setFromEuler(camera.rotation);
        // // Update pitch from rotation.x
        // camera.pitch = THREE.MathUtils.radToDeg(camera.rotation.x);
        // Sync to perspective camera
        if(camera.perspectiveCamera){
          camera.perspectiveCamera.position.copy(camera.position);
          camera.perspectiveCamera.rotation.copy(camera.rotation);
          camera.perspectiveCamera.updateMatrixWorld(true);
          camera.perspectiveCamera.updateMatrix();
        }
      }
    }
  }
  
  private onTransformControlsChange(): void {
    if(!this.selectedGameObject) return;

    const object3D = this.selectedGameObject.container;
    if(!object3D) return;

    // For cameras, ensure rotation order is maintained and sync quaternion/pitch
    if(this.selectedGameObject instanceof ForgeCamera){
      const camera = this.selectedGameObject as ForgeCamera;
      
      // Ensure rotation order is set correctly
      camera.rotation.reorder('YZX');
      
      // Update quaternion from rotation
      camera.quaternion.setFromEuler(camera.rotation);
      
      // Update pitch from rotation.x (pitch is stored separately)
      camera.pitch = THREE.MathUtils.radToDeg(camera.rotation.x);
      
      // Sync to perspective camera
      if(camera.perspectiveCamera){
        camera.perspectiveCamera.quaternion.copy(camera.quaternion);
        camera.perspectiveCamera.updateMatrixWorld(true);
        camera.perspectiveCamera.updateMatrix();
      }
    }
    
    // Mark file as having unsaved changes
    this.updateFile();
  }

  onMouseMove(event: MouseEvent){
    // Update ghost preview only when mouse moves
    if(this.controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT){
      this.updateGhostPreview();
    }
  }

  updateGhostPreview(): void {
    if(this.controlMode !== TabModuleEditorControlMode.ADD_GAME_OBJECT || !this.selectedGameObjectType){
      if(this.ghostPreviewMesh){
        this.ghostPreviewMesh.visible = false;
      }
      this.previewValid = false;
      return;
    }
    
    if(!this.ui3DRenderer || !this.ui3DRenderer.canvas || !this.module?.area){
      if(this.ghostPreviewMesh){
        this.ghostPreviewMesh.visible = false;
      }
      this.previewValid = false;
      return;
    }
    
    // Find intersection point using same logic as placement
    const intersection = this.findPlacementIntersection();
    if(intersection && intersection.point && this.ghostPreviewMesh){
      this.previewPosition.copy(intersection.point);
      this.ghostPreviewMesh.position.copy(this.previewPosition);
      this.ghostPreviewMesh.visible = true;
      this.previewValid = true;
    } else {
      if(this.ghostPreviewMesh){
        this.ghostPreviewMesh.visible = false;
      }
      this.previewValid = false;
    }
  }

  findPlacementIntersection(): THREE.Intersection | null {
    if(!this.ui3DRenderer || !this.ui3DRenderer.canvas || !this.module?.area){
      return null;
    }

    // Get mouse position in normalized device coordinates
    // Reuse Vector2 to avoid allocation
    this.mouseVector.x = ((KotOR.Mouse.MouseX) / this.ui3DRenderer.canvas.width) * 2 - 1;
    this.mouseVector.y = -((KotOR.Mouse.MouseY) / this.ui3DRenderer.canvas.height) * 2 + 1;

    // Perform raycast
    this.ui3DRenderer.raycaster.setFromCamera(this.mouseVector, this.ui3DRenderer.camera);
    
    // Try to intersect with walkmesh first, then ground plane
    let intersection: THREE.Intersection | null = null;
    
    // Use cached walkmesh objects from ForgeArea
    const walkmeshObjects = this.module.area.getWalkmeshObjects();
    if(walkmeshObjects.length > 0){
      const walkmeshIntersects = this.ui3DRenderer.raycaster.intersectObjects(walkmeshObjects, true);
      if(walkmeshIntersects.length > 0){
        intersection = walkmeshIntersects[0];
      }
    }
    
    // Fallback to ground plane if no walkmesh intersection
    if(!intersection && this.groundMesh){
      const planeIntersects = this.ui3DRenderer.raycaster.intersectObject(this.groundMesh);
      if(planeIntersects.length > 0){
        intersection = planeIntersects[0];
      }
    }

    return intersection;
  }

  onMouseDown(event: MouseEvent){
    if(event.button !== 0 || !this.ui3DRenderer.canvas){ // Left mouse button only
      return;
    }

    // Handle placement when in ADD_GAME_OBJECT mode
    if(this.controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT && this.selectedGameObjectType && this.module?.area){
      const intersection = this.findPlacementIntersection();
      if(intersection && intersection.point){
        this.placeGameObject(intersection.point);
      }
      return;
    }
    // if(this.controlMode === TabModuleEditorControlMode.SELECT){
    //   this.ui3DRenderer.selectObject(undefined);
    // }
  }

  setControlMode(mode: TabModuleEditorControlMode){
    this.controlMode = mode;

    const isTransformTool = 
      mode === TabModuleEditorControlMode.TRANSFORM_CONTROL || 
      mode === TabModuleEditorControlMode.ROTATE_CONTROL || 
      mode === TabModuleEditorControlMode.SCALE_CONTROL;

    const isSelectModeTool = 
      mode === TabModuleEditorControlMode.SELECT;
    
    // Detach transform controls when not in SELECT mode
    if(!isTransformTool && !isSelectModeTool){
      this.selectedGameObject = undefined;
      this.ui3DRenderer.transformControls.detach();
    }

    if(mode === TabModuleEditorControlMode.TRANSFORM_CONTROL){
      this.ui3DRenderer.transformControls.mode = 'translate';
      this.updateTransformControlHelpers(this.selectedGameObject!);  
    } else if(mode === TabModuleEditorControlMode.ROTATE_CONTROL){
      this.ui3DRenderer.transformControls.mode = 'rotate';
      this.updateTransformControlHelpers(this.selectedGameObject!);
    } else if(mode === TabModuleEditorControlMode.SCALE_CONTROL){
      this.ui3DRenderer.transformControls.mode = 'scale';
      this.updateTransformControlHelpers(this.selectedGameObject!);
    }

    this.processEventListener('onControlModeChange', [mode]);
  }

  onSelect(gameObject: ForgeGameObject | undefined){
    console.log('onSelect', gameObject);
    this.selectGameObject(gameObject);
  }

  onKeyDown(event: KeyboardEvent, tab: TabState){
    // Handle Delete or Backspace key to remove selected object
    if((event.key === 'Delete') && this.selectedGameObject && this.module?.area){
      // Prevent default browser behavior (e.g., going back in history)
      event.preventDefault();
      event.stopPropagation();
      
      // Detach the selected object from the area
      this.module.area.detachObject(this.selectedGameObject);
      
      // Clear selection and detach transform controls
      this.selectGameObject(undefined);
    }
  }

  updateTransformControlHelpers(gameObject: ForgeGameObject){
    if(!gameObject) return;
    if(this.controlMode === TabModuleEditorControlMode.TRANSFORM_CONTROL){
      this.ui3DRenderer.transformControls.showX = true;
      this.ui3DRenderer.transformControls.showY = true;
      this.ui3DRenderer.transformControls.showZ = true;
    } else if(this.controlMode === TabModuleEditorControlMode.ROTATE_CONTROL){
      if(gameObject instanceof ForgeCreature || gameObject instanceof ForgeDoor || gameObject instanceof ForgeEncounter || gameObject instanceof ForgeItem || gameObject instanceof ForgePlaceable || gameObject instanceof ForgeStore || gameObject instanceof ForgeTrigger || gameObject instanceof ForgeWaypoint){
        this.ui3DRenderer.transformControls.showX = false;
        this.ui3DRenderer.transformControls.showY = false;
        this.ui3DRenderer.transformControls.showZ = true;
      } else if(gameObject instanceof ForgeCamera){
        this.ui3DRenderer.transformControls.showX = false;
        this.ui3DRenderer.transformControls.showY = false;
        this.ui3DRenderer.transformControls.showZ = true;
      } else if(gameObject instanceof ForgeRoom){
        this.ui3DRenderer.transformControls.showX = false;
        this.ui3DRenderer.transformControls.showY = false;
        this.ui3DRenderer.transformControls.showZ = true;
      }
    }else if(this.controlMode === TabModuleEditorControlMode.SCALE_CONTROL){
      this.ui3DRenderer.transformControls.showX = true;
      this.ui3DRenderer.transformControls.showY = true;
      this.ui3DRenderer.transformControls.showZ = true;
    }
  }

  selectGameObject(gameObject: ForgeGameObject | undefined){
    console.log('selectGameObject', gameObject);
    this.selectedGameObject = gameObject;
    this.ui3DRenderer.transformControls.detach();
    
    // Enable/disable camera preview
    if(gameObject instanceof ForgeCamera){
      const camera = gameObject as ForgeCamera;
      // Ensure rotation order is set before attaching transform controls
      camera.rotation.reorder('YZX');
      // Sync quaternion from rotation to ensure consistency
      camera.quaternion.setFromEuler(camera.rotation);
      // Enable preview with the camera's perspective camera
      if(camera.perspectiveCamera){
        this.ui3DRenderer.setPreviewCamera(camera.perspectiveCamera);
      }
    } else {
      // Disable preview when not selecting a camera
      this.ui3DRenderer.disablePreview();
    }
    
    if(gameObject){
      this.ui3DRenderer.transformControls.attach(gameObject.container);
      this.ui3DRenderer.transformControls.size = 0.5;
      this.updateTransformControlHelpers(gameObject);
    }
    this.processEventListener('onSelectionChanged', [gameObject]);
  }

  placeGameObject(position: THREE.Vector3){
    if(!this.module?.area || !this.selectedGameObjectType){
      return;
    }

    const typesThatUseBlueprints = [GameObjectType.CREATURE, GameObjectType.DOOR, GameObjectType.ENCOUNTER, GameObjectType.ITEM, GameObjectType.PLACEABLE, GameObjectType.STORE, GameObjectType.TRIGGER, GameObjectType.WAYPOINT];
    const useBlueprintLoader = typesThatUseBlueprints.includes(this.selectedGameObjectType);

    if(useBlueprintLoader && !this.selectedBlueprintResRef){
      return;
    }

    const gameObject = this.createGameObject(this.selectedGameObjectType);
    if(!gameObject){
      console.error(`Failed to create game object of type: ${this.selectedGameObjectType}`);
      return;
    }

    // Create async loaders array
    const asyncLoaders: (() => Promise<void>)[] = [];

    // Set template resref if one was selected
    if(this.selectedGameObjectType === GameObjectType.ROOM && this.selectedBlueprintResRef){
      (gameObject as ForgeRoom).roomName = this.selectedBlueprintResRef;
    }else if(this.selectedBlueprintResRef){
      const resType = this.getResourceTypeForGameObjectType(this.selectedGameObjectType);
      gameObject.setTemplateResRef(this.selectedBlueprintResRef, resType);
    }

    // Add object loader to async loaders array
    asyncLoaders.push(gameObject.load);

    // Set position
    gameObject.position.copy(position);

    // Set area
    this.module.area.attachObject(gameObject);

    // Load all async loaders
    (async () => {
      if(useBlueprintLoader){
        await gameObject.loadBlueprint();
      }
      await gameObject.load();
    })();

    // Notify listeners
    this.processEventListener('onGameObjectPlaced', [gameObject, this.selectedGameObjectType]);
    this.selectedBlueprintResRef = '';
    this.selectedGameObjectType = undefined;
    this.setControlMode(TabModuleEditorControlMode.TRANSFORM_CONTROL);
    this.ghostPreviewMesh.visible = false;
  }

  openBlueprintBrowser(){
    this.openBlueprintBrowserForType('utc');
  }

  cloneGameObject(gameObject: ForgeGameObject){
    if(!gameObject || !this.module?.area){
      return;
    }
    const gameObjectType = this.getGameObjectTypeFromGameObject(gameObject);
    if(!gameObjectType){
      return;
    }
    const resref = gameObject.templateResRef;
    const resType = gameObject.templateResType;
    this.setGameObjectControlOptions(gameObjectType, resref, resType);
  }

  openBlueprintBrowserForType(blueprintType: BlueprintType){
    const modal = new ModalBlueprintBrowserState(blueprintType, (blueprint, type) => {
      // Map blueprint type to GameObjectType
      const gameObjectType = this.getGameObjectTypeFromBlueprintType(type);
      if(gameObjectType){
        this.setGameObjectControlOptions(gameObjectType, blueprint.resref, type);
      }
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  }

  setGameObjectControlOptions(gameObjectType: GameObjectType, resref: string, resType: typeof KotOR.ResourceTypes){
    this.selectedGameObjectType = gameObjectType;
    this.selectedBlueprintResRef = resref;
    this.controlMode = TabModuleEditorControlMode.ADD_GAME_OBJECT;
  }

  getGameObjectTypeFromBlueprintType(blueprintType: BlueprintType): GameObjectType | undefined {
    const mapping: Record<BlueprintType, GameObjectType> = {
      'utc': GameObjectType.CREATURE,
      'utd': GameObjectType.DOOR,
      'ute': GameObjectType.ENCOUNTER,
      'uti': GameObjectType.ITEM,
      'utp': GameObjectType.PLACEABLE,
      'utm': GameObjectType.STORE,
      'uts': GameObjectType.SOUND,
      'utt': GameObjectType.TRIGGER,
      'utw': GameObjectType.WAYPOINT,
    };
    return mapping[blueprintType];
  }

  getGameObjectTypeFromGameObject(gameObject: ForgeGameObject): GameObjectType | undefined {
    if(gameObject instanceof ForgeCreature) return GameObjectType.CREATURE;
    if(gameObject instanceof ForgeDoor) return GameObjectType.DOOR;
    if(gameObject instanceof ForgeEncounter) return GameObjectType.ENCOUNTER;
    if(gameObject instanceof ForgeItem) return GameObjectType.ITEM;
    if(gameObject instanceof ForgePlaceable) return GameObjectType.PLACEABLE;
    if(gameObject instanceof ForgeStore) return GameObjectType.STORE;
    if(gameObject instanceof ForgeTrigger) return GameObjectType.TRIGGER;
    if(gameObject instanceof ForgeWaypoint) return GameObjectType.WAYPOINT;
    if(gameObject instanceof ForgeCamera) return GameObjectType.CAMERA;
    if(gameObject instanceof ForgeRoom) return GameObjectType.ROOM;
    if(gameObject instanceof ForgeSound) return GameObjectType.SOUND;
    return undefined;
  }

  getResourceTypeForGameObjectType(gameObjectType: GameObjectType): typeof KotOR.ResourceTypes {
    const mapping: Record<GameObjectType, typeof KotOR.ResourceTypes> = {
      [GameObjectType.ROOM]: KotOR.ResourceTypes.NA,
      [GameObjectType.CREATURE]: KotOR.ResourceTypes.utc,
      [GameObjectType.DOOR]: KotOR.ResourceTypes.utd,
      [GameObjectType.ENCOUNTER]: KotOR.ResourceTypes.ute,
      [GameObjectType.ITEM]: KotOR.ResourceTypes.uti,
      [GameObjectType.PLACEABLE]: KotOR.ResourceTypes.utp,
      [GameObjectType.STORE]: KotOR.ResourceTypes.utm,
      [GameObjectType.SOUND]: KotOR.ResourceTypes.uts,
      [GameObjectType.TRIGGER]: KotOR.ResourceTypes.utt,
      [GameObjectType.WAYPOINT]: KotOR.ResourceTypes.utw,
      [GameObjectType.CAMERA]: KotOR.ResourceTypes.NA, // Camera doesn't use blueprints
    };
    return mapping[gameObjectType] || KotOR.ResourceTypes.NA;
  }

  createGameObject(type: GameObjectType): ForgeGameObject | null {
    switch(type){
      case GameObjectType.CREATURE:
        return new ForgeCreature();
      case GameObjectType.CAMERA:
        return new ForgeCamera();
      case GameObjectType.DOOR:
        return new ForgeDoor();
      case GameObjectType.ENCOUNTER:
        return new ForgeEncounter();
      case GameObjectType.ITEM:
        return new ForgeItem();
      case GameObjectType.PLACEABLE:
        return new ForgePlaceable();
      case GameObjectType.SOUND:
        return new ForgeSound();
      case GameObjectType.STORE:
        return new ForgeStore();
      case GameObjectType.TRIGGER:
        return new ForgeTrigger();
      case GameObjectType.WAYPOINT:
        return new ForgeWaypoint();
      default:
        console.error(`Unknown game object type: ${type}`);
        return null;
    }
  }

  //This should only be used inside KotOR Forge
  static async FromProject(project: Project): Promise<ForgeModule | undefined> {
    console.log('BuildFromExisting', project);
    if(!project){
      return undefined;
    }
    const module = new ForgeModule(new KotOR.GFFObject());
    module.transWP = '';
    // KotOR.ModuleObjectManager.module = module;

    /**
     * Load the IFO file
     */
    const ifoFile = await project.module_ifo?.readFile();
    if(!ifoFile){
      console.error('IFO file not found');
      return undefined;
    }
    const ifo = new KotOR.GFFObject(ifoFile.buffer);
    module.setFromIFO(ifo);
    KotOR.GameState.time = module.timeManager.pauseTime / 1000;

    /**
     * Load the ARE file
     */
    const areFile = await project.module_are?.readFile();
    if(!areFile){
      console.error('ARE file not found');
      return undefined;
    }
    const are = new KotOR.GFFObject(areFile.buffer);

    /**
     * Load the GIT file
     */
    const gitFile = await project.module_git?.readFile();
    if(!gitFile){
      console.error('GIT file not found');
      return undefined;
    }
    const git = new KotOR.GFFObject(gitFile.buffer);

    /**
     * Create the area
     */
    module.area = new ForgeArea(git, are);
    module.area.module = module;
    module.areas = [module.area];
    return module;
  }

}