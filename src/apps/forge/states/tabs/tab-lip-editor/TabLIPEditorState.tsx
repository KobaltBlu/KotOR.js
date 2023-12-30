import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "../TabState";
import BaseTabStateOptions from "../../../interfaces/BaseTabStateOptions";
import { TabLIPEditor } from "../../../components/tabs/tab-lip-editor/TabLIPEditor";
import { EditorFile } from "../../../EditorFile";
import { EditorTabManager } from "../../../managers/EditorTabManager";
import { UI3DRendererView } from "../../../components/UI3DRendererView";
import { UI3DRenderer } from "../../../UI3DRenderer";
import { LIPKeyFrame } from "../../../../../interface/resource/LIPKeyFrame";
import { TabLIPEditorOptionsState } from "./TabLIPEditorOptionsState";
import { SceneGraphNode } from "../../../SceneGraphNode";
import { LIPShapeLabels } from "../../../data/LIPShapeLabels";
import { ForgeFileSystem, ForgeFileSystemResponse } from "../../../ForgeFileSystem";
import * as KotOR from "../../../KotOR";
import * as THREE from 'three';

export type TabLIPEditorStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onLIPLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|
  'onHeadLoad'|'onKeyFrameSelect'|'onKeyFrameTrackZoomIn'|'onKeyFrameTrackZoomOut'|
  'onAnimate'|'onKeyFramesChange'|'onDurationChange';

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
  onDurationChange: Function[],
}

export class TabLIPEditorState extends TabState {

  tabName: string = `LIP Editor`;

  //Lip
  lip: KotOR.LIPObject = new KotOR.LIPObject(Buffer.alloc(0));

  //Audio
  gainNode: GainNode;
  source: AudioBufferSourceNode;
  preview_gain: number = 0.5;
  audio_buffer: AudioBuffer;
  playbackRate: number = 1;
  
  utilitiesTabManager: EditorTabManager = new EditorTabManager();
  lipOptionsTab: TabLIPEditorOptionsState;

  animLoop: boolean;
  playing: boolean = false;
  seeking: boolean;
  scrubbing: boolean = false;
  preScrubbingPlayState: boolean = false;
  scrubbingTimeout: NodeJS.Timeout|number;
  current_head: string;
  audio_name: string;
  selected_frame: LIPKeyFrame;
  dragging_frame: LIPKeyFrame|undefined;
  dragging_frame_snapshot: LIPKeyFrame;
  poseFrame: boolean;
  max_timeline_zoom: number = 1000;
  min_timeline_zoom: number = 50;
  timeline_zoom: number = 250;

  scrubDuration: number|undefined;

  head: KotOR.OdysseyModel3D;
  head_hook: THREE.Object3D<THREE.Event> = new THREE.Object3D();
  pointLight: THREE.PointLight;

  ui3DRenderer: UI3DRenderer;
  box3: THREE.Box3 = new THREE.Box3();

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
    this.gainNode = KotOR.AudioEngine.GetAudioEngine().audioCtx.createGain();
    this.gainNode.gain.value = this.preview_gain;
    this.source = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();

    this.current_head = localStorage.getItem('lip_head') !== null ? localStorage.getItem('lip_head') as string : '';
    
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.scene.add(this.head_hook);
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.ui3DRenderer.sceneGraphManager.parentNodes.push(this.keyframesSceneGraphNode);

    this.lipOptionsTab = new TabLIPEditorOptionsState({
      parentTab: this
    });

    this.utilitiesTabManager.addTab(this.lipOptionsTab);

    this.setContentView(<TabLIPEditor tab={this}></TabLIPEditor>);
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
    return new Promise<KotOR.LIPObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile().then( (response) => {
          new KotOR.LIPObject(response.buffer, (lip: any) => {
            this.lip = lip;

            if(typeof this.lip.file != 'string')
              this.lip.file = this.file.resref + '.' + KotOR.ResourceTypes.getKeyByValue(this.file.reskey);

            this.setDuration(this.lip.duration);

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
      KotOR.GameState.ModelLoader.load(model_name)
      .then((mdl: KotOR.OdysseyModel) => {
        this.current_head = model_name;
        localStorage.setItem('lip_head', this.current_head);
        KotOR.OdysseyModel3D.FromMDL(mdl, {
          context: this.ui3DRenderer,
          castShadow: true,
          receiveShadow: true,
        }).then((model: KotOR.OdysseyModel3D) => {

          if(this.head instanceof THREE.Object3D){
            this.head.parent?.remove(this.head);
          }

          this.head = model;
          this.head_hook.add(this.head);
          this.box3.setFromObject(this.head);

          this.head.animations.sort((a: any, b: any) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0))
          this.head.playAnimation('tlknorm', true);

          this.head.userData.moduleObject = {
            lipObject: this.lip
          };

          this.processEventListener<TabLIPEditorStateEventListenerTypes>('onHeadLoad', [model]);
          resolve();
        }).catch(resolve)
      }).catch(resolve)
    });
  }

  loadSound(sound = 'nm35aabast06217_'){
    return new Promise<void>( (resolve, reject) => {
      KotOR.AudioLoader.LoadStreamWave(sound, (data: any) => {
        this.audio_name = sound;
        KotOR.AudioEngine.GetAudioEngine().audioCtx.decodeAudioData(data, (buffer: AudioBuffer) => {
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
    delta *= this.playbackRate;
    if(this.head){
      this.head.update(delta);

      if(this.ui3DRenderer){
        let center: THREE.Vector3 = new THREE.Vector3;
        this.box3.getCenter(center);
        let size: THREE.Vector3 = new THREE.Vector3;
        this.box3.getSize(size);
        //Center the object to 0
        this.head.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer.camera.position.z = 0;
        this.ui3DRenderer.camera.position.y = size.x + size.y + size.z;
        this.ui3DRenderer.camera.lookAt(new THREE.Vector3)
      }
    }

    if(this.lip instanceof KotOR.LIPObject && this.head instanceof KotOR.OdysseyModel3D){
      const last_time = this.lip.elapsed;

      this.updateLip(0);

      if(this.playing || this.poseFrame){
        this.updateLip(delta);
        if(typeof this.scrubDuration === 'number'){
          this.scrubDuration -= delta;
          if(this.scrubDuration <= 0){
            this.scrubDuration = undefined;
            this.pause();
          }
        }
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

  play(duration: number|undefined = undefined){

    this.resetAudio();
    this.source = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
    
    try{
      this.source.buffer = this.audio_buffer;
      this.source.connect(this.gainNode);
      this.gainNode.connect(KotOR.AudioEngine.GetAudioEngine().audioCtx.destination);
      this.source.loop = false;
      this.source.playbackRate.value = this.playbackRate;

      if(this.lip instanceof KotOR.LIPObject){
        this.source.start(0, this.lip.elapsed, duration);
      }else{
        this.source.start(0, 0, duration);
      }
    }catch(e){}
    
    this.poseFrame = true;
    this.playing = true;
    this.scrubDuration = duration;
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

  setDuration(value: number = 0){
    this.lip.duration = value;
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onDurationChange', [value]);
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

  fitDurationToKeyFrames(){
    const duration = this.lip.keyframes.reduce((a: number, b: LIPKeyFrame) => Math.max(a, b.time), -Infinity);
    this.setDuration(duration);
  }

  importPHN(): void {
    ForgeFileSystem.OpenFileBuffer({ext: ['phn']}).then( (buffer: Buffer ) => {
      let data = buffer.toString();
      console.log('phn', data);
      let eoh = data.indexOf('END OF HEADER');
      if(eoh > -1){
        data = data.substr(eoh+14);
        let keyframes = data.trim().split('\r\n');

        console.log(keyframes);

        this.lip.keyframes = [];

        let PHN_INVALID = -1;
        let PHN_EE = 0;
        let PHN_EH = 1;
        let PHN_SCHWA = 2;
        let PHN_AH = 3;
        let PHN_OH = 4;
        let PHN_OOH = 5;
        let PHN_Y = 6;
        let PHN_S = 7;
        let PHN_FV = 8;
        let PHN_NNG = 9;
        let PHN_TH = 0xA;
        let PHN_MPB = 0xB;
        let PHN_TD = 0xC;
        let PHN_JSH = 0xD;
        let PHN_L = 0xE;
        let PHN_KG = 0xF;
        let PHN_USE_NEXT = 0x10;

        let last_shape = PHN_INVALID;

        for(let i = 0; i < keyframes.length; i++){

          let keyframe_data = keyframes[i].trim().split(' ');

          if(!keyframe_data.length){
            continue;
          }

          let keyframe:  {shape: number, time: number} = {
            shape: PHN_INVALID,
            time: parseFloat(keyframe_data[0]) * .001
          };
          
          switch(keyframe_data[2]){
            case "i:":
              keyframe.shape = PHN_EE;
              break;
            case "I":
              keyframe.shape = PHN_EH;
              break;
            case "I_x":
              keyframe.shape = PHN_EH;
              break;
            case "E":
              keyframe.shape = PHN_EH;
              break;
            case "@":
              keyframe.shape = PHN_AH;
              break;
            case "A":
              keyframe.shape = PHN_AH;
              break;
            case "^":
              keyframe.shape = PHN_AH;
              break;
            case ">":
              keyframe.shape = PHN_SCHWA;
              break;
            case "U":
              keyframe.shape = PHN_OH;
              break;
            case "u":
              keyframe.shape = PHN_OOH;
              break;
            case "u_x":
              keyframe.shape = PHN_OOH;
              break;
            case "&":
              keyframe.shape = PHN_OH;
              break;
            case "&_0":
              keyframe.shape = PHN_OH;
              break;
            case "3r":
              keyframe.shape = PHN_SCHWA;
              break;
            case "&r":
              keyframe.shape = PHN_SCHWA;
              break;
            case "5":
              keyframe.shape = PHN_OH;
              break;
            case "ei":
              keyframe.shape = PHN_EH;
              break;
            case ">i":
              keyframe.shape = PHN_OH;
              break;
            case "aI":
              keyframe.shape = PHN_AH;
              break;
            case "aU":
              keyframe.shape = PHN_AH;
              break;
            case "oU":
              keyframe.shape = PHN_OH;
              break;
            case "iU":
              keyframe.shape = PHN_EE;
              break;
            case "i&":
              keyframe.shape = PHN_EE;
              break;
            case "u&":
              keyframe.shape = PHN_OOH;
              break;
            case "e&":
              keyframe.shape = PHN_EH;
              break;
            
            case "ph":
              keyframe.shape = PHN_MPB;
              break;
            case "pc":
              keyframe.shape = PHN_MPB;
              break;
            case "b":
              keyframe.shape = PHN_MPB;
              break;
            case "bc":
              keyframe.shape = PHN_MPB;
              break;
            case "th":
              keyframe.shape = PHN_TD;
              break;
            case "tc":
              keyframe.shape = PHN_TD;
              break;
            case "d":
              keyframe.shape = PHN_TD;
              break;
            case "dc":
              keyframe.shape = PHN_TD;
              break;
            case "kh":
              keyframe.shape = PHN_KG;
              break;
            case "kc":
              keyframe.shape = PHN_KG;
              break;
            case "g":
              keyframe.shape = PHN_KG;
              break;
            case "gc":
              keyframe.shape = PHN_KG;
              break;
            case "f":
              keyframe.shape = PHN_FV;
              break;
            case "v":
              keyframe.shape = PHN_FV;
              break;
            case "T":
              keyframe.shape = PHN_TH;
              break;
            case "D":
              keyframe.shape = PHN_TH;
              break;
            case "s":
              keyframe.shape = PHN_S;
              break;
            case "z":
              keyframe.shape = PHN_S;
              break;
            case "S":
              keyframe.shape = PHN_JSH;
              break;
            case "Z":
              keyframe.shape = PHN_JSH;
              break;
            case "h":
              keyframe.shape = PHN_USE_NEXT;
              break;
            case "h_v":
              keyframe.shape = PHN_USE_NEXT;
              break;
            case "tS":
              keyframe.shape = PHN_JSH;
              break;
            case "tSc":
              keyframe.shape = PHN_JSH;
              break;
            case "dZ":
              keyframe.shape = PHN_JSH;
              break;
            case "dZc":
              keyframe.shape = PHN_JSH;
              break;
            case "m":
              keyframe.shape = PHN_MPB;
              break;
            case "n":
              keyframe.shape = PHN_NNG;
              break;
            case "N":
              keyframe.shape = PHN_NNG;
              break;
            case "d_(":
              keyframe.shape = PHN_TD;
              break;
            case "th_(":
              keyframe.shape = PHN_TD;
              break;
            case "n_(":
              keyframe.shape = PHN_NNG;
              break;
            case "l=":
              keyframe.shape = PHN_L;
              break;
            case "m=":
              keyframe.shape = PHN_MPB;
              break;
            case "n=":
              keyframe.shape = PHN_NNG;
              break;
            case "l":
              keyframe.shape = PHN_L;
              break;
            case "9r":
              keyframe.shape = PHN_L;
              break;
            case "j":
              keyframe.shape = PHN_Y;
              break;
            case "w":
              keyframe.shape = PHN_OOH;
              break;
            case "+":
              keyframe.shape = PHN_MPB;
              break;
            default:
              keyframe.shape = PHN_INVALID;
            break;
          }

          if(keyframe.shape == last_shape || keyframe.shape == PHN_INVALID){
            console.log('skipping');
            continue;
          }

          this.lip.addKeyFrame(keyframe.time, keyframe.shape);
          this.lip.duration = parseFloat(keyframe_data[1]) * .001;

          last_shape = keyframe.shape;
        }

        this.lip.reIndexKeyframes();
        this.selectKeyFrame(this.lip.keyframes[0]);
        this.lip.elapsed = 0;

      }
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
