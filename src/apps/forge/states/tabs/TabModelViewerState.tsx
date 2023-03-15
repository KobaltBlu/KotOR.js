import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "./";
import * as KotOR from "../../KotOR";
import React from "react";
import { TabModelViewer } from "../../components/tabs/TabModelViewer";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { EditorFile } from "../../EditorFile";
import { BinaryReader } from "../../../../BinaryReader";
import { ModelViewerControls } from "../../ModelViewerControls";
import { SceneGraphNode } from "../../SceneGraphNode";
import { UI3DOverlayComponent } from "../../components/UI3DOverlayComponent";

export type TabModelViewerStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onModelLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|
  'onHeadLoad'|'onKeyFrameSelect'|'onKeyFrameTrackZoomIn'|'onKeyFrameTrackZoomOut'|
  'onAnimate'|'onKeyFramesChange'|'onDurationChange'|'onAnimationChange'|'onLoopChange';

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
}

export class TabModelViewerState extends TabState {

  tabName: string = `Model Viewer`;

  model: KotOR.OdysseyModel3D;
  odysseyModel: KotOR.OdysseyModel;
  
  mdl: Buffer;
  mdx: Buffer;

  ui3DRenderer: UI3DRenderer;

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

  //layout
  layout_group: KotOR.THREE.Group = new KotOR.THREE.Group();
  selectedLayoutIndex: number = -1;
  layoutSceneGraphNode: SceneGraphNode;
  layout: KotOR.LYTObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    // Geometry
    this.groundColor = new KotOR.THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new KotOR.THREE.WireframeGeometry(new KotOR.THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new KotOR.THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new KotOR.THREE.LineSegments( this.groundGeometry, this.groundMaterial );
    // this.unselectable.add( this.groundMesh );
    
    this.ui3DRenderer = new UI3DRenderer();
    // this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', (canvas: HTMLCanvasElement) => {
    //   this.controls.attachCanvasElement(canvas);
    // });
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.controlsEnabled = true;
    this.ui3DRenderer.scene.add(this.groundMesh);
    this.ui3DRenderer.scene.add(this.layout_group);

    this.layoutSceneGraphNode = new SceneGraphNode({
      name: 'Layout'
    });

    this.ui3DRenderer.sceneGraphManager.sceneNode.addChildNode(this.layoutSceneGraphNode);

    this.setContentView(<TabModelViewer tab={this}></TabModelViewer>);
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
  
        file.readFile().then( (response) => {
          this.mdl = response.buffer;
          this.mdx = response.buffer2 as Buffer;
          this.odysseyModel = new KotOR.OdysseyModel(new BinaryReader(response.buffer), new BinaryReader(response.buffer2 as Buffer));
          KotOR.OdysseyModel3D.FromMDL(this.odysseyModel, {
            manageLighting: false,
            context: this.ui3DRenderer,
            editorMode: true, 
            onComplete: (model: KotOR.OdysseyModel3D) => {
              this.model = model;
              this.processEventListener('onEditorFileLoad', [this]);
              this.ui3DRenderer.attachObject(this.model, true);

              if(model.camerahook){
                const camera = new KotOR.THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
                camera.name = model.name;
                model.camerahook.add(camera);
                this.ui3DRenderer.attachCamera(camera);
              }
              this.ui3DRenderer.sceneGraphManager.rebuild();

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
    this.processEventListener('onLoopChange', [this.looping]);
  }

  destroy(): void {
    this.ui3DRenderer.destroy();
    this.disposeLayout();
    super.destroy();
  }

  loadLayout(key?: KotOR.KEY){
    this.disposeLayout();
    if(key) {
      // this.layoutSceneGraphNode
      return new Promise<void>( async (resolve, reject) => {
        KotOR.KEYManager.Key.GetFileData(key, async (data: Buffer) => {
          // this.tab.tabLoader.SetMessage(`Loading: Layout...`);
          // this.tab.tabLoader.Show();
          const lyt = new KotOR.LYTObject(data);
          this.layout = lyt;
          for(let i = 0, len = this.layout.rooms.length; i < len; i++){
            let room = this.layout.rooms[i];
            // this.tabLoader.SetMessage(`Loading: ${room.name}`);
            let mdl = await KotOR.GameState.ModelLoader.load(room.name);
            if(mdl){
              let model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
                manageLighting: false,
                context: this.ui3DRenderer, 
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
          KotOR.TextureLoader.LoadQueue(() => {
            if(this.ui3DRenderer.renderer)
              this.ui3DRenderer.renderer.compile(this.ui3DRenderer.scene, this.ui3DRenderer.currentCamera);
            // this.tab.tabLoader.Hide();
            resolve();
          }, (texObj: KotOR.TextureLoaderQueuedRef) => {
            if(texObj.material){
              if(texObj.material instanceof KotOR.THREE.ShaderMaterial){
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
          let model = this.layout_group.children[modelIndex] as KotOR.OdysseyModel3D;
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

}