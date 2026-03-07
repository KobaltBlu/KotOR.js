import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "./";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import React from "react";
import { TabModelViewer } from "../../components/tabs/tab-model-viewer/TabModelViewer";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import { EditorFile } from "../../EditorFile";
import { BinaryReader } from "../../../../utility/binary/BinaryReader";
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
  
  mdl: Uint8Array;
  mdx: Uint8Array;

  ui3DRenderer: UI3DRenderer;

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
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
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
            // manageLighting: false,
            context: this.ui3DRenderer,
            editorMode: true, 
            onComplete: (model: KotOR.OdysseyModel3D) => {
              this.model = model;
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

              // this.updateCameraFocus();
              this.processEventListener('onEditorFileLoad', [this]);
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
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onAnimationChange', [this]);
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
          let room = this.layout.rooms[i];
          // this.tabLoader.SetMessage(`Loading: ${room.name}`);
          let mdl = await KotOR.MDLLoader.loader.load(room.name);
          if(mdl){
            let model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
              // manageLighting: false,
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

  setRandomReferencePosition(spread: number = 1){
    this.ui3DRenderer.referenceNode.position.set(
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread
    );
  }

}