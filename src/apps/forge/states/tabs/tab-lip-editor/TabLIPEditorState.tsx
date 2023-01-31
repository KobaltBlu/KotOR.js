import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "../TabState";
import BaseTabStateOptions from "../../../interfaces/BaseTabStateOptions";
import { TabLIPEditor } from "../../../components/tabs/tab-lip-editor/TabLIPEditor";
import { EditorFile } from "../../../EditorFile";
import type { LIPObject } from "../../../../../resource/LIPObject";
import type { OdysseyModel } from "../../../../../odyssey";
import type { OdysseyModel3D } from "../../../../../three/odyssey";
import { EditorTabManager } from "../../../managers/EditorTabManager";
import { UI3DRendererView } from "../../../components/UI3DRendererView";
import { UI3DRenderer } from "../../../UI3DRenderer";
import { ResourceTypes } from "../../../../../resource/ResourceTypes";
import { LIPKeyFrame } from "../../../../../interface/resource/LIPKeyFrame";
import { TabLIPEditorOptionsState } from "./TabLIPEditorOptionsState";
import { SceneGraphNode } from "../../../SceneGraphNode";
import { LIPShapeLabels } from "../../../data/LIPShapeLabels";

// import type * as KType from "../../../../../KotOR";

declare const KotOR: any;

export type TabLIPEditorStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onLIPLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|
  'onHeadLoad'|'onKeyFrameSelect'|'onKeyFrameTrackZoomIn'|'onKeyFrameTrackZoomOut'|
  'onAnimate'|'onKeyFramesChange';

export interface TabLIPEditorStateEventListeners extends TabStateEventListeners {
  onLIPLoaded: Function[],
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
}

export class TabLIPEditorState extends TabState {

  protected eventListeners: TabLIPEditorStateEventListeners = {
    onTabDestroyed: [],
    onTabRemoved: [],
    onTabShow: [],
    onTabHide: [],
    onTabNameChange: [],
    onEditorFileLoad: [],
    onEditorFileChange: [],
    onEditorFileSaved: [],
    onLIPLoaded: [],
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
  };

  tabName: string = `LIP Editor`;

  //Lip
  lip: LIPObject;

  //Audio
  gainNode: GainNode;
  source: AudioBufferSourceNode;
  preview_gain: number = 0.5;
  audio_buffer: AudioBuffer;
  
  utilitiesTabManager: EditorTabManager = new EditorTabManager();
  lipOptionsTab: TabLIPEditorOptionsState;

  animLoop: boolean;
  playing: boolean = false;
  seeking: boolean;
  current_head: string;
  audio_name: string;
  selected_frame: LIPKeyFrame;
  dragging_frame: LIPKeyFrame;
  poseFrame: boolean;
  max_timeline_zoom: number = 1000;
  min_timeline_zoom: number = 50;
  timeline_zoom: number = 250;

  head: OdysseyModel3D;
  head_hook: THREE.Object3D<THREE.Event> = new KotOR.THREE.Object3D();
  pointLight: THREE.PointLight;

  ui3DRenderer: UI3DRenderer;
  ui3DRendererView: JSX.Element;
  box3: THREE.Box3 = new KotOR.THREE.Box3();

  keyframesSceneGraphNode: SceneGraphNode = new SceneGraphNode({
    name: 'Key Frames',
    open: true,
  });

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }
    
    //Audio
    this.gainNode = KotOR.GameState.audioEngine.audioCtx.createGain();
    this.gainNode.gain.value = this.preview_gain;
    this.source = KotOR.GameState.audioEngine.audioCtx.createBufferSource();

    this.current_head = localStorage.getItem('lip_head') !== null ? localStorage.getItem('lip_head') as string : '';
    
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.scene.add(this.head_hook);
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
    this.ui3DRendererView = (
      <UI3DRendererView context={this.ui3DRenderer}></UI3DRendererView>
    )

    this.ui3DRenderer.sceneGraphManager.parentNodes.push(this.keyframesSceneGraphNode);

    this.lipOptionsTab = new TabLIPEditorOptionsState({
      parentTab: this
    });

    this.utilitiesTabManager.addTab(this.lipOptionsTab);

    this.tabContentView = <TabLIPEditor tab={this}></TabLIPEditor>
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;

    this.ui3DRenderer.camera.position.set(0.0, 0.5, 0.1);
    this.ui3DRenderer.camera.lookAt(0, 0, 0);

    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  openFile(file?: EditorFile){
    return new Promise<LIPObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile( (buffer: any) => {
          new KotOR.LIPObject(buffer, (lip: any) => {
            this.lip = lip;

            if(typeof this.lip.file != 'string')
              this.lip.file = this.file.resref + '.' + ResourceTypes.getKeyByValue(this.file.reskey);

            if(this.lip.keyframes.length){
              this.selectKeyFrame(this.lip.keyframes[0]);
            }
            this.reloadKeyFrames();
            this.processEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', [this.lip]);

            this.loadSound(this.file.resref).then( () => {
              this.loadHead(this.current_head).then( () => {
                resolve(this.lip);
              });
            });
          });
        });
      }
    });
  }

  loadHead(model_name = 'p_bastilah'){
    return new Promise<void>( (resolve, reject) => {
      KotOR.GameState.ModelLoader.load({
        file: model_name,
        onLoad: (mdl: OdysseyModel) => {
          this.current_head = model_name;
          localStorage.setItem('lip_head', this.current_head);
          KotOR.OdysseyModel3D.FromMDL(mdl, {
            context: this.ui3DRenderer,
            castShadow: true,
            receiveShadow: true,
            onComplete: (model: OdysseyModel3D) => {

              if(this.head instanceof KotOR.THREE.Object3D){
                this.head.parent?.remove(this.head);
              }

              this.head = model;
              this.head_hook.add(this.head);
              this.box3.setFromObject(this.head);

              this.head.animations.sort((a: any, b: any) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0))
              this.head.playAnimation('tlknorm', true);

              this.head.moduleObject = {
                lipObject: this.lip
              };

              this.processEventListener<TabLIPEditorStateEventListenerTypes>('onHeadLoad', [model]);
              resolve();
            }
          });
        }
      });
    });
  }

  loadSound(sound = 'nm35aabast06217_'){
    return new Promise<void>( (resolve, reject) => {
      KotOR.AudioLoader.LoadStreamWave(sound, (data: any) => {
        this.audio_name = sound;
        KotOR.GameState.audioEngine.audioCtx.decodeAudioData(data, (buffer: AudioBuffer) => {
          this.audio_buffer = buffer;
          this.processEventListener<TabLIPEditorStateEventListenerTypes>('onAudioLoad', [this, buffer]);
          resolve();
        });
      }, (e: any) => {
        resolve();
      });
    });
  }

  animate(delta: number = 0){
    if(this.head){
      this.head.update(delta);

      if(this.ui3DRenderer){
        let center: THREE.Vector3 = new KotOR.THREE.Vector3;
        this.box3.getCenter(center);
        let size: THREE.Vector3 = new KotOR.THREE.Vector3;
        this.box3.getSize(size);
        //Center the object to 0
        this.head.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer.camera.position.z = 0;
        this.ui3DRenderer.camera.position.y = size.x + size.y + size.z;
        this.ui3DRenderer.camera.lookAt(new KotOR.THREE.Vector3)
      }
    }

    if(this.lip instanceof KotOR.LIPObject && this.head instanceof KotOR.OdysseyModel3D){
      const last_time = this.lip.elapsed;

      this.updateLip(0);

      if(this.playing || this.poseFrame){
        this.updateLip(delta);
      }

      if(this.poseFrame){
        this.poseFrame = false;
        this.lip.elapsed = last_time;
      }

      if(this.lip.elapsed > this.lip.duration){
        this.lip.elapsed = this.lip.duration;
        this.stop();
      }
    }

    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onAnimate', [delta]);
  }

  updateLip(delta = 0){
    if(this.lip instanceof KotOR.LIPObject && this.head instanceof KotOR.OdysseyModel3D){
      this.lip.update(delta, this.head);
    }
  }

  private resetAudio(){
    try{
      this.source.disconnect();
      this.source.stop(0);
    }catch(e){ }
  }

  play(){

    this.resetAudio();
    this.source = KotOR.GameState.audioEngine.audioCtx.createBufferSource();
    
    try{
      this.source.buffer = this.audio_buffer;
      this.source.connect(this.gainNode);
      this.gainNode.connect(KotOR.GameState.audioEngine.audioCtx.destination);
      this.source.loop = false;

      if(this.lip instanceof KotOR.LIPObject){
        this.source.start(0, this.lip.elapsed);
      }else{
        this.source.start(0, 0);
      }
    }catch(e){}
    
    this.poseFrame = true;
    this.playing = true;
    if(this.lip instanceof KotOR.LIPObject){
      if(this.lip.elapsed >= this.lip.duration){
        this.lip.elapsed = 0;
      }
    }

    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onPlay');
  }

  pause(){
    this.resetAudio();
    this.playing = false;
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onPause');
  }

  stop(){
    this.pause();
    if(this.lip instanceof KotOR.LIPObject){
      this.lip.elapsed = 0;
    }
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onStop');
  }

  seek(time: number = 0){

    let was_playing = this.playing;
    this.pause();

    if(this.lip instanceof KotOR.LIPObject){
      if(time > this.lip.duration) time = this.lip.duration;
      if(time < 0) time = 0;
      this.lip.elapsed = time;
      this.poseFrame = true;
    }

    if(was_playing) this.play();
  }

  seekAudio(time: number){
    if(this.source){
      try{
        this.source.start(0, time);
      }catch(e){
        console.error(e);
      }
    }
  }

  keyframeTrackZoomIn(){
    this.timeline_zoom += 25;

    if(this.timeline_zoom > this.max_timeline_zoom){
      this.timeline_zoom = this.max_timeline_zoom;
    }
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameTrackZoomIn', [this]);
  }

  keyframeTrackZoomOut(){
    this.timeline_zoom -= 25;

    if(this.timeline_zoom < this.min_timeline_zoom){
      this.timeline_zoom = this.min_timeline_zoom;
    }
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameTrackZoomOut', [this]);
  }

  selectKeyFrame(keyframe: LIPKeyFrame){
    if(this.lip.keyframes.indexOf(keyframe) == -1) return;
    this.selected_frame = keyframe;
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', [keyframe]);
  }

  selectNextKeyFrame(){
    let index = this.lip.keyframes.indexOf(this.selected_frame);
    if(index == -1){
      this.selectKeyFrame(this.lip.keyframes[0]);
    }else{
      index++;
      if(index < 0) index = 0;
      if(index >= this.lip.keyframes.length){
        index = this.lip.keyframes.length-1;
      }
      this.selectKeyFrame(this.lip.keyframes[index]);
    }
  }

  selectPreviousKeyFrame(){
    let index = this.lip.keyframes.indexOf(this.selected_frame);
    if(index == -1){
      this.selectKeyFrame(this.lip.keyframes[0]);
    }else{
      index--;
      if(index < 0) index = 0;
      if(index >= this.lip.keyframes.length){
        index = this.lip.keyframes.length-1;
      }
      this.selectKeyFrame(this.lip.keyframes[index]);
    }
  }

  addKeyFrame(time: number = 0, shape: number = 0){
    const newFrame = this.lip.addKeyFrame(time, shape);
    this.reloadKeyFrames();
    this.file.unsaved_changes = true;
    return newFrame;
  }

  reloadKeyFrames(){
    this.keyframesSceneGraphNode.setNodes(this.getKeyframesAsSceneGraphNodes());
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFramesChange');
  }

  getKeyframesAsSceneGraphNodes(){
    return this.lip.keyframes.map( (frame: LIPKeyFrame, index: number) => {
      return new SceneGraphNode({
        name: `${index} - ${LIPShapeLabels[frame.shape]}`,
        data: frame,
        onClick: (node: SceneGraphNode) => {
          this.selectKeyFrame(node.data);
        }
      })
    });
  }

  getExportBuffer(): Buffer {
    if(this.lip){
      return this.lip.toExportBuffer();
    }
    return super.getExportBuffer();
  }

  destroy(): void {
    super.destroy();
    this.ui3DRenderer.removeEventListener('onBeforeRender', this.animate);
    this.ui3DRenderer.destroy();
  }

}
