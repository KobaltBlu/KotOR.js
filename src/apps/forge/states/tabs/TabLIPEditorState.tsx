import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabLIPEditor } from "../../components/tabs/TabLIPEditor";
import { EditorFile } from "../../EditorFile";
import type { LIPObject } from "../../../../resource/LIPObject";
import type { OdysseyModel } from "../../../../odyssey";
import type { OdysseyModel3D } from "../../../../three/odyssey";
import { EditorTabManager } from "../../managers/EditorTabManager";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { UI3DRenderer } from "../../UI3DRenderer";
import { ResourceTypes } from "../../../../resource/ResourceTypes";
import { LIPKeyFrame } from "../../../../interface/resource/LIPKeyFrame";

declare const KotOR: any;

export type TabLIPEditorStateEventListenerTypes =
TabStateEventListenerTypes & 
  'onLIPLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|'onKeyframeTrackZoomIn'|'onKeyframeTrackZoomOut'|'onAnimate';

export interface TabLIPEditorStateEventListeners extends TabStateEventListeners {
  onLIPLoaded: Function[],
  onPlay: Function[],
  onPause: Function[],
  onStop: Function[],
  onAudioLoad: Function[],
  onHeadChange: Function[],
  onKeyframeTrackZoomIn: Function[],
  onKeyframeTrackZoomOut: Function[],
  onAnimate: Function[],
}

export class TabLIPEditorState extends TabState {

  eventListeners: TabLIPEditorStateEventListeners = {
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
    onKeyframeTrackZoomIn: [],
    onKeyframeTrackZoomOut: [],
    onAnimate: [],
  };

  addEventListener<TabLIPEditorStateEventListenerTypes>(type: TabLIPEditorStateEventListenerTypes, cb: Function){
    super.addEventListener(type as any, cb);
  }

  override removeEventListener<TabLIPEditorStateEventListenerTypes>(type: TabLIPEditorStateEventListenerTypes, cb: Function){
    super.removeEventListener(type as any, cb);
  }

  override processEventListener<TabLIPEditorStateEventListenerTypes>(type: TabLIPEditorStateEventListenerTypes, args: any[] = []){
    super.processEventListener(type as any, args);
  }

  override triggerEventListener<TabLIPEditorStateEventListenerTypes>(type: TabLIPEditorStateEventListenerTypes, args: any[] = []){
    this.processEventListener(type, args);
  }

  tabName: string = `LIP Editor`;
  lip: LIPObject;
  utilitiesTabManager: EditorTabManager = new EditorTabManager();

  animLoop: boolean;
  playing: boolean = false;
  seeking: boolean;
  current_head: string;
  audio_name: string;
  selected_frame: LIPKeyFrame;
  poseFrame: boolean;
  audio_buffer: AudioBuffer;
  dragging_frame: LIPKeyFrame;
  preview_gain: number = 0.5;
  max_timeline_zoom: number = 1000;
  min_timeline_zoom: number = 50;
  timeline_zoom: number = 250;

  clock: THREE.Clock = new KotOR.THREE.Clock();
  selectable: THREE.Group =  new KotOR.THREE.Group();
  unselectable: THREE.Group =  new KotOR.THREE.Group();
  pointLight: THREE.PointLight;

  head: OdysseyModel3D;
  head_hook: THREE.Object3D<THREE.Event> = new KotOR.THREE.Object3D();
  data: Uint8Array;
  gainNode: GainNode;
  source: AudioBufferSourceNode;

  ui3DRenderer: UI3DRenderer;
  ui3DRendererView: JSX.Element;
  box3: THREE.Box3 = new KotOR.THREE.Box3();

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
    this.ui3DRenderer.addEventListener('onBeforeRender', this.onBeforeRender.bind(this));
    this.ui3DRendererView = (
      <UI3DRendererView context={this.ui3DRenderer}></UI3DRendererView>
    )

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

            this.loadSound(this.file.resref).then( () => {
              this.loadHead(this.current_head).then( () => {
                KotOR.TextureLoader.LoadQueue(() => {
                  console.log('Textures Loaded');
                  this.onResize();
                  // this.UpdateUI();
                  // this.BuildKeyframes();
                  // this.Render();
                  this.processEventListener('onLIPLoaded', [this.lip]);
                  resolve(this.lip);
                });
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
          this.processEventListener('onAudioLoad', [this, buffer]);
          resolve();
        });
      }, (e: any) => {
        resolve();
      });
    });
  }

  onBeforeRender(delta: number = 0){
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

    if(this.playing){
      this.updateLip(delta);
    }

    this.processEventListener('onAnimate', [delta]);
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
    
    this.playing = true;
    if(this.lip instanceof KotOR.LIPObject){
      if(this.lip.elapsed >= this.lip.Header.Length){
        this.lip.elapsed = 0;
      }
    }

    this.processEventListener('onPlay');
  }

  pause(){
    this.resetAudio();
    this.playing = false;
    this.processEventListener('onPause');
  }

  stop(){
    this.pause();
    if(this.lip instanceof KotOR.LIPObject){
      this.lip.elapsed = 0;
    }
    this.processEventListener('onStop');
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
    this.processEventListener('onKeyframeTrackZoomIn', [this]);
  }

  keyframeTrackZoomOut(){
    this.timeline_zoom -= 25;

    if(this.timeline_zoom < this.min_timeline_zoom){
      this.timeline_zoom = this.min_timeline_zoom;
    }
    this.processEventListener('onKeyframeTrackZoomOut', [this]);
  }

  destroy(): void {
    super.destroy();
    this.ui3DRenderer.removeEventListener('onBeforeRender', this.onBeforeRender);
    this.ui3DRenderer.destroy();
  }

}
