import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "./TabState";
import * as KotOR from "../../KotOR";
import React from "react";
import { TabModelViewer } from "../../components/tabs/TabModelViewer";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { EditorFile } from "../../EditorFile";
import { BinaryReader } from "../../../../BinaryReader";
import { ModelViewerControls } from "../../ModelViewerControls";

export type TabModelViewerStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onModelLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|
  'onHeadLoad'|'onKeyFrameSelect'|'onKeyFrameTrackZoomIn'|'onKeyFrameTrackZoomOut'|
  'onAnimate'|'onKeyFramesChange'|'onDurationChange'|'onAnimationChange';

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
}

export class TabModelViewerState extends TabState {

  protected eventListeners: TabModelViewerStateEventListeners = {
    onTabDestroyed: [],
    onTabRemoved: [],
    onTabShow: [],
    onTabHide: [],
    onTabNameChange: [],
    onEditorFileLoad: [],
    onEditorFileChange: [],
    onEditorFileSaved: [],
    onModelLoaded: [],
    onPlay: [],
    onPause: [],
    onStop: [],
    onAudioLoad: [],
    onHeadChange: [],
    onHeadLoad: [],
    onKeyFrameSelect: [],
    onKeyFrameTrackZoomIn: [],
    onKeyFrameTrackZoomOut: [],
    onAnimate: [],
    onKeyFramesChange: [],
    onDurationChange: [],
    onAnimationChange: [],
  };

  tabName: string = `Model Viewer`;

  model: KotOR.OdysseyModel3D;
  odysseyModel: KotOR.OdysseyModel;
  
  mdl: Buffer;
  mdx: Buffer;

  ui3DRenderer: UI3DRenderer;
  ui3DRendererView: JSX.Element;

  // controls: ModelViewerControls;

  selectedAnimationIndex: number = 0;
  currentAnimation: KotOR.OdysseyModelAnimation;

  timelineOffset: number = 200;
  timelineZoom: number = 250;
  seeking: boolean = false;
  playing: boolean = false;
  looping: boolean = false;
  min_timeline_zoom: any = 1000;
  max_timeline_zoom: any = 50;

  dragging_frame: any;
  selected_frame: any;
  groundColor: KotOR.THREE.Color;
  groundGeometry: KotOR.THREE.WireframeGeometry<KotOR.THREE.PlaneGeometry>;
  groundMaterial: KotOR.THREE.LineBasicMaterial;
  groundMesh: KotOR.THREE.LineSegments<KotOR.THREE.WireframeGeometry<KotOR.THREE.PlaneGeometry>, KotOR.THREE.LineBasicMaterial>;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    // Geometry
    this.groundColor = new KotOR.THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new KotOR.THREE.WireframeGeometry(new KotOR.THREE.PlaneGeometry( 25, 25, 25, 25 ));
    this.groundMaterial = new KotOR.THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new KotOR.THREE.LineSegments( this.groundGeometry, this.groundMaterial );
    // this.unselectable.add( this.groundMesh );
    
    this.ui3DRenderer = new UI3DRenderer();
    // this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', (canvas: HTMLCanvasElement) => {
    //   this.controls.attachCanvasElement(canvas);
    // });
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRendererView = (
      <UI3DRendererView context={this.ui3DRenderer}></UI3DRendererView>
    );
    this.ui3DRenderer.controlsEnabled = true;
    this.ui3DRenderer.scene.add(this.groundMesh);

    this.tabContentView = <TabModelViewer tab={this}></TabModelViewer>
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.OdysseyModel3D>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile( (buffer: Buffer, buffer2: Buffer) => {
          this.mdl = buffer;
          this.mdx = buffer2;
          this.odysseyModel = new KotOR.OdysseyModel(new BinaryReader(buffer), new BinaryReader(buffer2));
          KotOR.OdysseyModel3D.FromMDL(this.odysseyModel, {
            manageLighting: false,
            context: this.ui3DRenderer, 
            onComplete: (model: KotOR.OdysseyModel3D) => {
              this.model = model;
              this.processEventListener('onEditorFileLoad', [this]);
              this.ui3DRenderer.scene.add(this.model);
              // this.updateCameraFocus();
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
    // if(this.ui3DRenderer.canvas)
    //   this.controls.attachCanvasElement(this.ui3DRenderer.canvas);
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
    // this.controls.detachCanvasElement();
  }

  animate(delta: number = 0){
    // this.controls.update(delta);
    if(this.model){
      this.model.update(delta);
    }
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
    const animation = this.model.odysseyAnimations[index];
    if(animation){
      this.model.playAnimation(animation, this.looping);
      this.currentAnimation = animation;
    }else{
      this.selectedAnimationIndex = 0;
      this.currentAnimation = this.model.odysseyAnimations[0];
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onAnimationChange', [this]);
  }

  playAnimation(){
    if(this.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
    }else{
      this.stopAnimation();
    }
  }

  stopAnimation(){
    this.model.stopAnimation();
  }

  setLooping(loop: boolean = false){
    this.looping = loop;
    if(this.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
    }
  }

  destroy(): void {
    this.ui3DRenderer.destroy();
    super.destroy();
  }

}