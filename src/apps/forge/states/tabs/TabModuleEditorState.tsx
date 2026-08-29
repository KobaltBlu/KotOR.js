import React from "react";
import { UI3DRenderer, UI3DRendererEventListenerTypes, GroupType, ObjectType } from "@/apps/forge/UI3DRenderer";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState, UpdateFileOptions } from "@/apps/forge/states/tabs";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as THREE from 'three';
import * as KotOR from "@/apps/forge/KotOR";
import { Project } from "@/apps/forge/Project";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";
import { TabModuleEditor } from "@/apps/forge/components/tabs/tab-module-editor/TabModuleEditor";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { ForgeCreature } from "@/apps/forge/module-editor/ForgeCreature";
import { ForgeCamera } from "@/apps/forge/module-editor/ForgeCamera";
import { ForgeDoor } from "@/apps/forge/module-editor/ForgeDoor";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { ForgeItem } from "@/apps/forge/module-editor/ForgeItem";
import { ForgePlaceable } from "@/apps/forge/module-editor/ForgePlaceable";
import { ForgeSound } from "@/apps/forge/module-editor/ForgeSound";
import { ForgeStore } from "@/apps/forge/module-editor/ForgeStore";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import { BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import { openBlueprintBrowser, openResRefBrowser } from "@/apps/forge/helpers/openGameResRefPicker";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";
import {
  forgeModuleSettings,
  MODULE_HELPER_TYPES,
  type ModuleHelperType,
} from "@/apps/forge/settings/forgeEditorsSettings";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";
import {
  CommandHistory,
  EditorTool,
  PerformanceBaseline,
  PickService,
  PreviewController,
  SceneVisibilityService,
  SelectionService,
  SpatialPickIndex,
  ToolService,
} from "@/apps/forge/module-editor/kernel";
import { AssetIndexService } from "@/apps/forge/module-editor/assets/AssetIndexService";
import { ModuleValidationService } from "@/apps/forge/module-editor/validation/ModuleValidationService";
import { ModuleRecovery } from "@/apps/forge/module-editor/recovery/ModuleRecovery";
import { ModuleExtensionRegistry } from "@/apps/forge/module-editor/extensions/ModuleExtensionTypes";
import type { ValidationReport } from "@/apps/forge/module-editor/validation/ModuleValidationTypes";
import type { ScreenRect } from "@/apps/forge/module-editor/kernel/PickService";
import { EditorMode } from "@/apps/forge/module-editor/kernel/EditorMode";
import type { EditorCommandDescriptor } from "@/apps/forge/module-editor/kernel/EditorCommand";
import { ProjectVFS } from "@/apps/forge/module-editor/vfs/ProjectVFS";
import { DEFAULT_MODULE_WORKSPACE, type ModuleWorkspaceState } from "@/apps/forge/module-editor/workspace/ModuleWorkspaceState";
import { setModuleSettings } from "@/apps/forge/settings/forgeEditorsSettings";
import { TabModuleEditorControlMode, GameObjectType } from "@/apps/forge/states/tabs/TabModuleEditorTypes";

export { TabModuleEditorControlMode, GameObjectType } from "@/apps/forge/states/tabs/TabModuleEditorTypes";

export interface ModuleEditorSnapshot {
  ifo: Uint8Array;
  are: Uint8Array;
  git: Uint8Array;
  lyt?: Uint8Array;
  vis?: Uint8Array;
}

export class TabModuleEditorState extends TabState {

  tabName: string = `Module Editor`;
  controlMode: TabModuleEditorControlMode = TabModuleEditorControlMode.SELECT;
  selectedGameObjectType: GameObjectType | undefined;
  selectedBlueprintResRef: string = '';
  tabMode: ModuleEditorTabMode = ModuleEditorTabMode.EDIT;
  snapEnabled: boolean = true;
  snapPosition: number = 0.25;
  snapAngleDeg: number = 15;
  /** Stay in place mode after each placement (Esc cancels; Shift+click one-shots). */
  placeSticky: boolean = true;
  lastBlueprintByType: Partial<Record<GameObjectType, string>> = {};
  /** Phase-2 keymap overlay */
  showKeymapHelp: boolean = false;
  /** Preview spawn: module entry, editor camera, or waypoint tag */
  previewSpawnMode: 'entry' | 'camera' | 'waypoint' = 'entry';
  /** Non-permanent warp waypoint tag for preview (retail area-transition style). */
  previewWarpWaypointTag: string | null = null;
  private ghostBoundsToken: number = 0;

  ui3DRenderer: UI3DRenderer;
  module: ForgeModule | undefined;
  areFile: EditorFile | undefined;
  gitFile: EditorFile | undefined;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;
  
  // Ghost preview for object placement
  ghostPreviewMesh: THREE.Mesh;
  entryMarker: THREE.Object3D;
  selectedEntryPoint: boolean = false;
  previewPosition: THREE.Vector3 = new THREE.Vector3();
  previewValid: boolean = false;
  
  // Selected game object
  selectedGameObject: ForgeGameObject | undefined;
  selectedGameObjects: ForgeGameObject[] = [];
  private snapshotRestore: Promise<void> = Promise.resolve();
  private ctrlSnapToggle: boolean = false;
  private shiftSelecting: boolean = false;
  private pathOverlayGroup: THREE.Group = new THREE.Group();
  private multiSelectPrevPos: THREE.Vector3 = new THREE.Vector3();
  private multiSelectPrevRotZ: number = 0;
  private multiSelectTracking: boolean = false;

  /** Phase 0+ editor kernel services. */
  readonly commandHistory = new CommandHistory();
  readonly selectionService = new SelectionService();
  readonly toolService = new ToolService();
  readonly visibilityService = new SceneVisibilityService();
  readonly previewController = new PreviewController();
  readonly validationService = new ModuleValidationService();
  readonly assetIndex = new AssetIndexService();
  readonly spatialPickIndex = new SpatialPickIndex(16);
  lastValidation: ValidationReport | undefined;
  private autosaveTimer: ReturnType<typeof setInterval> | undefined;
  private marqueeStart: { x: number; y: number } | null = null;
  private marqueeCurrent: { x: number; y: number } | null = null;
  private pendingFocusEntry = false;
  
  // Mouse vector for raycasting (reused to avoid allocation)
  private mouseVector: THREE.Vector2 = new THREE.Vector2();
  private onModuleHelpersChange = (): void => {
    this.visibilityService.loadFromSettings();
    this.applyModuleHelperVisibility();
  };

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.singleInstance = true;
    this.isClosable = true;
    
    // Create UI3DRenderer first
    this.ui3DRenderer = new UI3DRenderer();
    this.applyModuleHelperVisibility();
    forgeModuleSettings.addListener(this.onModuleHelpersChange);
    
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

    this.entryMarker = new THREE.Group();
    this.entryMarker.add(new THREE.AxesHelper(1.25));
    const entryPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x66ccff })
    );
    entryPole.position.z = 0.6;
    entryPole.rotation.x = Math.PI / 2;
    this.entryMarker.add(entryPole);
    this.entryMarker.userData.moduleEntry = true;

    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseDown', this.onMouseDown.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseMove', this.onMouseMove.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', this.onSelect.bind(this));
    
    // Listen for keyboard events (Delete key to remove selected object)
    this.addEventListener('onKeyDown', this.onKeyDown.bind(this));
    this.addEventListener('onKeyUp', this.onKeyUp.bind(this));

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
        if(!this.ui3DRenderer.scene.children.includes(this.entryMarker)){
          this.ui3DRenderer.scene.add(this.entryMarker);
        }
        this.pathOverlayGroup.name = 'module-path-overlay';
        if(!this.ui3DRenderer.scene.children.includes(this.pathOverlayGroup)){
          this.ui3DRenderer.scene.add(this.pathOverlayGroup);
        }
      }
    };
    
    // Try to add immediately if scene exists (scene is initialized in UI3DRenderer class definition)
    if(this.ui3DRenderer.scene){
      addMeshesToScene();
    }
    
    // Also listen for when canvas is attached (which calls buildScene and ensures scene is ready)
    this.ui3DRenderer.addEventListener('onCanvasAttached', () => {
      addMeshesToScene();
      if (this.pendingFocusEntry) {
        this.focusCameraOnModuleEntry();
      }
    });
    this.setContentView(<TabModuleEditor tab={this}></TabModuleEditor>);

    // Listen to transform controls changes to update point positions
    // Add listener immediately if transform controls exist, otherwise wait for canvas attachment
    if(this.ui3DRenderer.transformControls){
      this.ui3DRenderer.transformControls.addEventListener('change', this.onTransformControlsChange.bind(this));
      this.ui3DRenderer.transformControls.addEventListener('mouseDown', () => this.beginMultiSelectTransformTracking());
    } else {
      // Wait for canvas to be attached so transform controls are built
      this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', () => {
        if(this.ui3DRenderer.transformControls){
          this.ui3DRenderer.transformControls.addEventListener('change', this.onTransformControlsChange.bind(this));
          this.ui3DRenderer.transformControls.addEventListener('mouseDown', () => this.beginMultiSelectTransformTracking());
        }
      });
    }

    this.initEditorKernel();
  }

  private initEditorKernel(): void {
    const settings = forgeModuleSettings.get();
    this.snapEnabled = settings.snapPosition;
    this.snapPosition = settings.snapPositionStep;
    this.snapAngleDeg = settings.snapAngleStep;
    this.toolService.setSnap({
      positionEnabled: settings.snapPosition,
      positionStep: settings.snapPositionStep,
      angleEnabled: settings.snapAngle,
      angleStep: settings.snapAngleStep,
    });
    this.toolService.setSpace(settings.transformSpace);
    this.visibilityService.loadFromSettings();
    this.restartAutosaveTimer();
    void this.assetIndex.rebuild().catch((error) => {
      console.warn("Failed to build module asset index", error);
    });
  }

  private restartAutosaveTimer(): void {
    if (this.autosaveTimer !== undefined) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = undefined;
    }
    const settings = forgeModuleSettings.get();
    if (!settings.autosaveEnabled) {
      return;
    }
    const ms = Math.max(30, settings.autosaveIntervalSec) * 1000;
    this.autosaveTimer = setInterval(() => {
      void this.writeRecoverySnapshot("autosave");
    }, ms);
  }

  async writeRecoverySnapshot(reason: "autosave" | "crash" | "manual" = "autosave"): Promise<boolean> {
    const buffers = this.serializeModuleBuffers();
    if (!buffers) {
      return false;
    }
    return ModuleRecovery.saveSnapshot(buffers, reason);
  }

  getWorkspace(): ModuleWorkspaceState {
    return forgeModuleSettings.get().workspace || DEFAULT_MODULE_WORKSPACE;
  }

  patchWorkspace(patch: Partial<ModuleWorkspaceState>): ModuleWorkspaceState {
    const current = this.getWorkspace();
    const next: ModuleWorkspaceState = {
      ...current,
      ...patch,
      layout: {
        ...current.layout,
        ...(patch.layout || {}),
      },
    };
    setModuleSettings({ workspace: next });
    this.processEventListener("onWorkspaceChanged", [next]);
    return next;
  }

  /**
   * Push a named transactional command. Still captures a snapshot when
   * command history is disabled or as a compatibility safety net.
   */
  pushEditorCommand(descriptor: EditorCommandDescriptor, captureSnapshot = true): void {
    const settings = forgeModuleSettings.get();
    if (settings.commandHistoryEnabled) {
      this.commandHistory.push(descriptor);
    }
    if (captureSnapshot && !settings.commandHistoryEnabled) {
      if (descriptor.coalesceKey) {
        this.captureCoalescedUndo(descriptor.coalesceKey);
      } else {
        this.captureUndoSnapshot();
      }
    }
  }

  async validateModule(): Promise<ValidationReport> {
    const report = await this.validationService.validateModule(this.module);
    const contribIssues = [];
    for (const validator of ModuleExtensionRegistry.validators()) {
      try {
        const extra = await validator.validate(this.module!);
        contribIssues.push(...extra);
      } catch (error) {
        console.warn(`Extension validator ${validator.id} failed`, error);
      }
    }
    if (contribIssues.length) {
      report.issues.push(...contribIssues);
      report.errorCount += contribIssues.filter((i) => i.severity === "error").length;
      report.warningCount += contribIssues.filter((i) => i.severity === "warning").length;
      report.infoCount += contribIssues.filter((i) => i.severity === "info").length;
    }
    this.lastValidation = report;
    this.processEventListener("onValidationCompleted", [report]);
    return report;
  }

  beginMarquee(x: number, y: number): void {
    if (!forgeModuleSettings.get().marqueeSelect) {
      return;
    }
    this.marqueeStart = { x, y };
    this.marqueeCurrent = { x, y };
    this.processEventListener("onMarqueeChanged", [this.getMarqueeRect()]);
  }

  updateMarquee(x: number, y: number): void {
    if (!this.marqueeStart) {
      return;
    }
    this.marqueeCurrent = { x, y };
    this.processEventListener("onMarqueeChanged", [this.getMarqueeRect()]);
  }

  completeMarquee(additive = false): ForgeGameObject[] {
    const rect = this.getMarqueeRect();
    this.marqueeStart = null;
    this.marqueeCurrent = null;
    this.processEventListener("onMarqueeChanged", [null]);
    if (!rect || !this.module?.area || !this.ui3DRenderer.camera || !this.ui3DRenderer.canvas) {
      return [];
    }
    const width = Math.abs(rect.right - rect.left);
    const height = Math.abs(rect.bottom - rect.top);
    if (width < 4 && height < 4) {
      return [];
    }
    const objects = this.collectSelectableObjects();
    const hits = PickService.marqueeSelect(
      objects,
      this.ui3DRenderer.camera,
      this.ui3DRenderer.canvas,
      rect,
    );
    if (hits.length) {
      this.selectionService.selectMany(hits, additive);
      this.selectedGameObjects = [...this.selectionService.objects];
      this.selectedGameObject = this.selectionService.primaryObject;
      this.ui3DRenderer.sceneGraphManager?.syncSelectionFromGameObjects(this.selectedGameObjects);
      this.processEventListener("onSelectionChanged", [this.selectedGameObject, this.selectedGameObjects]);
    }
    return hits;
  }

  getMarqueeRect(): ScreenRect | null {
    if (!this.marqueeStart || !this.marqueeCurrent) {
      return null;
    }
    return PickService.normalizeRect(this.marqueeStart, this.marqueeCurrent);
  }

  private collectSelectableObjects(): ForgeGameObject[] {
    const area = this.module?.area;
    if (!area) return [];
    const objects = [
      ...(area.creatures || []),
      ...(area.doors || []),
      ...(area.placeables || []),
      ...(area.triggers || []),
      ...(area.encounters || []),
      ...(area.waypoints || []),
      ...(area.sounds || []),
      ...(area.stores || []),
      ...(area.items || []),
      ...(area.rooms || []),
    ];
    this.spatialPickIndex.rebuild(objects);
    return objects;
  }

  getProjectVfsCapabilities() {
    return ProjectVFS.shared.capabilities();
  }

  exportPerformanceReport(): string {
    return PerformanceBaseline.exportJson();
  }

  show(): void {
    super.show();
    this.ui3DRenderer.setEnabled(true);
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.setEnabled(false);
  }

  applyModuleHelperVisibility(): void {
    const helpers = forgeModuleSettings.get().helpers;
    const mapping: Record<ModuleHelperType, { group: GroupType; objectType: ObjectType }> = {
      creature: { group: GroupType.CREATURE, objectType: ObjectType.CREATURE },
      door: { group: GroupType.DOOR, objectType: ObjectType.DOOR },
      encounter: { group: GroupType.ENCOUNTER, objectType: ObjectType.ENCOUNTER },
      placeable: { group: GroupType.PLACEABLE, objectType: ObjectType.PLACEABLE },
      merchant: { group: GroupType.STORE, objectType: ObjectType.STORE },
      sound: { group: GroupType.SOUND, objectType: ObjectType.SOUND },
      trigger: { group: GroupType.TRIGGER, objectType: ObjectType.TRIGGER },
      waypoint: { group: GroupType.WAYPOINT, objectType: ObjectType.WAYPOINT },
    };
    for (let i = 0; i < MODULE_HELPER_TYPES.length; i++) {
      const key = MODULE_HELPER_TYPES[i];
      const visible = helpers[key];
      const target = mapping[key];
      this.ui3DRenderer.group[target.group].visible = visible;
      this.ui3DRenderer.visibilityState[target.objectType] = visible;
    }
  }

  remove(options?: { skipUnsavedConfirm?: boolean }){
    const project = ForgeState.project instanceof Project ? ForgeState.project : undefined;
    super.remove(options);
    project?.onModuleEditorClosed(this);
  }

  destroy(): void {
    void this.stopPlayablePreview();
    if (this.autosaveTimer !== undefined) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = undefined;
    }
    forgeModuleSettings.removeListener(this.onModuleHelpersChange);
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

    // Update the module area (which updates all game objects)
    if(this.module?.area){
      this.module.area.update(delta);
    }

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
    if(this.tabMode === ModuleEditorTabMode.PREVIEW){
      return;
    }
    const controls = this.ui3DRenderer.transformControls as any;
    const snapping = this.ctrlSnapToggle ? !this.snapEnabled : this.snapEnabled;
    controls.setTranslationSnap?.(snapping ? this.snapPosition : null);
    controls.setRotationSnap?.(snapping ? THREE.MathUtils.degToRad(this.snapAngleDeg) : null);
    if(this.selectedEntryPoint && this.module){
      this.module.entryX = this.entryMarker.position.x;
      this.module.entryY = this.entryMarker.position.y;
      this.module.entryZ = this.entryMarker.position.z;
      this.module.entryDirectionX = Math.cos(this.entryMarker.rotation.z);
      this.module.entryDirectionY = Math.sin(this.entryMarker.rotation.z);
      this.updateFile({ coalesceKey: 'entry-gizmo' });
      return;
    }
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

    // Room world positions live in LYT; only sync while the user is dragging
    // (attach/detach also fires `change` and must not invent a zeroed layout).
    const dragging = !!controls.dragging;
    if(dragging && this.selectedGameObject instanceof ForgeRoom && this.module?.area){
      this.module.area.ensureLayout();
      this.module.area.syncLayoutAndVisInMemory();
    }

    if(dragging){
      this.applyMultiSelectTransformDelta();
      this.updateFile({ coalesceKey: 'transform' });
    }
  }

  private beginMultiSelectTransformTracking(): void {
    if(!this.selectedGameObject || this.selectedGameObjects.length <= 1){
      this.multiSelectTracking = false;
      return;
    }
    this.multiSelectPrevPos.copy(this.selectedGameObject.position);
    this.multiSelectPrevRotZ = this.selectedGameObject.rotation.z;
    this.multiSelectTracking = true;
  }

  private applyMultiSelectTransformDelta(): void {
    if(!this.multiSelectTracking || !this.selectedGameObject || this.selectedGameObjects.length <= 1){
      if(this.selectedGameObject){
        this.multiSelectPrevPos.copy(this.selectedGameObject.position);
        this.multiSelectPrevRotZ = this.selectedGameObject.rotation.z;
      }
      return;
    }
    const primary = this.selectedGameObject;
    const dx = primary.position.x - this.multiSelectPrevPos.x;
    const dy = primary.position.y - this.multiSelectPrevPos.y;
    const dz = primary.position.z - this.multiSelectPrevPos.z;
    const dYaw = primary.rotation.z - this.multiSelectPrevRotZ;
    const primaryIsRoom = primary instanceof ForgeRoom;
    const selectionAllRooms = this.selectedGameObjects.every((obj) => obj instanceof ForgeRoom);
    const selectionNoRooms = this.selectedGameObjects.every((obj) => !(obj instanceof ForgeRoom));
    const allowRoomBulk = primaryIsRoom && selectionAllRooms;
    const allowNonRoomBulk = !primaryIsRoom && selectionNoRooms;

    if(allowRoomBulk || allowNonRoomBulk){
      for(let i = 0; i < this.selectedGameObjects.length; i++){
        const obj = this.selectedGameObjects[i];
        if(obj === primary){
          continue;
        }
        obj.position.x += dx;
        obj.position.y += dy;
        obj.position.z += dz;
        obj.rotation.z += dYaw;
        obj.container.updateMatrixWorld(true);
      }
      if(allowRoomBulk && this.module?.area){
        this.module.area.ensureLayout();
        this.module.area.syncLayoutAndVisInMemory();
      }
    }

    this.multiSelectPrevPos.copy(primary.position);
    this.multiSelectPrevRotZ = primary.rotation.z;
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
      (this.ghostPreviewMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
    } else {
      if(this.ghostPreviewMesh){
        this.ghostPreviewMesh.visible = false;
        (this.ghostPreviewMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      }
      this.previewValid = false;
    }
  }

  refreshGhostBlueprintBounds(): void {
    const token = ++this.ghostBoundsToken;
    const type = this.selectedGameObjectType;
    const resref = this.selectedBlueprintResRef;
    if(!type || !resref || !this.ghostPreviewMesh){
      if(this.ghostPreviewMesh){
        this.ghostPreviewMesh.scale.set(1, 1, 1);
      }
      return;
    }
    void import("@/apps/forge/helpers/ghostBlueprintBounds").then(({ estimateBlueprintGhostSize }) => {
      estimateBlueprintGhostSize(type, resref).then((size) => {
        if(token !== this.ghostBoundsToken || !this.ghostPreviewMesh){
          return;
        }
        if(size){
          // BoxGeometry is unit-sized; scale to model AABB (keep a small floor so it stays visible).
          this.ghostPreviewMesh.scale.set(
            Math.max(0.35, size.x),
            Math.max(0.35, size.y),
            Math.max(0.35, size.z)
          );
        }else{
          this.ghostPreviewMesh.scale.set(1, 1, 1);
        }
      }).catch(() => {
        if(token === this.ghostBoundsToken && this.ghostPreviewMesh){
          this.ghostPreviewMesh.scale.set(1, 1, 1);
        }
      });
    });
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
    if(this.tabMode === ModuleEditorTabMode.PREVIEW){
      return;
    }
    if(event.button !== 0 || !this.ui3DRenderer.canvas){ // Left mouse button only
      return;
    }

    // Handle placement when in ADD_GAME_OBJECT mode
    if(this.controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT && this.selectedGameObjectType && this.module?.area){
      const intersection = this.findPlacementIntersection();
      if(intersection && intersection.point){
        const oneShot = event.shiftKey || !this.placeSticky;
        this.placeGameObject(intersection.point, { oneShot });
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
      this.toolService.setTool(EditorTool.TRANSLATE);
    } else if(mode === TabModuleEditorControlMode.ROTATE_CONTROL){
      this.ui3DRenderer.transformControls.mode = 'rotate';
      this.updateTransformControlHelpers(this.selectedGameObject!);
      this.toolService.setTool(EditorTool.ROTATE);
    } else if(mode === TabModuleEditorControlMode.SCALE_CONTROL){
      this.ui3DRenderer.transformControls.mode = 'scale';
      this.updateTransformControlHelpers(this.selectedGameObject!);
      this.toolService.setTool(EditorTool.SCALE);
    } else if(mode === TabModuleEditorControlMode.ADD_GAME_OBJECT){
      this.toolService.setTool(EditorTool.PLACE);
      this.toolService.setMode(EditorMode.PLACE);
    } else {
      this.toolService.setTool(EditorTool.SELECT);
      this.toolService.setMode(EditorMode.EDIT);
    }

    this.processEventListener('onControlModeChange', [mode]);
  }

  onSelect(gameObject: ForgeGameObject | THREE.Object3D | undefined){
    if(this.tabMode === ModuleEditorTabMode.PREVIEW){
      return;
    }
    if(gameObject instanceof THREE.Object3D){
      let current: THREE.Object3D | null = gameObject;
      while(current){
        if(current.userData?.moduleEntry){
          this.selectedEntryPoint = true;
          this.selectGameObject(undefined);
          this.ui3DRenderer.transformControls.detach();
          this.ui3DRenderer.transformControls.attach(this.entryMarker);
          return;
        }
        current = current.parent;
      }
    }
    this.selectedEntryPoint = false;
    
    // Check if a vertex helper was selected
    if(gameObject instanceof THREE.Mesh && gameObject.userData?.vertexIndex !== undefined){
      const forgeGameObject = gameObject.userData.forgeGameObject as ForgeTrigger | ForgeEncounter;
      if(forgeGameObject && (forgeGameObject instanceof ForgeTrigger || forgeGameObject instanceof ForgeEncounter)){
        const vertexIndex = gameObject.userData.vertexIndex as number;
        forgeGameObject.selectVertex(vertexIndex);
        // Attach transform controls to the selected vertex helper
        this.ui3DRenderer.transformControls.detach();
        this.ui3DRenderer.transformControls.attach(gameObject);
        this.ui3DRenderer.transformControls.size = 0.25;
        return;
      }
    }
    
    // Otherwise, select the game object
    if(gameObject instanceof ForgeGameObject){
      this.selectGameObject(gameObject, this.shiftSelecting);
    } else if(gameObject instanceof THREE.Object3D){
      // Try to find ForgeGameObject from userData
      let current: THREE.Object3D | null = gameObject;
      while(current){
        if(current.userData?.forgeGameObject instanceof ForgeGameObject){
          this.selectGameObject(current.userData.forgeGameObject);
          return;
        }
        current = current.parent;
      }
      this.selectGameObject(undefined);
    } else {
      this.selectGameObject(undefined);
    }
  }

  onKeyDown(event: KeyboardEvent, tab: TabState){
    const target = event.target as HTMLElement | null;
    if(target){
      const tag = target.tagName;
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable){
        return;
      }
    }
    if(event.key === 'Control'){
      this.ctrlSnapToggle = true;
    }
    if(event.key === 'Shift'){
      this.shiftSelecting = true;
    }
    if(event.key.toLowerCase() === 'p' && !(event.ctrlKey || event.metaKey || event.altKey)){
      void this.setPreviewMode(this.tabMode !== ModuleEditorTabMode.PREVIEW);
      return;
    }
    if(event.key === '?' || (event.shiftKey && event.key === '/')){
      this.showKeymapHelp = !this.showKeymapHelp;
      this.processEventListener('onKeymapHelpChange', [this.showKeymapHelp]);
      return;
    }
    if(event.key.toLowerCase() === 't' && this.controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT){
      this.setPlaceSticky(!this.placeSticky);
      return;
    }
    if(event.key === 'Escape' && this.tabMode === ModuleEditorTabMode.PREVIEW){
      event.preventDefault();
      event.stopPropagation();
      void this.stopPlayablePreview();
      return;
    }
    if(this.tabMode === ModuleEditorTabMode.PREVIEW){
      return;
    }
    if(event.key === 'Escape' && this.controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT){
      event.preventDefault();
      event.stopPropagation();
      this.selectedBlueprintResRef = '';
      this.selectedGameObjectType = undefined;
      this.setControlMode(TabModuleEditorControlMode.SELECT);
      return;
    }
    if(event.key.toLowerCase() === 'q'){
      this.setControlMode(TabModuleEditorControlMode.SELECT);
    }else if(event.key.toLowerCase() === 'w'){
      this.setControlMode(TabModuleEditorControlMode.TRANSFORM_CONTROL);
    }else if(event.key.toLowerCase() === 'e'){
      this.setControlMode(TabModuleEditorControlMode.ROTATE_CONTROL);
    }else if(event.key.toLowerCase() === 'r'){
      this.setControlMode(TabModuleEditorControlMode.SCALE_CONTROL);
    }else if(event.key.toLowerCase() === 'f'){
      if(event.shiftKey){
        this.ui3DRenderer.fitCameraToScene();
      }else if(this.selectedGameObject?.container){
        this.ui3DRenderer.lookAtObject(this.selectedGameObject.container);
      }
    }else if(event.key.toLowerCase() === 'x'){
      const controls = this.ui3DRenderer.transformControls as any;
      const next = controls.space === 'local' ? 'world' : 'local';
      controls.setSpace?.(next);
      controls.space = next;
    }
    // Handle Delete key to remove selected object(s)
    if((event.key === 'Delete') && this.selectedGameObjects.length && this.module?.area){
      // Prevent default browser behavior (e.g., going back in history)
      event.preventDefault();
      event.stopPropagation();
      void this.deleteSelectedGameObject();
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    if(event.key === 'Control'){
      this.ctrlSnapToggle = false;
    }
    if(event.key === 'Shift'){
      this.shiftSelecting = false;
    }
  }

  async deleteSelectedGameObject(): Promise<void> {
    if(!this.module?.area){
      return;
    }
    const targets = this.selectedGameObjects.length
      ? this.selectedGameObjects.slice()
      : (this.selectedGameObject ? [this.selectedGameObject] : []);
    if(!targets.length){
      return;
    }
    let touchedRoom = false;
    for(let i = 0; i < targets.length; i++){
      if(targets[i] instanceof ForgeRoom){
        touchedRoom = true;
      }
      this.module.area.detachObject(targets[i]);
    }
    this.selectGameObject(undefined);
    if(touchedRoom){
      this.module.area.ensureLayout();
      this.module.area.syncLayoutAndVisInMemory();
    }
    this.updateFile();
  }

  setPlaceSticky(enabled: boolean): void {
    this.placeSticky = !!enabled;
    this.processEventListener('onPlaceStickyChange', [this.placeSticky]);
    this.processEventListener('onControlModeChange', [this.controlMode]);
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

  selectGameObject(gameObject: ForgeGameObject | undefined, additive: boolean = false){
    const previous = this.selectedGameObject;
    this.selectedGameObject = gameObject;
    if(gameObject && additive){
      this.selectedGameObjects = this.selectedGameObjects.includes(gameObject)
        ? this.selectedGameObjects
        : [...this.selectedGameObjects, gameObject];
    }else{
      this.selectedGameObjects = gameObject ? [gameObject] : [];
    }
    this.ui3DRenderer.transformControls.detach();
    
    // Hide vertex helpers for previously selected trigger/encounter
    if(previous instanceof ForgeTrigger || previous instanceof ForgeEncounter){
      const prevObject = previous as ForgeTrigger | ForgeEncounter;
      prevObject.showVertexHelpers(false);
      prevObject.selectVertex(-1);
    }
    
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
    
    // Show vertex helpers for triggers and encounters
    if(gameObject instanceof ForgeTrigger || gameObject instanceof ForgeEncounter){
      gameObject.showVertexHelpers(true);
    }
    
    if(gameObject){
      this.ui3DRenderer.transformControls.attach(gameObject.container);
      this.ui3DRenderer.transformControls.size = 0.5;
      this.updateTransformControlHelpers(gameObject);
      this.beginMultiSelectTransformTracking();
    }
    this.ui3DRenderer.sceneGraphManager?.syncSelectionFromGameObjects(this.selectedGameObjects);
    this.selectionService.selectMany(this.selectedGameObjects, false);
    this.processEventListener('onSelectionChanged', [gameObject, this.selectedGameObjects]);
  }

  cyclePreviewSpawnMode(): void {
    const order: Array<'entry' | 'camera' | 'waypoint'> = ['entry', 'camera', 'waypoint'];
    const idx = order.indexOf(this.previewSpawnMode);
    this.previewSpawnMode = order[(idx + 1) % order.length];
    this.processEventListener('onPreviewSpawnModeChange', [this.previewSpawnMode]);
  }

  getPreviewSpawnWaypointTag(): string | null {
    if(this.previewSpawnMode !== 'waypoint'){
      return null;
    }
    const pinned = String(this.previewWarpWaypointTag || '').trim();
    if(pinned){
      return pinned;
    }
    const wp = this.selectedGameObject instanceof ForgeWaypoint
      ? this.selectedGameObject
      : this.selectedGameObjects.find((o) => o instanceof ForgeWaypoint) as ForgeWaypoint | undefined;
    const tag = String(wp?.tag || '').trim();
    return tag || null;
  }

  setPreviewWarpFromSelection(): boolean {
    const wp = this.selectedGameObject instanceof ForgeWaypoint
      ? this.selectedGameObject
      : this.selectedGameObjects.find((o) => o instanceof ForgeWaypoint) as ForgeWaypoint | undefined;
    const tag = String(wp?.tag || '').trim();
    if(!tag){
      return false;
    }
    this.previewWarpWaypointTag = tag;
    this.previewSpawnMode = 'waypoint';
    this.processEventListener('onPreviewSpawnModeChange', [this.previewSpawnMode]);
    return true;
  }

  clearPreviewWarp(): void {
    this.previewWarpWaypointTag = null;
    if(this.previewSpawnMode === 'waypoint'){
      this.previewSpawnMode = 'entry';
    }
    this.processEventListener('onPreviewSpawnModeChange', [this.previewSpawnMode]);
  }

  placeGameObject(position: THREE.Vector3, options?: { oneShot?: boolean }){
    if(!this.module?.area || !this.selectedGameObjectType){
      return;
    }

    const typesThatUseBlueprints = [GameObjectType.CREATURE, GameObjectType.DOOR, GameObjectType.ENCOUNTER, GameObjectType.ITEM, GameObjectType.PLACEABLE, GameObjectType.SOUND, GameObjectType.STORE, GameObjectType.TRIGGER, GameObjectType.WAYPOINT];
    const useBlueprintLoader = typesThatUseBlueprints.includes(this.selectedGameObjectType);
    const placedType = this.selectedGameObjectType;
    const placedResRef = this.selectedBlueprintResRef;

    if(useBlueprintLoader && !this.selectedBlueprintResRef){
      return;
    }

    const gameObject = this.createGameObject(this.selectedGameObjectType);
    if(!gameObject){
      console.error(`Failed to create game object of type: ${this.selectedGameObjectType}`);
      return;
    }

    // Set template resref if one was selected
    if(this.selectedGameObjectType === GameObjectType.ROOM && this.selectedBlueprintResRef){
      (gameObject as ForgeRoom).roomName = this.selectedBlueprintResRef;
    }else if(this.selectedBlueprintResRef){
      const resType = this.getResourceTypeForGameObjectType(this.selectedGameObjectType);
      gameObject.setTemplateResRef(this.selectedBlueprintResRef, resType);
    }

    if(placedResRef){
      this.lastBlueprintByType[placedType] = placedResRef;
    }

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
      if(gameObject instanceof ForgeRoom){
        this.module?.area.ensureLayout();
        this.module?.area.syncLayoutAndVisInMemory();
      }
    })();

    // Notify listeners
    this.processEventListener('onGameObjectPlaced', [gameObject, placedType]);
    this.updateFile();

    const oneShot = options?.oneShot === true || !this.placeSticky;
    if(oneShot){
      this.selectedBlueprintResRef = '';
      this.selectedGameObjectType = undefined;
      this.setControlMode(TabModuleEditorControlMode.TRANSFORM_CONTROL);
      this.ghostPreviewMesh.visible = false;
      this.selectGameObject(gameObject);
    }else{
      // Stay in place mode with the same blueprint.
      this.processEventListener('onControlModeChange', [this.controlMode]);
    }
  }

  openBlueprintBrowser(){
    this.openBlueprintBrowserForType('utc');
  }

  cloneGameObject(gameObject: ForgeGameObject, options?: { select?: boolean }): ForgeGameObject | undefined {
    if(!gameObject || !this.module?.area){
      return undefined;
    }
    if(typeof (gameObject as any).getGITInstance !== 'function'){
      return undefined;
    }
    const gameObjectType = this.getGameObjectTypeFromGameObject(gameObject);
    if(!gameObjectType || gameObjectType === GameObjectType.ROOM){
      return undefined;
    }
    const clone = this.createGameObject(gameObjectType);
    if(!clone){
      return undefined;
    }
    clone.setGITInstance((gameObject as any).getGITInstance());
    clone.position.x += 0.5;
    clone.position.y += 0.5;
    if(typeof (clone as any).tag === 'string' && (clone as any).tag){
      (clone as any).tag = `${(clone as any).tag}_copy`.slice(0, 32);
    }
    this.module.area.attachObject(clone);
    void (async () => {
      await clone.loadBlueprint();
      await clone.load();
    })();
    if(options?.select !== false){
      this.selectGameObject(clone);
      this.updateFile();
    }
    return clone;
  }

  duplicateSelectedGameObjects(): void {
    const sources = this.selectedGameObjects.length
      ? this.selectedGameObjects.slice()
      : (this.selectedGameObject ? [this.selectedGameObject] : []);
    if(!sources.length){
      return;
    }
    const clones: ForgeGameObject[] = [];
    for(let i = 0; i < sources.length; i++){
      const clone = this.cloneGameObject(sources[i], { select: false });
      if(clone){
        clones.push(clone);
      }
    }
    if(!clones.length){
      return;
    }
    this.updateFile();
    this.selectedGameObjects = clones;
    this.selectedGameObject = clones[0];
    this.ui3DRenderer.transformControls.detach();
    this.ui3DRenderer.transformControls.attach(clones[0].container);
    this.beginMultiSelectTransformTracking();
    this.processEventListener('onSelectionChanged', [clones[0], clones]);
  }

  openBlueprintBrowserForType(blueprintType: BlueprintType){
    const gameObjectType = this.getGameObjectTypeFromBlueprintType(blueprintType);
    const initial = (gameObjectType && this.lastBlueprintByType[gameObjectType]) || undefined;
    openBlueprintBrowser(blueprintType, (blueprint, type) => {
      const nextType = this.getGameObjectTypeFromBlueprintType(type);
      if(nextType){
        this.setGameObjectControlOptions(nextType, blueprint.resref, type);
      }
    }, initial);
  }

  setGameObjectControlOptions(gameObjectType: GameObjectType, resref: string, resType: typeof KotOR.ResourceTypes){
    this.selectedGameObjectType = gameObjectType;
    this.selectedBlueprintResRef = resref || this.lastBlueprintByType[gameObjectType] || '';
    if(this.selectedBlueprintResRef){
      this.lastBlueprintByType[gameObjectType] = this.selectedBlueprintResRef;
    }
    this.setControlMode(TabModuleEditorControlMode.ADD_GAME_OBJECT);
    this.refreshGhostBlueprintBounds();
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
      case GameObjectType.ROOM:
        return new ForgeRoom(this.selectedBlueprintResRef || 'room');
      default:
        console.error(`Unknown game object type: ${type}`);
        return null;
    }
  }

  editorFileUpdated(): void {
    const entryArea = this.module?.entryArea?.trim();
    this.setTabName(entryArea ? `${entryArea} · Module` : 'Module Editor');
  }

  bindProjectFiles(project: Project): void {
    this.setEditorFile(project.module_ifo);
    this.areFile = project.module_are;
    this.gitFile = project.module_git;
  }

  async loadFromProject(project: Project): Promise<boolean> {
    this.bindProjectFiles(project);
    const module = await TabModuleEditorState.FromProject(project);
    if(!module){
      return false;
    }
    this.module = module;
    this.module.setContext(this.ui3DRenderer);
    await this.module.load();
    this.updateEntryMarker();
    await this.refreshPathOverlay();
    this.focusCameraOnModuleEntry();
    this.processEventListener('onModuleLoaded', [this.module]);
    return true;
  }

  /** Read-only PTH markers in the module viewport (deep edit stays in PTH tab). */
  async refreshPathOverlay(): Promise<void> {
    while(this.pathOverlayGroup.children.length){
      const child = this.pathOverlayGroup.children.pop();
      if(child instanceof THREE.Mesh){
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    const area = this.module?.area;
    if(!area){
      return;
    }
    const resref = area.getLayoutResRef();
    const filename = `${resref}.pth`;
    try{
      const { ProjectFileSystem } = await import("@/apps/forge/ProjectFileSystem");
      if(!(await ProjectFileSystem.exists(filename))){
        return;
      }
      const buffer = await ProjectFileSystem.readFile(filename);
      if(!buffer){
        return;
      }
      const gff = new KotOR.GFFObject(buffer);
      const pathPoints = gff.getFieldByLabel('Path_Points')?.getChildStructs() || [];
      const sphere = new THREE.SphereGeometry(0.2, 10, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        transparent: true,
        opacity: 0.7,
        depthTest: false,
      });
      for(let i = 0; i < pathPoints.length; i++){
        const point = KotOR.PathPoint.FromGFFStruct(pathPoints[i]);
        const marker = new THREE.Mesh(sphere, material);
        marker.position.copy(point.vector);
        marker.position.z += 0.15;
        marker.name = `pth-point-${i}`;
        this.pathOverlayGroup.add(marker);
      }
    }catch(e){
      console.warn('Failed to load path overlay', e);
    }
  }

  /**
   * Place the viewport camera behind Mod_Entry looking at the spawn point.
   */
  focusCameraOnModuleEntry(): void {
    if (!this.module || !this.ui3DRenderer?.camera) {
      return;
    }
    if (!this.ui3DRenderer.orbitControls) {
      this.pendingFocusEntry = true;
      return;
    }
    this.pendingFocusEntry = false;

    const entry = new THREE.Vector3(
      this.module.entryX,
      this.module.entryY,
      this.module.entryZ,
    );
    let facingX = this.module.entryDirectionX;
    let facingY = this.module.entryDirectionY;
    const facingLen = Math.hypot(facingX, facingY);
    if (facingLen < 1e-4) {
      facingX = 0;
      facingY = 1;
    } else {
      facingX /= facingLen;
      facingY /= facingLen;
    }

    const distance = 8;
    const height = 4;
    const camera = this.ui3DRenderer.camera;
    camera.up.set(0, 0, 1);
    camera.position.set(
      entry.x - facingX * distance,
      entry.y - facingY * distance,
      entry.z + height,
    );
    camera.lookAt(entry);
    this.ui3DRenderer.orbitControls.target.copy(entry);
    this.ui3DRenderer.orbitControls.update();
  }

  updateEntryMarker(): void {
    if(!this.module || !this.entryMarker){
      return;
    }
    this.entryMarker.position.set(this.module.entryX, this.module.entryY, this.module.entryZ);
    this.entryMarker.rotation.z = Math.atan2(this.module.entryDirectionY, this.module.entryDirectionX);
    this.entryMarker.visible = true;
  }

  setEntryFromSelection(): void {
    if(!this.module){
      return;
    }
    const source = this.selectedGameObject;
    if(!source){
      return;
    }
    this.module.entryX = source.position.x;
    this.module.entryY = source.position.y;
    this.module.entryZ = source.position.z;
    if(source instanceof ForgeWaypoint){
      const yaw = source.rotation?.z ?? 0;
      this.module.entryDirectionX = Math.cos(yaw);
      this.module.entryDirectionY = Math.sin(yaw);
    }else{
      this.module.entryDirectionX = Math.cos(source.rotation.z);
      this.module.entryDirectionY = Math.sin(source.rotation.z);
    }
    this.updateEntryMarker();
  }

  setEntryFromCamera(): void {
    if(!this.module || !this.ui3DRenderer?.camera){
      return;
    }
    const cam = this.ui3DRenderer.camera;
    this.module.entryX = cam.position.x;
    this.module.entryY = cam.position.y;
    this.module.entryZ = cam.position.z;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const len = Math.hypot(forward.x, forward.y) || 1;
    this.module.entryDirectionX = forward.x / len;
    this.module.entryDirectionY = forward.y / len;
    this.updateEntryMarker();
  }

  focusEntryMarker(): void {
    if(!this.module || !this.entryMarker){
      return;
    }
    this.updateEntryMarker();
    this.selectedEntryPoint = true;
    this.selectGameObject(undefined);
    this.setControlMode(TabModuleEditorControlMode.TRANSFORM_CONTROL);
    this.ui3DRenderer.transformControls.detach();
    this.ui3DRenderer.transformControls.attach(this.entryMarker);
    this.ui3DRenderer.lookAtObject(this.entryMarker);
  }

  /** Unique GIT tag for waypoints (max 16/32 chars used elsewhere — keep ≤32). */
  private allocateUniqueWaypointTag(base: string): string {
    const root = String(base || 'waypoint').trim() || 'waypoint';
    const existing = new Set(
      (this.module?.area?.waypoints || []).map((wp) => String(wp.tag || '').trim().toLowerCase()).filter(Boolean),
    );
    if(!existing.has(root.toLowerCase())){
      return root.slice(0, 32);
    }
    for(let i = 2; i < 1000; i++){
      const suffix = `_${i}`;
      const next = `${root.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
      if(!existing.has(next.toLowerCase())){
        return next;
      }
    }
    return `${root.slice(0, 28)}_${Date.now() % 10000}`.slice(0, 32);
  }

  /**
   * Place a waypoint at Mod_Entry. If a waypoint is selected, clone its fields;
   * otherwise create a blank waypoint instance.
   */
  placeWaypointAtEntry(): ForgeWaypoint | undefined {
    if(!this.module?.area){
      return undefined;
    }
    const source = this.selectedGameObject instanceof ForgeWaypoint
      ? this.selectedGameObject
      : undefined;

    let wp: ForgeWaypoint | undefined;
    if(source){
      const clone = this.cloneGameObject(source, { select: false });
      if(!(clone instanceof ForgeWaypoint)){
        return undefined;
      }
      wp = clone;
      wp.tag = this.allocateUniqueWaypointTag(String(source.tag || 'waypoint'));
    }else{
      const created = this.createGameObject(GameObjectType.WAYPOINT);
      if(!(created instanceof ForgeWaypoint)){
        return undefined;
      }
      wp = created;
      wp.tag = this.allocateUniqueWaypointTag('entry');
      this.module.area.attachObject(wp);
      void (async () => {
        try{
          await wp!.load();
        }catch(e){
          console.warn('placeWaypointAtEntry: failed to load waypoint', e);
        }
      })();
    }

    wp.position.set(this.module.entryX, this.module.entryY, this.module.entryZ);
    wp.rotation.z = Math.atan2(this.module.entryDirectionY, this.module.entryDirectionX);
    wp.container.updateMatrixWorld(true);
    this.selectGameObject(wp);
    this.updateFile();
    return wp;
  }

  /** Open the area's .pth in the path editor (creates tab; deep editing stays there). */
  async openAreaPath(): Promise<void> {
    const area = this.module?.area;
    if(!area){
      return;
    }
    const resref = area.getLayoutResRef();
    const filename = `${resref}.pth`;
    const { ProjectFileSystem } = await import("@/apps/forge/ProjectFileSystem");
    const { TabPTHEditorState } = await import("@/apps/forge/states/tabs/TabPTHEditorState");
    const { ForgeState } = await import("@/apps/forge/states/ForgeState");
    const { EditorFile } = await import("@/apps/forge/EditorFile");
    const { ResourceTypes } = await import("@/resource/ResourceTypes");

    if(await ProjectFileSystem.exists(filename)){
      const editorFile = await ProjectFileSystem.openEditorFile(filename);
      ForgeState.tabManager.addTab(new TabPTHEditorState({ editorFile }));
      return;
    }

    ForgeState.tabManager.addTab(new TabPTHEditorState({
      editorFile: new EditorFile({ resref, reskey: ResourceTypes.pth }),
    }));
  }

  /** Open a room walkmesh (.wok) for the selected room or first area room. */
  async openAreaWalkmesh(): Promise<void> {
    const area = this.module?.area;
    if (!area) {
      return;
    }
    const room = this.selectedGameObject instanceof ForgeRoom
      ? this.selectedGameObject
      : area.rooms?.[0];
    const resref = (room?.roomName || area.getLayoutResRef() || "").toLowerCase();
    if (!resref) {
      return;
    }
    const filename = `${resref}.wok`;
    const { ProjectFileSystem } = await import("@/apps/forge/ProjectFileSystem");
    const { TabWOKEditorState } = await import("@/apps/forge/states/tabs/TabWOKEditorState");
    const { ForgeState } = await import("@/apps/forge/states/ForgeState");
    const { EditorFile } = await import("@/apps/forge/EditorFile");
    const { ResourceTypes } = await import("@/resource/ResourceTypes");

    if (await ProjectFileSystem.exists(filename)) {
      const editorFile = await ProjectFileSystem.openEditorFile(filename);
      ForgeState.tabManager.addTab(new TabWOKEditorState({ editorFile }));
      return;
    }

    ForgeState.tabManager.addTab(new TabWOKEditorState({
      editorFile: new EditorFile({ resref, reskey: ResourceTypes.wok }),
    }));
  }

  openAddRoomBrowser(): void {
    openResRefBrowser('mdl', (resref) => {
      void this.addRoom(resref);
    });
  }

  async addRoom(roomName: string): Promise<void> {
    if(!this.module?.area || !roomName){
      return;
    }
    const room = new ForgeRoom(roomName);
    room.setAmbientScale(1);
    room.setEnvAudio(0);
    this.module.area.attachObject(room);
    try{
      await room.load();
    }catch(e){
      console.warn('Failed to load room', roomName, e);
    }
    this.module.area.ensureLayout();
    this.module.area.syncLayoutAndVisInMemory();
    this.selectGameObject(room);
    this.updateFile();
  }

  protected captureUndoState(): ModuleEditorSnapshot | undefined {
    return this.serializeModuleBuffers();
  }

  protected applyUndoState(state: ModuleEditorSnapshot): void {
    this.snapshotRestore = this.snapshotRestore
      .then(() => this.applyModuleSnapshot(state))
      .catch((error) => console.error('Failed to restore module editor snapshot', error));
  }

  private async applyModuleSnapshot(state: ModuleEditorSnapshot): Promise<void> {
    this.module?.area?.clearAttachedObjects();
    this.selectGameObject(undefined);
    const ifo = new KotOR.GFFObject(state.ifo);
    const are = new KotOR.GFFObject(state.are);
    const git = new KotOR.GFFObject(state.git);
    const module = new ForgeModule(ifo);
    module.area = new ForgeArea(git, are);
    module.area.module = module;
    module.areas = [module.area];
    this.module = module;
    this.module.setContext(this.ui3DRenderer);
    await this.module.load();
    if(state.lyt){
      this.module.area.layout = new KotOR.LYTObject(state.lyt);
      if(!this.module.area.layoutPresentOnDisk && !this.module.area.layoutLoadedFromGame){
        this.module.area.layoutEnsuredByEditor = true;
      }
      for(let i = 0; i < this.module.area.layout.rooms.length; i++){
        const layoutRoom = this.module.area.layout.rooms[i];
        const room = this.module.area.rooms.find((candidate) =>
          candidate.roomName.toLowerCase() === layoutRoom.name.toLowerCase()
        );
        room?.position.copy(layoutRoom.position);
      }
    }else{
      this.module.area.layout = undefined;
      this.module.area.layoutEnsuredByEditor = false;
      this.module.area.layoutLoadedFromGame = false;
    }
    if(state.vis){
      this.module.area.visObject = new KotOR.VISObject(state.vis);
      this.module.area.visObject.read();
      this.module.area.visObject.attachArea(this.module.area as any);
    }else{
      this.module.area.visObject = undefined;
    }
    this.updateEntryMarker();
    await this.refreshPathOverlay();
    this.processEventListener('onModuleLoaded', [this.module]);
    this.updateFile({ skipHistory: true });
  }

  updateFile(options?: UpdateFileOptions): void {
    if(!options?.skipHistory){
      if(options?.coalesceKey){
        this.captureCoalescedUndo(options.coalesceKey);
      }else{
        this.captureUndoSnapshot();
      }
    }
    if(this.file instanceof EditorFile){
      this.file.unsaved_changes = true;
    }
    if(this.areFile instanceof EditorFile){
      this.areFile.unsaved_changes = true;
    }
    if(this.gitFile instanceof EditorFile){
      this.gitFile.unsaved_changes = true;
    }
    this.updateEntryMarker();
    this.editorFileUpdated();
  }

  serializeModuleBuffers(): ModuleEditorSnapshot | undefined {
    if(!this.module?.area){
      return undefined;
    }
    const ifo = this.module.exportToIFO();
    const are = this.module.area.exportToARE();
    const git = this.module.area.exportToGIT();
    this.module.ifo = ifo;
    this.module.area.are = are;
    this.module.area.git = git;
    if(this.module.area.layout){
      this.module.area.syncLayoutAndVisInMemory();
    }
    return {
      ifo: ifo.getExportBuffer(),
      are: are.getExportBuffer(),
      git: git.getExportBuffer(),
      lyt: this.module.area.shouldPersistLayout()
        ? this.module.area.layout?.export()
        : undefined,
      vis: this.module.area.shouldPersistLayout()
        ? new TextEncoder().encode(this.module.area.buildVisText())
        : undefined,
    };
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    const buffers = this.serializeModuleBuffers();
    if(!buffers){
      return super.getExportBuffer(resref, ext);
    }
    const key = String(ext || '').toLowerCase().replace(/^\./, '');
    if(key === 'are'){
      return buffers.are;
    }
    if(key === 'git'){
      return buffers.git;
    }
    return buffers.ifo;
  }

  async save(): Promise<boolean> {
    const buffers = this.serializeModuleBuffers();
    if(!buffers){
      return super.save();
    }
    let ok = true;
    if(this.file instanceof EditorFile){
      ok = (await this.file.writeBuffer(buffers.ifo)) && ok;
    }
    if(this.areFile instanceof EditorFile){
      ok = (await this.areFile.writeBuffer(buffers.are)) && ok;
    }
    if(this.gitFile instanceof EditorFile){
      ok = (await this.gitFile.writeBuffer(buffers.git)) && ok;
    }
    if(this.module.area.shouldPersistLayout()){
      await this.module.area.flushLayoutAndVis();
    }
    if(ok){
      if(this.file instanceof EditorFile) this.file.unsaved_changes = false;
      if(this.areFile instanceof EditorFile) this.areFile.unsaved_changes = false;
      if(this.gitFile instanceof EditorFile) this.gitFile.unsaved_changes = false;
    }
    return ok;
  }

  setPreviewMode(enabled: boolean): void {
    if(enabled){
      void this.startPlayablePreview();
    }else{
      void this.stopPlayablePreview();
    }
  }

  async startPlayablePreview(): Promise<boolean> {
    const host = this.previewHostElement;
    if(!host){
      window.alert("Preview host is not ready. Open the Module Editor viewport and try again.");
      return false;
    }
    const { ModulePreviewSession } = await import("@/apps/forge/module-editor/ModulePreviewSession");
    const result = await ModulePreviewSession.start(this, host);
    if(!result.ok){
      window.alert(result.reason || "Failed to start playable preview.");
      this.tabMode = ModuleEditorTabMode.EDIT;
      this.processEventListener("onPreviewModeChange", [false]);
      return false;
    }
    if(result.skippedNss?.length){
      console.warn("Preview skipped uncompiled NSS (need NCS):", result.skippedNss.join(", "));
      this.processEventListener("onPreviewSkippedNss", [result.skippedNss]);
    }else{
      this.processEventListener("onPreviewSkippedNss", [[]]);
    }
    return true;
  }

  async warmReloadPlayablePreview(): Promise<boolean> {
    const { ModulePreviewSession } = await import("@/apps/forge/module-editor/ModulePreviewSession");
    const result = await ModulePreviewSession.warmReload(this);
    if(!result.ok){
      window.alert(result.reason || "Failed to reload preview.");
      return false;
    }
    if(result.skippedNss?.length){
      this.processEventListener("onPreviewSkippedNss", [result.skippedNss]);
    }
    return true;
  }

  async stopPlayablePreview(): Promise<void> {
    const { ModulePreviewSession } = await import("@/apps/forge/module-editor/ModulePreviewSession");
    await ModulePreviewSession.stop(this);
  }

  previewHostElement: HTMLElement | undefined;

  setPreviewHostElement(el: HTMLElement | null | undefined): void {
    this.previewHostElement = el || undefined;
  }

  //This should only be used inside KotOR Forge
  static async FromProject(project: Project): Promise<ForgeModule | undefined> {
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