import * as fs from "fs";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from 'three';
import React from "react";
import { TabModelViewer } from "@/apps/forge/components/tabs/tab-model-viewer/TabModelViewer";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { EditorFile } from "@/apps/forge/EditorFile";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { SceneGraphNode } from "@/apps/forge/SceneGraphNode";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import {
  promptForDirectory,
  collectModelAssets,
  collectTxiReferencedTextures,
  exportCollectedAssets,
  fetchModelBuffers,
  showExtractionResults,
  createProgressModal,
} from "@/apps/forge/helpers/AssetExtraction";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";

declare const dialog: any;

export type ModelViewerLayerKey =
  | 'lights'
  | 'emitters'
  | 'walkmeshes'
  | 'trimesh'
  | 'skin'
  | 'dangly'
  | 'saber'
  | 'childModels'
  | 'layout'
  | 'ground';

export type ModelViewerLayerVisibility = Record<ModelViewerLayerKey, boolean>;

export type ModelViewerTrackFilterScope = 'all' | 'selectedNode' | 'cameraHook';

export interface ModelViewerEditableTrack {
  id: string;
  nodeName: string;
  nodeType: number;
  controllerType: number;
  label: string;
  isCameraHook: boolean;
  controller: KotOR.OdysseyController;
  keys: KotOR.IOdysseyControllerFrameGeneric[];
}

export interface ModelViewerEditableKeySelection {
  trackId: string;
  keyIndex: number;
}

interface ModelViewerUndoFrameSnapshot {
  time: number;
  x: number;
  y: number;
  z: number;
  w: number;
  value: any;
  isBezier: boolean;
  isLinearBezier: boolean;
  lastFrame: boolean;
}

interface ModelViewerUndoControllerSnapshot {
  type: number;
  nodeType: number;
  columnCount: number;
  frames: ModelViewerUndoFrameSnapshot[];
}

interface ModelViewerUndoNodeSnapshot {
  name: string;
  controllers: ModelViewerUndoControllerSnapshot[];
}

interface ModelViewerUndoAnimationSnapshot {
  name: string;
  nodes: ModelViewerUndoNodeSnapshot[];
}

interface ModelViewerUndoSnapshot {
  selectedAnimationIndex: number;
  currentElapsed: number;
  animations: ModelViewerUndoAnimationSnapshot[];
  selectedTrackId?: string;
  selectedKeyIndex?: number;
}

export enum TabModelViewerControlMode {
  SELECT = 0,
  TRANSLATE = 1,
  ROTATE = 2,
}

export const DEFAULT_MODEL_VIEWER_LAYER_VISIBILITY: ModelViewerLayerVisibility = {
  lights: true,
  emitters: true,
  walkmeshes: false,
  trimesh: true,
  skin: true,
  dangly: true,
  saber: true,
  childModels: true,
  layout: true,
  ground: true,
};

export type TabModelViewerStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onModelLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|
  'onHeadLoad'|'onKeyFrameSelect'|'onKeyFrameTrackZoomIn'|'onKeyFrameTrackZoomOut'|
  'onAnimate'|'onKeyFramesChange'|'onDurationChange'|'onAnimationChange'|'onLoopChange'|
  'onNodeSelect'|'onCameraChange'|'onModelViewerLayersChange'|'onKeyframeEditorChange'|
  'onTrackSelectionChange'|'onKeySelectionChange'|'onControlModeChange';

export interface TabModelViewerStateEventListeners extends TabStateEventListeners {
  onModelLoaded: Function[],
  onPlay: Function[],
  onPause: Function[],
  onStop: Function[],
  onAudioLoad: Function[],
  onHeadChange: Function[],
  onHeadLoad: Function[],
  onKeyFrameSelect: Function[],
  onKeyFrameTrackZoomIn: Function[],
  onKeyFrameTrackZoomOut: Function[],
  onAnimate: Function[],
  onKeyFramesChange: Function[],
  onDurationChange: Function[],
  onAnimationChange: Function[],
  onLoopChange: Function[],
  onNodeSelect: Function[],
  onCameraChange: Function[],
  onModelViewerLayersChange: Function[],
  onKeyframeEditorChange: Function[],
  onTrackSelectionChange: Function[],
  onKeySelectionChange: Function[],
  onControlModeChange: Function[],
}

export class TabModelViewerState extends TabState {

  tabName: string = `Model Viewer`;

  model: KotOR.OdysseyModel3D;
  odysseyModel: KotOR.OdysseyModel;
  
  mdl: Uint8Array;
  mdx: Uint8Array;

  ui3DRenderer: UI3DRenderer;

  selectedNode: KotOR.OdysseyObject3D | undefined;
  selectedModelNode: KotOR.OdysseyModelNode | undefined;

  selectedAnimationIndex: number = -1;
  animations: KotOR.OdysseyModelAnimation[] = [];
  currentAnimation: KotOR.OdysseyModelAnimation;

  timelineOffset: number = 200;
  timelineZoom: number = 250;
  seeking: boolean = false;
  playing: boolean = false;
  looping: boolean = false;
  min_timeline_zoom: any = 50;
  max_timeline_zoom: any = 1000;

  dragging_frame: any;
  selected_frame: any;
  controlMode: TabModelViewerControlMode = TabModelViewerControlMode.SELECT;
  keyframeEditorEnabled: boolean = false;
  trackFilterScope: ModelViewerTrackFilterScope = 'all';
  selectedTrack: ModelViewerEditableTrack | undefined;
  selectedKey: ModelViewerEditableKeySelection | undefined;
  followCameraHook: boolean = false;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;

  //layout
  layout_group: THREE.Group = new THREE.Group();
  selectedLayoutIndex: number = -1;
  layoutSceneGraphNode: SceneGraphNode;
  layout: KotOR.LYTObject;
  currentAnimationState: any = {
    elapsed: 0
  };
  scrubbing: boolean = false;
  scrubbingTimeout: NodeJS.Timeout;
  paused: boolean = false;
  private transformControlsBound: boolean = false;
  private transformControlsChangeHandler = this.onTransformControlsChange.bind(this);
  private transformControlsMouseDownHandler = this.onTransformControlsMouseDown.bind(this);
  private allowNonSelectModeSelection: boolean = false;

  /** When OdysseyModel3D.rebuildFromSourceModel swaps instances, rebind viewer state and Forge registry. */
  private readonly onOdysseyInstanceReplaced = (event: THREE.Event): void => {
    const next = (event as THREE.Event & { next?: KotOR.OdysseyModel3D; previous?: KotOR.OdysseyModel3D }).next;
    const prev = (event as THREE.Event & { next?: KotOR.OdysseyModel3D; previous?: KotOR.OdysseyModel3D }).previous;
    if (!next) return;
    if (prev) {
      prev.removeEventListener('odysseyInstanceReplaced', this.onOdysseyInstanceReplaced as any);
    }
    this.model = next;
    next.addEventListener('odysseyInstanceReplaced', this.onOdysseyInstanceReplaced as any);
    this.ui3DRenderer.replaceOdysseyModelInRegistry(prev ?? (event.target as KotOR.OdysseyModel3D), next);

    this.animations = this.model.odysseyAnimations.slice(0).sort((a, b) => a.name.localeCompare(b.name));
    if (this.animations.length) {
      this.selectedAnimationIndex = Math.min(this.selectedAnimationIndex, this.animations.length - 1);
      this.currentAnimation = this.animations[this.selectedAnimationIndex];
      this.model.animationManager.currentAnimation = this.currentAnimation;
      this.model.animationManager.currentAnimationState = this.currentAnimationState;
    }

    next.emitters.map((emitter) => {
      emitter.referenceNode = this.ui3DRenderer.referenceNode as any;
    });

    this.ui3DRenderer.sceneGraphManager.rebuild();
    TabModelViewerState.applyModelViewerLayers(this.model, this.modelViewerLayerVisibility, {
      layoutGroup: this.layout_group,
      groundMesh: this.groundMesh,
      lightHelpers: this.ui3DRenderer.group.light_helpers,
    });
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  };

  modelViewerLayerVisibility: ModelViewerLayerVisibility = { ...DEFAULT_MODEL_VIEWER_LAYER_VISIBILITY };

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    // Geometry
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );
    // this.unselectable.add( this.groundMesh );
    
    this.ui3DRenderer = new UI3DRenderer();
    this.bindTransformControlsEvents();
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', () => this.bindTransformControlsEvents());
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', (object: THREE.Object3D | undefined) => {
      if (this.controlMode !== TabModelViewerControlMode.SELECT && !this.allowNonSelectModeSelection) {
        return;
      }
      const odysseyNode = TabModelViewerState.findOdysseyObject3D(object);
      this.applySelectedOdysseyNode(odysseyNode);
    });
    this.ui3DRenderer.scene.add(this.groundMesh);
    this.ui3DRenderer.scene.add(this.layout_group);

    this.layoutSceneGraphNode = new SceneGraphNode({
      name: 'Layout'
    });

    this.ui3DRenderer.sceneGraphManager.sceneNode.addChildNode(this.layoutSceneGraphNode);

    this.setContentView(<TabModelViewer tab={this}></TabModelViewer>);
    this.openFile();
  }

  protected captureUndoState(): ModelViewerUndoSnapshot | undefined {
    if (!this.animations?.length) return undefined;
    return {
      selectedAnimationIndex: this.selectedAnimationIndex,
      currentElapsed: this.getCurrentAnimationElapsed(),
      selectedTrackId: this.selectedTrack?.id,
      selectedKeyIndex: this.selectedKey?.keyIndex,
      animations: this.animations.map((animation) => ({
        name: animation.name,
        nodes: animation.nodes.map((node) => ({
          name: node.name,
          controllers: [...node.controllers.entries()].map(([type, controller]) => ({
            type,
            nodeType: node.nodeType,
            columnCount: (controller as any).columnCount ?? (type === KotOR.OdysseyModelControllerType.Orientation ? 4 : 3),
            frames: controller.data.map((frame) => ({
              time: frame.time ?? 0,
              x: frame.x ?? 0,
              y: frame.y ?? 0,
              z: frame.z ?? 0,
              w: frame.w ?? 1,
              value: frame.value,
              isBezier: !!frame.isBezier,
              isLinearBezier: !!frame.isLinearBezier,
              lastFrame: !!frame.lastFrame,
            })),
          })),
        })),
      })),
    };
  }

  protected applyUndoState(snapshot: ModelViewerUndoSnapshot): void {
    if (!snapshot?.animations?.length || !this.animations?.length) return;
    for (let a = 0; a < snapshot.animations.length; a++) {
      const srcAnim = snapshot.animations[a];
      const dstAnim = this.animations.find((anim) => anim.name === srcAnim.name) ?? this.animations[a];
      if (!dstAnim) continue;
      for (let n = 0; n < srcAnim.nodes.length; n++) {
        const srcNode = srcAnim.nodes[n];
        const dstNode = dstAnim.nodes.find((node) => node.name.toLowerCase().trim() === srcNode.name.toLowerCase().trim());
        if (!dstNode) continue;
        const nextControllers = new Map<number, KotOR.OdysseyController>();
        for (let c = 0; c < srcNode.controllers.length; c++) {
          const srcController = srcNode.controllers[c];
          const controller = new KotOR.OdysseyController({
            type: srcController.type,
            nodeType: srcController.nodeType,
            frameCount: srcController.frames.length,
            timeKeyIndex: 0,
            dataValueIndex: 0,
            columnCount: srcController.columnCount,
            data: srcController.frames.map((frame) => ({
              time: frame.time,
              x: frame.x,
              y: frame.y,
              z: frame.z,
              w: frame.w,
              value: frame.value,
              isBezier: frame.isBezier,
              isLinearBezier: frame.isLinearBezier,
              lastFrame: frame.lastFrame,
              a: new THREE.Vector3(),
              b: new THREE.Vector3(),
              c: new THREE.Vector3(),
            } as KotOR.IOdysseyControllerFrameGeneric)),
          });
          nextControllers.set(srcController.type, controller);
        }
        dstNode.controllers = nextControllers;
      }
    }

    this.selectedAnimationIndex = Math.max(0, Math.min(snapshot.selectedAnimationIndex, this.animations.length - 1));
    this.currentAnimation = this.animations[this.selectedAnimationIndex];
    this.currentAnimationState.elapsed = snapshot.currentElapsed ?? 0;
    this.seek(this.currentAnimationState.elapsed);

    this.selectedTrack = undefined;
    this.selectedKey = undefined;
    if (snapshot.selectedTrackId && typeof snapshot.selectedKeyIndex === 'number') {
      this.selectKey(snapshot.selectedTrackId, snapshot.selectedKeyIndex);
    }

    if (this.file) this.file.unsaved_changes = true;
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onAnimationChange', [this]);
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFramesChange');
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.OdysseyModel3D>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.mdl = response.buffer;
          this.mdx = (response.buffer2 as Buffer) ?? new Uint8Array(0);
          const head = new TextDecoder("utf-8", { fatal: false }).decode(
            this.mdl.subarray(0, Math.min(512, this.mdl.length)),
          );
          const asciiMdl = /\b(beginmodelgeom|newmodel|# MODEL ASCII)\b/i.test(head);
          if (asciiMdl) {
            this.odysseyModel = KotOR.parseOdysseyModelAscii(new TextDecoder("utf-8").decode(this.mdl));
          } else {
            this.odysseyModel = new KotOR.OdysseyModel(
              new BinaryReader(response.buffer),
              new BinaryReader((response.buffer2 as Buffer) ?? new Uint8Array(0)),
            );
          }
          KotOR.OdysseyModel3D.FromMDL(this.odysseyModel, {
            // manageLighting: false,
            context: this.ui3DRenderer,
            editorMode: true, 
            onComplete: (model: KotOR.OdysseyModel3D) => {
              this.model = model;
              model.addEventListener('odysseyInstanceReplaced', this.onOdysseyInstanceReplaced as any);
              this.ui3DRenderer.attachObject(this.model, true);

              this.animations = this.model.odysseyAnimations.slice(0).sort( (a, b) => {
                return a.name.localeCompare(b.name);
              });

              this.selectedAnimationIndex = 0;
              this.currentAnimation = this.animations[this.selectedAnimationIndex];
              this.paused = true;

              model.emitters.map( (emitter) => {
                emitter.referenceNode = this.ui3DRenderer.referenceNode as any;
              })

              if(model.camerahook){
                const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
                camera.name = model.name;
                model.camerahook.add(camera);
                this.ui3DRenderer.attachCamera(camera);
              }
              this.ui3DRenderer.sceneGraphManager.rebuild();

              TabModelViewerState.applyModelViewerLayers(this.model, this.modelViewerLayerVisibility, {
                layoutGroup: this.layout_group,
                groundMesh: this.groundMesh,
                lightHelpers: this.ui3DRenderer.group.light_helpers,
              });

              // this.updateCameraFocus();
              this.processEventListener('onEditorFileLoad', [this]);
              this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
              resolve(this.model);
            }
          });
        });
      }
    });
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

  animate(delta: number = 0){
    if(this.model){
      if(this.currentAnimation != this.model.animationManager.currentAnimation){
        this.model.animationManager.currentAnimation = this.currentAnimation;
        this.model.animationManager.currentAnimationState = this.currentAnimationState;
      }
      const cachedAnimationState = this.model.animationManager.currentAnimationState;
      if(!this.paused){
        const elapsed = this.currentAnimationState.elapsed;
        this.model.update(delta);
        let cElapsed = this.model.animationManager.currentAnimationState.elapsed;
        if(isNaN(cElapsed)) cElapsed = elapsed;
        if(cElapsed < elapsed && !this.looping) cElapsed = elapsed;
      }else{
        const elapsed = this.model.animationManager.currentAnimationState.elapsed;
        this.model.update(delta);
        if(!isNaN(elapsed)){
          this.model.animationManager.currentAnimationState.elapsed = elapsed;
        }
      }
      if(!this.model.animationManager.currentAnimationState){
        this.model.animationManager.currentAnimationState = cachedAnimationState;
      }
      this.currentAnimationState = this.model.animationManager.currentAnimationState;

      if (this.keyframeEditorEnabled && this.followCameraHook && this.ui3DRenderer.cameras.length) {
        const hookCam = this.ui3DRenderer.cameras[0];
        if (hookCam && this.ui3DRenderer.currentCamera !== hookCam) {
          this.setCamera(hookCam);
        }
      }
    }
    this.processEventListener('onAnimate', [delta]);
  }

  

  keyframeTrackZoomIn(){
    this.timelineZoom += 25;

    if(this.timelineZoom > this.max_timeline_zoom){
      this.timelineZoom = this.max_timeline_zoom;
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameTrackZoomIn', [this]);
  }

  keyframeTrackZoomOut(){
    this.timelineZoom -= 25;

    if(this.timelineZoom < this.min_timeline_zoom){
      this.timelineZoom = this.min_timeline_zoom;
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameTrackZoomOut', [this]);
  }

  setAnimationByIndex(index: number = 0){
    this.selectedAnimationIndex = index;
    const animation = this.animations[index];
    if(animation){
      this.model.playAnimation(animation, this.looping);
      this.currentAnimation = animation;
    }else{
      this.selectedAnimationIndex = 0;
      this.currentAnimation = this.animations[0];
    }
    this.selectedTrack = undefined;
    this.selectedKey = undefined;
    this.dragging_frame = undefined;
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onAnimationChange', [this]);
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  getCurrentAnimationLength(){
    if(!this.currentAnimation) return 0;
    return this.currentAnimation.length;
  }

  getCurrentAnimationElapsed(){
    if(!this.currentAnimationState) return 0;
    return this.currentAnimationState.elapsed;
  }

  playAnimation(){
    // if(!this.currentAnimation){
    //   this.pause();
    //   return;
    // }
    // if(this.currentAnimation != this.model.animationManager.currentAnimation){
    //   this.model.playAnimation(this.currentAnimation, this.looping);
    // }else{
    //   this.stopAnimation();
    // }
    // this.play();
  }

  stopAnimation(){
    this.model.stopAnimation();
    this.pause();
  }

  play(){
    if(!this.currentAnimation) return;

    this.paused = false;
    if(this.currentAnimation != this.model.animationManager.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
    }
    this.processEventListener('onPlay');
  }

  pause(){
    this.paused = true;
    this.processEventListener('onPause');
  }

  stop(){
    this.paused = true;
    this.stopAnimation();
  }

  seek(time: number = 0){
    if(this.currentAnimation && this.currentAnimationState){
      if(time < 0) time = 0;
      if(time > this.currentAnimation.length) time = this.currentAnimation.length;
      this.currentAnimationState.elapsed = time;
    }
  }

  setLooping(loop: boolean = false){
    this.looping = loop;
    if(this.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
    }
    this.processEventListener('onLoopChange', [this.looping]);
  }

  destroy(): void {
    if (this.model) {
      this.model.removeEventListener('odysseyInstanceReplaced', this.onOdysseyInstanceReplaced as any);
    }
    if (this.transformControlsBound && this.ui3DRenderer.transformControls) {
      this.ui3DRenderer.transformControls.removeEventListener('change', this.transformControlsChangeHandler);
      this.ui3DRenderer.transformControls.removeEventListener('mouseDown', this.transformControlsMouseDownHandler);
      this.transformControlsBound = false;
    }
    this.ui3DRenderer.destroy();
    this.disposeLayout();
    super.destroy();
  }

  loadLayout(key?: KotOR.IKEYEntry){
    this.disposeLayout();
    if(key) {
      // this.layoutSceneGraphNode
      return new Promise<void>( async (resolve, reject) => {
        const data = await KotOR.KEYManager.Key.getFileBuffer(key);
        // this.tab.tabLoader.SetMessage(`Loading: Layout...`);
        // this.tab.tabLoader.Show();
        const lyt = new KotOR.LYTObject(data);
        this.layout = lyt;
        for(let i = 0, len = this.layout.rooms.length; i < len; i++){
          const room = this.layout.rooms[i];
          // this.tabLoader.SetMessage(`Loading: ${room.name}`);
          const mdl = await KotOR.MDLLoader.loader.load(room.name);
          if(mdl){
            const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
              // manageLighting: false,
              context: this.ui3DRenderer,
              editorMode: true,
              mergeStatic: false,
            });
            if(model){
              model.position.copy( room.position )
              this.layout_group.add(model);
            }
          }
          this.layoutSceneGraphNode.addChildNode(
            new SceneGraphNode({
              name: room.name,
            })
          )
        }
        this.ui3DRenderer.sceneGraphManager.rebuild();
        KotOR.TextureLoader.LoadQueue().then(() => {
          if(this.ui3DRenderer.renderer)
            this.ui3DRenderer.renderer.compile(this.ui3DRenderer.scene, this.ui3DRenderer.currentCamera);
          // this.tab.tabLoader.Hide();
          resolve();
        }, (texObj: KotOR.ITextureLoaderQueuedRef) => {
          if(texObj.material){
            if(texObj.material instanceof THREE.ShaderMaterial){
              if(texObj.material.uniforms.map.value){
                // this.tabLoader.SetMessage(`Initializing Texture: ${texObj.name}`);
                console.log('iniTexture', texObj.name);

                if(this.ui3DRenderer.renderer)
                  this.ui3DRenderer.renderer.initTexture(texObj.material.uniforms.map.value);
              }
            }
          }
        });
      });
    }
  }

  

  disposeLayout(){
    this.layoutSceneGraphNode.setNodes([]);
    this.ui3DRenderer.sceneGraphManager.rebuild();
    try{
      if(this.layout_group.children.length){
        let modelIndex = this.layout_group.children.length - 1;
        while(modelIndex >= 0){
          const model = this.layout_group.children[modelIndex] as KotOR.OdysseyModel3D;
          if(model){
            model.dispose();
            this.layout_group.remove(model);
          }
          modelIndex--;
        }
      }
      // this.modelViewSideBarComponent.buildNodeTree();
    }catch(e){
      console.error(e);
    }
    // this.layout = undefined;
  }

  setRandomReferencePosition(spread: number = 1){
    this.ui3DRenderer.referenceNode.position.set(
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread
    );
  }

  getAvailableCameras(): { name: string; camera: THREE.PerspectiveCamera; isMain: boolean }[] {
    const result: { name: string; camera: THREE.PerspectiveCamera; isMain: boolean }[] = [];
    result.push({ name: 'Main', camera: this.ui3DRenderer.camera, isMain: true });
    for (const cam of this.ui3DRenderer.cameras) {
      result.push({ name: cam.name || 'Camera Hook', camera: cam, isMain: false });
    }
    return result;
  }

  setCamera(camera: THREE.PerspectiveCamera) {
    const isMain = camera === this.ui3DRenderer.camera;
    this.ui3DRenderer.currentCamera = camera;

    if (this.ui3DRenderer.orbitControls) {
      this.ui3DRenderer.orbitControls.enabled = isMain;
    }

    camera.aspect = this.ui3DRenderer.width / this.ui3DRenderer.height;
    camera.updateProjectionMatrix();

    this.processEventListener<TabModelViewerStateEventListenerTypes>('onCameraChange', [camera]);
  }

  setCameraFov(camera: THREE.PerspectiveCamera, fov: number) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onCameraChange', [camera]);
  }

  setControlMode(mode: TabModelViewerControlMode): void {
    if (this.controlMode === mode) return;
    this.controlMode = mode;
    if (this.ui3DRenderer.transformControls) {
      if (mode === TabModelViewerControlMode.TRANSLATE) {
        this.ui3DRenderer.transformControls.mode = 'translate';
      } else if (mode === TabModelViewerControlMode.ROTATE) {
        this.ui3DRenderer.transformControls.mode = 'rotate';
      }
    }
    this.ui3DRenderer.disableSelection = this.controlMode !== TabModelViewerControlMode.SELECT;
    this.syncTransformControlAttachment();
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onControlModeChange', [mode]);
  }

  private applySelectedOdysseyNode(odysseyNode: KotOR.OdysseyObject3D | undefined): void {
    if (odysseyNode) {
      this.selectedNode = odysseyNode;
      this.selectedModelNode = odysseyNode.odysseyModelNode;
    } else {
      this.selectedNode = undefined;
      this.selectedModelNode = undefined;
    }
    this.syncTransformControlAttachment();
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onNodeSelect', [this.selectedNode, this.selectedModelNode]);
  }

  private findSceneNodeByName(nodeName: string): KotOR.OdysseyObject3D | undefined {
    if (!this.model || !nodeName) return undefined;
    const normalized = nodeName.toLowerCase().trim();
    const roots: KotOR.OdysseyModel3D[] = [this.model, ...this.model.childModels];
    for (let i = 0; i < roots.length; i++) {
      const node = roots[i].nodes.get(normalized);
      if (node) return node;
    }
    return undefined;
  }

  private bindTransformControlsEvents(): void {
    const controls = this.ui3DRenderer.transformControls;
    if (!controls || this.transformControlsBound) return;
    controls.addEventListener('change', this.transformControlsChangeHandler);
    controls.addEventListener('mouseDown', this.transformControlsMouseDownHandler);
    this.transformControlsBound = true;
  }

  private onTransformControlsMouseDown(): void {
    this.captureUndoSnapshot();
  }

  private syncTransformControlAttachment(): void {
    const controls = this.ui3DRenderer.transformControls;
    if (!controls) return;
    if (!this.selectedNode || this.controlMode === TabModelViewerControlMode.SELECT) {
      controls.detach();
      (controls as any).visible = false;
      return;
    }
    (controls as any).visible = true;
    controls.attach(this.selectedNode);
  }

  private onTransformControlsChange(): void {
    // TransformControls emits change events on hover/axis highlight; only write keys during active drags.
    if (!this.ui3DRenderer.transformControlsDragging) return;
    if (!this.selectedNode || !this.selectedModelNode || !this.currentAnimation) return;
    if (this.controlMode !== TabModelViewerControlMode.TRANSLATE && this.controlMode !== TabModelViewerControlMode.ROTATE) return;

    const nodeName = this.selectedModelNode.name;
    if (!nodeName) return;

    if (this.controlMode === TabModelViewerControlMode.TRANSLATE) {
      this.upsertNodeControllerKeyAtCurrentTime(nodeName, KotOR.OdysseyModelControllerType.Position, {
        x: this.selectedNode.position.x,
        y: this.selectedNode.position.y,
        z: this.selectedNode.position.z,
      });
      return;
    }

    if (this.controlMode === TabModelViewerControlMode.ROTATE) {
      this.upsertNodeControllerKeyAtCurrentTime(nodeName, KotOR.OdysseyModelControllerType.Orientation, {
        x: this.selectedNode.quaternion.x,
        y: this.selectedNode.quaternion.y,
        z: this.selectedNode.quaternion.z,
        w: this.selectedNode.quaternion.w,
      });
    }
  }

  private upsertNodeControllerKeyAtCurrentTime(
    nodeName: string,
    controllerType: number,
    patch: Partial<KotOR.IOdysseyControllerFrameGeneric>,
  ): void {
    const track = this.ensureTrackForNodeController(nodeName, controllerType);
    if (!track) return;
    const trackId = track.id;
    const t = this.getCurrentAnimationElapsed();
    const epsilon = 1 / 120;
    const keyIndex = track.keys.findIndex((k) => Math.abs((k.time ?? 0) - t) <= epsilon);
    if (keyIndex >= 0) {
      this.updateKey(trackId, keyIndex, patch, { captureUndo: false });
      return;
    }
    this.addKeyAtCurrentTime(trackId, { captureUndo: false });
    const selectedIndex = this.selectedKey?.trackId === trackId ? this.selectedKey.keyIndex : -1;
    if (selectedIndex >= 0) {
      this.updateKey(trackId, selectedIndex, patch, { captureUndo: false });
    }
  }

  private ensureTrackForNodeController(nodeName: string, controllerType: number): ModelViewerEditableTrack | undefined {
    const trackId = TabModelViewerState.getTrackId(nodeName, controllerType);
    let track = this.getTrackById(trackId, false);
    if (track) return track;
    if (!this.currentAnimation) return undefined;

    const normalized = nodeName.toLowerCase().trim();
    const animNode = this.currentAnimation.nodes.find((n) => n.name.toLowerCase().trim() === normalized);
    if (!animNode) return undefined;

    const newController = new KotOR.OdysseyController({
      type: controllerType,
      nodeType: animNode.nodeType,
      frameCount: 0,
      timeKeyIndex: 0,
      dataValueIndex: 0,
      columnCount: controllerType === KotOR.OdysseyModelControllerType.Orientation ? 4 : 3,
      data: [],
    });
    animNode.controllers.set(controllerType, newController);
    if (this.odysseyModel) {
      const sourceNode = this.odysseyModel.nodes.get(normalized);
      if (sourceNode) {
        this.odysseyModel.markControllerKeyframesChanged(sourceNode.uuid, this.currentAnimation?.name);
      }
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFramesChange');
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
    track = this.getTrackById(trackId, false);
    return track;
  }

  setKeyframeEditorEnabled(enabled: boolean): void {
    if (this.keyframeEditorEnabled === enabled) return;
    this.keyframeEditorEnabled = enabled;
    if (!enabled) {
      this.selectedTrack = undefined;
      this.selectedKey = undefined;
      this.dragging_frame = undefined;
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  setTrackFilterScope(scope: ModelViewerTrackFilterScope): void {
    if (this.trackFilterScope === scope) return;
    this.trackFilterScope = scope;
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  setFollowCameraHook(enabled: boolean): void {
    if (this.followCameraHook === enabled) return;
    this.followCameraHook = enabled;
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  private static getTrackId(nodeName: string, controllerType: number): string {
    return `${nodeName.toLowerCase().trim()}::${controllerType}`;
  }

  private static isCameraHookNodeName(name: string): boolean {
    const n = name.toLowerCase().trim();
    return n === 'camerahook' || n.endsWith('camerahook');
  }

  private buildEditableTracks(respectFilter: boolean): ModelViewerEditableTrack[] {
    if (!this.currentAnimation) return [];
    const tracks: ModelViewerEditableTrack[] = [];
    const selectedNodeName = this.selectedModelNode?.name?.toLowerCase().trim();
    for (let i = 0; i < this.currentAnimation.nodes.length; i++) {
      const node = this.currentAnimation.nodes[i];
      const isCameraHook = TabModelViewerState.isCameraHookNodeName(node.name);
      if (respectFilter && this.trackFilterScope === 'selectedNode' && selectedNodeName && node.name.toLowerCase().trim() !== selectedNodeName) {
        continue;
      }
      if (respectFilter && this.trackFilterScope === 'cameraHook' && !isCameraHook) {
        continue;
      }
      for (const [controllerType, controller] of node.controllers.entries()) {
        if (!(controller instanceof KotOR.OdysseyController)) continue;
        tracks.push({
          id: TabModelViewerState.getTrackId(node.name, controllerType),
          nodeName: node.name,
          nodeType: node.nodeType,
          controllerType,
          label: `${node.name} / ${KotOR.OdysseyModelControllerType[controllerType] ?? controllerType}`,
          isCameraHook,
          controller,
          keys: controller.data,
        });
      }
    }
    return tracks;
  }

  getEditableTracks(): ModelViewerEditableTrack[] {
    return this.buildEditableTracks(true);
  }

  private getTrackById(trackId: string, respectFilter: boolean = true): ModelViewerEditableTrack | undefined {
    return this.buildEditableTracks(respectFilter).find((t) => t.id === trackId);
  }

  getCameraHookTrackIds(): string[] {
    return this.getEditableTracks().filter((t) => t.isCameraHook).map((t) => t.id);
  }

  selectCameraHookByNodeName(name: string): void {
    if (!this.currentAnimation) return;
    const n = name.toLowerCase().trim();
    const node = this.currentAnimation.nodes.find((entry) => entry.name.toLowerCase().trim() === n);
    if (!node) return;
    this.selectedModelNode = node;
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onNodeSelect', [this.selectedNode, this.selectedModelNode]);
    if (this.trackFilterScope === 'selectedNode') {
      this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
    }
  }

  selectTrack(trackId: string | undefined): void {
    this.selectedTrack = this.getTrackById(trackId || '', true);
    if (!this.selectedTrack) {
      this.selectedKey = undefined;
    } else if (this.selectedKey && this.selectedKey.trackId !== this.selectedTrack.id) {
      this.selectedKey = undefined;
    }
    if (this.selectedTrack) {
      const sceneNode = this.findSceneNodeByName(this.selectedTrack.nodeName);
      if (sceneNode) {
        this.allowNonSelectModeSelection = true;
        this.applySelectedOdysseyNode(sceneNode);
        this.allowNonSelectModeSelection = false;
      }
      if (this.selectedTrack.controllerType === KotOR.OdysseyModelControllerType.Position) {
        this.setControlMode(TabModelViewerControlMode.TRANSLATE);
      } else if (this.selectedTrack.controllerType === KotOR.OdysseyModelControllerType.Orientation) {
        this.setControlMode(TabModelViewerControlMode.ROTATE);
      }
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onTrackSelectionChange', [this.selectedTrack]);
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  selectKey(trackId: string, keyIndex: number): void {
    const track = this.getTrackById(trackId, false);
    if (!track) return;
    if (keyIndex < 0 || keyIndex >= track.keys.length) return;
    this.selectedTrack = track;
    this.selectedKey = { trackId, keyIndex };
    this.selected_frame = track.keys[keyIndex];
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameSelect', [this.selected_frame]);
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeySelectionChange', [this.selectedKey, this.selectedTrack]);
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  addKeyAtCurrentTime(trackId: string, options: { captureUndo?: boolean } = {}): void {
    if (options.captureUndo !== false) this.captureUndoSnapshot();
    const track = this.getTrackById(trackId, false);
    if (!track) return;
    const time = this.getCurrentAnimationElapsed();
    const copyFrom = track.keys.length ? track.keys[Math.max(0, track.keys.length - 1)] : undefined;
    const frame: KotOR.IOdysseyControllerFrameGeneric = {
      ...(copyFrom ? { ...copyFrom } : {}),
      time,
      x: copyFrom?.x ?? 0,
      y: copyFrom?.y ?? 0,
      z: copyFrom?.z ?? 0,
      w: copyFrom?.w ?? 1,
      value: copyFrom?.value ?? 0,
      a: copyFrom?.a ?? new THREE.Vector3(),
      b: copyFrom?.b ?? new THREE.Vector3(),
      c: copyFrom?.c ?? new THREE.Vector3(),
      isBezier: copyFrom?.isBezier ?? false,
      isLinearBezier: copyFrom?.isLinearBezier ?? false,
      bezier: copyFrom?.bezier as any,
      lastFrame: false,
    };
    track.controller.data.push(frame);
    track.controller.data.sort((a, b) => a.time - b.time);
    const newIndex = track.controller.data.indexOf(frame);
    this.selectKey(trackId, newIndex);
    if (this.file) this.file.unsaved_changes = true;
    if (this.odysseyModel) {
      const sourceNode = this.odysseyModel.nodes.get(track.nodeName.toLowerCase().trim());
      if (sourceNode) {
        this.odysseyModel.markControllerKeyframesChanged(sourceNode.uuid, this.currentAnimation?.name);
      }
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFramesChange');
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  updateKey(trackId: string, keyIndex: number, patch: Partial<KotOR.IOdysseyControllerFrameGeneric>, options: { captureUndo?: boolean } = {}): void {
    if (options.captureUndo !== false) this.captureUndoSnapshot();
    const track = this.getTrackById(trackId, false);
    if (!track) return;
    const key = track.keys[keyIndex];
    if (!key) return;
    Object.assign(key, patch);
    if (typeof key.time === 'number') {
      key.time = Math.max(0, Math.min(this.getCurrentAnimationLength(), key.time));
    }
    track.controller.data.sort((a, b) => a.time - b.time);
    const newIndex = track.controller.data.indexOf(key);
    this.selectedKey = { trackId, keyIndex: newIndex };
    if (this.file) this.file.unsaved_changes = true;
    if (this.odysseyModel) {
      const sourceNode = this.odysseyModel.nodes.get(track.nodeName.toLowerCase().trim());
      if (sourceNode) {
        this.odysseyModel.markControllerKeyframesChanged(sourceNode.uuid, this.currentAnimation?.name);
      }
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFramesChange');
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  deleteKey(trackId: string, keyIndex: number, options: { captureUndo?: boolean } = {}): void {
    if (options.captureUndo !== false) this.captureUndoSnapshot();
    const track = this.getTrackById(trackId, false);
    if (!track) return;
    if (keyIndex < 0 || keyIndex >= track.keys.length) return;
    track.controller.data.splice(keyIndex, 1);
    if (this.selectedKey?.trackId === trackId) {
      if (track.controller.data.length) {
        this.selectedKey = { trackId, keyIndex: Math.max(0, keyIndex - 1) };
      } else {
        this.selectedKey = undefined;
      }
    }
    if (this.file) this.file.unsaved_changes = true;
    if (this.odysseyModel) {
      const sourceNode = this.odysseyModel.nodes.get(track.nodeName.toLowerCase().trim());
      if (sourceNode) {
        this.odysseyModel.markControllerKeyframesChanged(sourceNode.uuid, this.currentAnimation?.name);
      }
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFramesChange');
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyframeEditorChange', [this]);
  }

  static applyModelViewerLayers(
    model: KotOR.OdysseyModel3D | undefined,
    layers: ModelViewerLayerVisibility,
    sceneExtras?: { layoutGroup?: THREE.Group; groundMesh?: THREE.Object3D; lightHelpers?: THREE.Object3D },
  ): void {
    if (sceneExtras?.layoutGroup) {
      sceneExtras.layoutGroup.visible = layers.layout;
    }
    if (sceneExtras?.groundMesh) {
      sceneExtras.groundMesh.visible = layers.ground;
    }
    if (sceneExtras?.lightHelpers) {
      sceneExtras.lightHelpers.visible = layers.lights;
    }
    if (!model) return;

    for (let i = 0; i < model.childModels.length; i++) {
      model.childModels[i].visible = layers.childModels;
    }

    const roots: KotOR.OdysseyModel3D[] = [model, ...model.childModels];
    for (let r = 0; r < roots.length; r++) {
      const m = roots[r];
      const rootVisible = m === model || layers.childModels;
      if (!rootVisible) continue;

      for (let e = 0; e < m.emitters.length; e++) {
        m.emitters[e].visible = layers.emitters;
      }

      if (m.mergedMesh) {
        m.mergedMesh.visible = layers.trimesh;
      }
      if (m.mergedDanglyMesh) {
        m.mergedDanglyMesh.visible = layers.dangly;
      }
    }

    model.traverse((obj) => {
      if (obj instanceof KotOR.OdysseyEmitter3D) {
        obj.visible = layers.emitters;
        return;
      }
      if (obj instanceof KotOR.OdysseyLight3D || obj instanceof THREE.Light) {
        obj.visible = layers.lights;
        return;
      }
      if (obj instanceof KotOR.OdysseyObject3D && obj.odysseyModelNode) {
        const nt = obj.odysseyModelNode.nodeType;
        if ((nt & OdysseyModelNodeType.AABB) === OdysseyModelNodeType.AABB) {
          obj.visible = layers.walkmeshes;
        }
      }
      if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
        const odysseyNode = obj.userData?.odysseyModelNode as KotOR.OdysseyModelNode | undefined;
        if (!odysseyNode) return;
        const nt = odysseyNode.nodeType;
        if ((nt & OdysseyModelNodeType.AABB) === OdysseyModelNodeType.AABB) {
          obj.visible = layers.walkmeshes;
          return;
        }
        if ((nt & OdysseyModelNodeType.Saber) === OdysseyModelNodeType.Saber) {
          obj.visible = layers.saber;
          return;
        }
        if ((nt & OdysseyModelNodeType.Skin) === OdysseyModelNodeType.Skin) {
          obj.visible = layers.skin;
          return;
        }
        if ((nt & OdysseyModelNodeType.Dangly) === OdysseyModelNodeType.Dangly) {
          obj.visible = layers.dangly;
          return;
        }
        if ((nt & OdysseyModelNodeType.Mesh) === OdysseyModelNodeType.Mesh) {
          obj.visible = layers.trimesh;
        }
      }
    });
  }

  refreshModelViewerLayers(): void {
    TabModelViewerState.applyModelViewerLayers(this.model, this.modelViewerLayerVisibility, {
      layoutGroup: this.layout_group,
      groundMesh: this.groundMesh,
      lightHelpers: this.ui3DRenderer.group.light_helpers,
    });
    this.ui3DRenderer.render();
  }

  setLayerVisibility(key: ModelViewerLayerKey, visible: boolean): void {
    if (this.modelViewerLayerVisibility[key] === visible) return;
    this.modelViewerLayerVisibility[key] = visible;
    this.refreshModelViewerLayers();
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onModelViewerLayersChange', [this]);
  }

  toggleLayerVisibility(key: ModelViewerLayerKey): void {
    this.setLayerVisibility(key, !this.modelViewerLayerVisibility[key]);
  }

  /** Preview dangly wind for model viewer (0 / 1 / 2); ARE WindPower when not using Forge preview context. */
  setWindPower(power: 0 | 1 | 2): void {
    if (this.ui3DRenderer.windowPower === power) return;
    this.ui3DRenderer.windowPower = power;
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onModelViewerLayersChange', [this]);
  }

  static findOdysseyObject3D(object: THREE.Object3D | undefined): KotOR.OdysseyObject3D | undefined {
    let current: THREE.Object3D | null = object ?? null;
    while (current) {
      if (current instanceof KotOR.OdysseyObject3D && current.odysseyModelNode) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  async swapTexture(node: KotOR.OdysseyObject3D, newResRef: string): Promise<void> {
    if (!node) return;
    const mesh = (node as any).mesh as THREE.Mesh | undefined;
    const target = mesh || node;
    const material = (target as any).material as THREE.ShaderMaterial | undefined;
    if (!material || !material.uniforms) return;

    const texture = await KotOR.TextureLoader.Load(newResRef);
    if (texture) {
      material.uniforms.map.value = texture;
      material.uniformsNeedUpdate = true;
      if (material.userData) {
        material.userData.map = newResRef;
      }
    }
  }

  async extractModelAssets(): Promise<void> {
    if (!this.odysseyModel) return;

    const modelName = this.odysseyModel.geometryHeader.modelName?.toLowerCase().trim();
    if (!modelName) return;

    const target = await promptForDirectory(modelName);
    if (!target) return;

    const progress = createProgressModal();

    const visited = new Set<string>();
    const allModels = new Set<string>();
    const allTextures = new Set<string>();

    progress.setProgress(0, 0, `Collecting model assets: ${modelName}`);
    await collectModelAssets(modelName, visited, allModels, allTextures, this.mdl, this.mdx, this.odysseyModel);
    progress.setProgress(0, 0, 'Resolving TXI texture references...');
    await collectTxiReferencedTextures(allTextures);

    const primaryName = modelName;
    const mdl = this.mdl;
    const mdx = this.mdx;
    const overrideFetch = async (resref: string) => {
      if (resref === primaryName && mdl) {
        return { mdl, mdx: mdx && mdx.length ? mdx : new Uint8Array(0) };
      }
      return fetchModelBuffers(resref);
    };

    const { exportedFiles, skippedFiles, failedFiles } = await exportCollectedAssets(
      allModels, allTextures, target, overrideFetch,
      (cur, tot, msg) => progress.setProgress(cur, tot, msg),
    );

    showExtractionResults({
      modelName,
      modelCount: allModels.size,
      textureCount: allTextures.size,
      exportedFiles,
      skippedFiles,
      failedFiles,
    }, progress);
  }

  async exportOdysseyModelAscii(): Promise<void> {
    if (!this.odysseyModel) return;

    const baseName =
      (this.odysseyModel.geometryHeader.modelName || this.file?.getFilename() || "model")
        .replace(/\.(mdl\.ascii|mdl|mdx)$/i, "")
        .trim() || "model";
    const suggestedName = `${baseName}.mdl.ascii`;
    const text = KotOR.exportOdysseyModelAscii(this.odysseyModel);
    const payload = new TextEncoder().encode(text);

    if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
      const savePath = await dialog.showSaveDialog({
        title: "Export MDL as ASCII",
        defaultPath: suggestedName,
        properties: ["createDirectory"],
        filters: [{ name: "MDL ASCII", extensions: ["mdl.ascii", "mdl"] }],
      });
      if (!savePath?.canceled && typeof savePath?.filePath === "string") {
        await fs.promises.writeFile(savePath.filePath, payload);
      }
      return;
    }

    try {
      const newHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "MDL ASCII",
            accept: { "text/plain": [".mdl.ascii", ".mdl"] },
          },
        ],
      });
      const ws = await newHandle.createWritable();
      await ws.write(payload as BufferSource);
      await ws.close();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("exportOdysseyModelAscii", e);
    }
  }

}