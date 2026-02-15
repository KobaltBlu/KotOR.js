import React from "react";
import * as THREE from 'three';

import { TabModelViewer } from "@/apps/forge/components/tabs/tab-model-viewer/TabModelViewer";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { SceneGraphNode } from "@/apps/forge/SceneGraphNode";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

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
  min_timeline_zoom: number = 50;
  max_timeline_zoom: number = 1000;

  dragging_frame: number | null = null;
  selected_frame: number | null = null;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;

  //layout
  layout_group: THREE.Group = new THREE.Group();
  selectedLayoutIndex: number = -1;
  layoutSceneGraphNode: SceneGraphNode;
  layout: KotOR.LYTObject;
  currentAnimationState: { elapsed: number } = {
    elapsed: 0
  };
  scrubbing: boolean = false;
  scrubbingTimeout: NodeJS.Timeout;
  paused: boolean = false;

  constructor(options: BaseTabStateOptions = {}){
    log.trace("TabModelViewerState constructor entry");
    super(options);
    this.isClosable = true;
    log.trace("TabModelViewerState constructor isClosable set");

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug("TabModelViewerState constructor tabName from file", this.tabName);
    } else {
      log.trace("TabModelViewerState constructor no file");
    }

    log.trace("TabModelViewerState constructor ground setup");
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );

    log.trace("TabModelViewerState constructor UI3DRenderer");
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.scene.add(this.groundMesh);
    this.ui3DRenderer.scene.add(this.layout_group);
    log.debug("TabModelViewerState constructor scene nodes added");

    this.layoutSceneGraphNode = new SceneGraphNode({
      name: 'Layout'
    });
    this.ui3DRenderer.sceneGraphManager.sceneNode.addChildNode(this.layoutSceneGraphNode);
    log.trace("TabModelViewerState constructor layout node added");

    this.setContentView(<TabModelViewer tab={this}></TabModelViewer>);
    log.trace("TabModelViewerState constructor setContentView done");
    this.openFile();
    log.trace("TabModelViewerState constructor exit");
  }

  public openFile(file?: EditorFile){
    log.trace("openFile entry", "file=%s", file?.getFilename?.() ?? String(file));
    return new Promise<KotOR.OdysseyModel3D>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
        log.trace("openFile using this.file");
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        log.debug("openFile tabName", this.tabName);

        log.trace("openFile readFile");
        file.readFile().then( (response) => {
          log.trace("openFile readFile resolved");
          this.mdl = response.buffer;
          this.mdx = response.buffer2 as Buffer;
          log.debug("openFile buffer lengths", this.mdl?.length, this.mdx?.length);
          this.odysseyModel = new KotOR.OdysseyModel(new BinaryReader(response.buffer), new BinaryReader(response.buffer2 as Buffer));
          log.trace("openFile OdysseyModel created, FromMDL");
          KotOR.OdysseyModel3D.FromMDL(this.odysseyModel, {
            context: this.ui3DRenderer,
            editorMode: true,
            onComplete: (model: KotOR.OdysseyModel3D) => {
              log.trace("openFile onComplete");
              this.model = model;
              this.ui3DRenderer.attachObject(this.model, true);
              log.trace("openFile attachObject done");

              this.animations = this.model.odysseyAnimations.slice(0).sort( (a, b) => {
                return a.name.localeCompare(b.name);
              });
              log.debug("openFile animations count", this.animations.length);

              this.selectedAnimationIndex = 0;
              this.currentAnimation = this.animations[this.selectedAnimationIndex];
              this.paused = true;
              log.trace("openFile animation state set");

              model.emitters.map( (emitter) => {
                emitter.referenceNode = this.ui3DRenderer.referenceNode as KotOR.OdysseyObject3D;
              });
              log.trace("openFile emitters reference set");

              if(model.camerahook){
                log.trace("openFile adding camera");
                const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
                camera.name = model.name;
                model.camerahook.add(camera);
                this.ui3DRenderer.attachCamera(camera);
              } else {
                log.trace("openFile no camerahook");
              }
              this.ui3DRenderer.sceneGraphManager.rebuild();
              log.trace("openFile sceneGraphManager rebuild");

              this.processEventListener('onEditorFileLoad', [this]);
              log.info("openFile model loaded", this.model?.name);
              resolve(this.model);
            }
          });
          log.trace("openFile FromMDL called");
        });
      } else {
        log.trace("openFile file not EditorFile");
      }
      log.trace("openFile promise body done");
    });
  }

  show(): void {
    log.trace("show entry");
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
    log.trace("show exit");
  }

  hide(): void {
    log.trace("hide entry");
    super.hide();
    this.ui3DRenderer.enabled = false;
    log.trace("hide exit");
  }

  animate(delta: number = 0){
    log.trace("animate", "delta=%s model=%s", delta, !!this.model);
    if(this.model){
      if(this.currentAnimation != this.model.animationManager.currentAnimation){
        log.trace("animate sync currentAnimation");
        this.model.animationManager.currentAnimation = this.currentAnimation;
        this.model.animationManager.currentAnimationState = this.currentAnimationState;
      }
      const cachedAnimationState = this.model.animationManager.currentAnimationState;
      if(!this.paused){
        log.trace("animate not paused update");
        const elapsed = this.currentAnimationState.elapsed;
        this.model.update(delta);
        let cElapsed = this.model.animationManager.currentAnimationState.elapsed;
        if(isNaN(cElapsed)) cElapsed = elapsed;
        if(cElapsed < elapsed && !this.looping) cElapsed = elapsed;
      } else {
        log.trace("animate paused update");
        const elapsed = this.model.animationManager.currentAnimationState.elapsed;
        this.model.update(delta);
        if(!isNaN(elapsed)){
          this.model.animationManager.currentAnimationState.elapsed = elapsed;
        }
      }
      if(!this.model.animationManager.currentAnimationState){
        log.trace("animate restore cached state");
        this.model.animationManager.currentAnimationState = cachedAnimationState;
      }
      this.currentAnimationState = this.model.animationManager.currentAnimationState;
    }
    this.processEventListener('onAnimate', [delta]);
    log.trace("animate onAnimate fired");
  }



  keyframeTrackZoomIn(){
    log.trace("keyframeTrackZoomIn entry", this.timelineZoom);
    this.timelineZoom += 25;
    if(this.timelineZoom > this.max_timeline_zoom){
      this.timelineZoom = this.max_timeline_zoom;
      log.trace("keyframeTrackZoomIn clamped to max");
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameTrackZoomIn', [this]);
    log.trace("keyframeTrackZoomIn exit", this.timelineZoom);
  }

  keyframeTrackZoomOut(){
    log.trace("keyframeTrackZoomOut entry", this.timelineZoom);
    this.timelineZoom -= 25;
    if(this.timelineZoom < this.min_timeline_zoom){
      this.timelineZoom = this.min_timeline_zoom;
      log.trace("keyframeTrackZoomOut clamped to min");
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameTrackZoomOut', [this]);
    log.trace("keyframeTrackZoomOut exit", this.timelineZoom);
  }

  setAnimationByIndex(index: number = 0){
    log.trace("setAnimationByIndex entry", index);
    this.selectedAnimationIndex = index;
    const animation = this.animations[index];
    if(animation){
      log.debug("setAnimationByIndex play", animation.name);
      this.model.playAnimation(animation, this.looping);
      this.currentAnimation = animation;
    } else {
      log.trace("setAnimationByIndex no animation at index, use 0");
      this.selectedAnimationIndex = 0;
      this.currentAnimation = this.animations[0];
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onAnimationChange', [this]);
    log.trace("setAnimationByIndex exit");
  }

  getCurrentAnimationLength(){
    log.trace("getCurrentAnimationLength");
    if(!this.currentAnimation) {
      log.trace("getCurrentAnimationLength no animation return 0");
      return 0;
    }
    log.trace("getCurrentAnimationLength", this.currentAnimation.length);
    return this.currentAnimation.length;
  }

  getCurrentAnimationElapsed(){
    log.trace("getCurrentAnimationElapsed");
    if(!this.currentAnimationState) {
      log.trace("getCurrentAnimationElapsed no state return 0");
      return 0;
    }
    log.trace("getCurrentAnimationElapsed", this.currentAnimationState.elapsed);
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
    log.trace("stopAnimation entry");
    this.model.stopAnimation();
    this.pause();
    log.trace("stopAnimation exit");
  }

  play(){
    log.trace("play entry");
    if(!this.currentAnimation) {
      log.trace("play no currentAnimation return");
      return;
    }
    this.paused = false;
    if(this.currentAnimation != this.model.animationManager.currentAnimation){
      log.debug("play playAnimation", this.currentAnimation.name);
      this.model.playAnimation(this.currentAnimation, this.looping);
    }
    this.processEventListener('onPlay');
    log.info("play started");
    log.trace("play exit");
  }

  pause(){
    log.trace("pause entry");
    this.paused = true;
    this.processEventListener('onPause');
    log.trace("pause exit");
  }

  stop(){
    log.trace("stop entry");
    this.paused = true;
    this.stopAnimation();
    log.trace("stop exit");
  }

  seek(time: number = 0){
    log.trace("seek entry", time);
    if(this.currentAnimation && this.currentAnimationState){
      if(time < 0) time = 0;
      if(time > this.currentAnimation.length) time = this.currentAnimation.length;
      this.currentAnimationState.elapsed = time;
      log.debug("seek set elapsed", time);
    } else {
      log.trace("seek no animation/state");
    }
    log.trace("seek exit");
  }

  setLooping(loop: boolean = false){
    log.trace("setLooping entry", loop);
    this.looping = loop;
    if(this.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
      log.trace("setLooping playAnimation updated");
    }
    this.processEventListener('onLoopChange', [this.looping]);
    log.trace("setLooping exit");
  }

  destroy(): void {
    log.trace("destroy entry");
    this.ui3DRenderer.destroy();
    log.trace("destroy ui3DRenderer destroyed");
    this.disposeLayout();
    super.destroy();
    log.trace("destroy exit");
  }

  loadLayout(key?: KotOR.IKEYEntry){
    log.trace("loadLayout entry", "key=%s", key?.resref ?? String(key));
    this.disposeLayout();
    if(key) {
      return new Promise<void>( async (resolve, reject) => {
        log.trace("loadLayout getFileBuffer");
        const data = await KotOR.KEYManager.Key.getFileBuffer(key);
        log.debug("loadLayout buffer length", data?.length);
        const lyt = new KotOR.LYTObject(data);
        this.layout = lyt;
        log.trace("loadLayout LYTObject created rooms=%s", this.layout.rooms?.length);
        for(let i = 0, len = this.layout.rooms.length; i < len; i++){
          const room = this.layout.rooms[i];
          log.trace("loadLayout room", i, room.name);
          const mdl = await KotOR.MDLLoader.loader.load(room.name);
          if(mdl){
            log.trace("loadLayout FromMDL room", room.name);
            const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
              context: this.ui3DRenderer,
              mergeStatic: false,
            });
            if(model){
              model.position.copy( room.position );
              this.layout_group.add(model);
              log.trace("loadLayout added model", room.name);
            }
          }
          this.layoutSceneGraphNode.addChildNode(
            new SceneGraphNode({
              name: room.name,
            })
          );
        }
        log.trace("loadLayout sceneGraphManager.rebuild");
        this.ui3DRenderer.sceneGraphManager.rebuild();
        KotOR.TextureLoader.LoadQueue().then(() => {
          log.trace("loadLayout LoadQueue then");
          if(this.ui3DRenderer.renderer)
            this.ui3DRenderer.renderer.compile(this.ui3DRenderer.scene, this.ui3DRenderer.currentCamera);
          log.info("loadLayout complete");
          resolve();
        }, (texObj: KotOR.ITextureLoaderQueuedRef) => {
          if(texObj.material){
            if(texObj.material instanceof THREE.ShaderMaterial){
              if(texObj.material.uniforms.map.value){
                log.trace('Initializing texture', texObj.name);
                if(this.ui3DRenderer.renderer)
                  this.ui3DRenderer.renderer.initTexture(texObj.material.uniforms.map.value);
              }
            }
          }
        });
        log.trace("loadLayout LoadQueue registered");
      });
    }
    log.trace("loadLayout no key exit");
  }



  disposeLayout(){
    log.trace("disposeLayout entry");
    this.layoutSceneGraphNode.setNodes([]);
    this.ui3DRenderer.sceneGraphManager.rebuild();
    log.trace("disposeLayout setNodes rebuild done");
    try{
      if(this.layout_group.children.length){
        log.debug("disposeLayout children count", this.layout_group.children.length);
        let modelIndex = this.layout_group.children.length - 1;
        while(modelIndex >= 0){
          const model = this.layout_group.children[modelIndex] as KotOR.OdysseyModel3D;
          if(model){
            model.dispose();
            this.layout_group.remove(model);
            log.trace("disposeLayout removed model", modelIndex);
          }
          modelIndex--;
        }
      } else {
        log.trace("disposeLayout no children");
      }
    }catch(e){
      log.error('Dispose layout error', e);
    }
    log.trace("disposeLayout exit");
  }

  setRandomReferencePosition(spread: number = 1){
    log.trace("setRandomReferencePosition", spread);
    this.ui3DRenderer.referenceNode.position.set(
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread
    );
    log.trace("setRandomReferencePosition done");
  }

}
