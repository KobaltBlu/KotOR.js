import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs/TabState";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabLIPEditor } from "@/apps/forge/components/tabs/tab-lip-editor/TabLIPEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { ILIPKeyFrame } from "@/interface/resource/ILIPKeyFrame";
import { TabLIPEditorOptionsState } from "@/apps/forge/states/tabs/tab-lip-editor/TabLIPEditorOptionsState";
import { SceneGraphNode } from "@/apps/forge/SceneGraphNode";
import { LIPShapeLabels } from "@/apps/forge/data/LIPShapeLabels";
import { ForgeFileSystem, ForgeFileSystemResponse } from "@/apps/forge/ForgeFileSystem";
import { FileLocationType } from "@/apps/forge/enum/FileLocationType";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from 'three';

/** Default LIP preview head resref; persisted under `lip_head` in localStorage. */
export const LIP_EDITOR_DEFAULT_HEAD = 'p_bastilah';
const DEFAULT_HEAD = LIP_EDITOR_DEFAULT_HEAD;

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

export interface LIPUndoSnapshot {
  keyframes: { time: number; shape: number; uuid: string }[];
  duration: number;
  selected_frame_uuid: string | undefined;
}

export class TabLIPEditorState extends TabState {

  tabName: string = `LIP Editor`;

  //Lip
  lip: KotOR.LIPObject = new KotOR.LIPObject(new Uint8Array(0));

  //Audio
  gainNode: GainNode;
  source: AudioBufferSourceNode;
  preview_gain: number = 0.5;
  audio_buffer: AudioBuffer|undefined;
  playbackRate: number = 1;
  
  utilitiesTabManager: EditorTabManager = new EditorTabManager();
  lipOptionsTab: TabLIPEditorOptionsState;

  animLoop: boolean;
  playing: boolean = false;
  seeking: boolean;
  scrubbing: boolean = false;
  preScrubbingPlayState: boolean = false;
  scrubbingTimeout: NodeJS.Timeout|number;
  current_head: string = DEFAULT_HEAD;
  audio_name: string;
  selected_frame: ILIPKeyFrame|undefined;
  dragging_frame: ILIPKeyFrame|undefined;
  dragging_frame_snapshot: ILIPKeyFrame|undefined;
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

    const storedHead = localStorage.getItem('lip_head')?.trim();
    const headCandidate = storedHead && storedHead.length ? storedHead : DEFAULT_HEAD;
    this.current_head = this.resolvePreviewHead(headCandidate);
    localStorage.setItem('lip_head', this.current_head);
    
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.scene.add(this.head_hook);
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.ui3DRenderer.sceneGraphManager.parentNodes.push(this.keyframesSceneGraphNode);
    this.ui3DRenderer.sceneGraphManager.rebuild();

    this.lipOptionsTab = new TabLIPEditorOptionsState({
      parentTab: this
    });

    this.utilitiesTabManager.addTab(this.lipOptionsTab);

    this.setContentView(<TabLIPEditor tab={this}></TabLIPEditor>);

    this.saveTypes = [
      {
        description: 'Odyssey Lipsync File',
        accept: {
          'application/octet-stream': ['.lip']
        }
      }
    ];
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;

    this.ui3DRenderer.camera.position.set(0.0, 0.5, 0.1);
    this.ui3DRenderer.camera.lookAt(0, 0, 0);

    // Ensure persisted preview head is present when tab is shown,
    // even if openFile has not completed yet.
    if(!(this.head instanceof THREE.Object3D)){
      this.loadHead(this.current_head);
    }

    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  // ── Undo / Redo ─────────────────────────────────────────────────────────

  protected captureUndoState(): LIPUndoSnapshot {
    return {
      keyframes: this.lip.keyframes.map(kf => ({ time: kf.time, shape: kf.shape, uuid: kf.uuid })),
      duration: this.lip.duration,
      selected_frame_uuid: this.selected_frame?.uuid,
    };
  }

  protected applyUndoState(snapshot: LIPUndoSnapshot): void {
    // Rebuild the keyframes array from the snapshot, preserving uuid identity
    // so the UI can re-select by uuid without object reference tricks.
    this.lip.keyframes = snapshot.keyframes.map(s => ({
      time: s.time, shape: s.shape, uuid: s.uuid,
    } as ILIPKeyFrame));
    this.lip.duration = snapshot.duration;
    this.selected_frame = this.lip.keyframes.find(kf => kf.uuid === snapshot.selected_frame_uuid);
    if (this.file) this.file.unsaved_changes = true;
    this.setDuration(snapshot.duration);
    this.reloadKeyFrames();
    if (this.selected_frame) {
      this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', [this.selected_frame]);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Lowercase resref that exists in heads.2da when available, else first row or the normalized preference. */
  private resolvePreviewHead(name: string): string {
    const normalized = (name || DEFAULT_HEAD).trim().toLowerCase() || DEFAULT_HEAD;
    try {
      const rows = KotOR.TwoDAManager.datatables.get('heads')?.rows;
      if (!rows) return normalized;
      const valid = Object.values(rows)
        .map((r: any) => String(r?.head ?? '').trim().toLowerCase())
        .filter(Boolean);
      if (!valid.length) return normalized;
      if (valid.includes(normalized)) return normalized;
      return valid[0];
    } catch {
      return normalized;
    }
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
        }).catch(reject);
      } else {
        reject(new Error('TabLIPEditorState.openFile requires an EditorFile'));
      }
    });
  }

  newFile(): Promise<void> {
    // Create a placeholder EditorFile if one isn't already attached.
    if (!(this.file instanceof EditorFile)) {
      this.file = new EditorFile({
        resref: 'untitled',
        reskey: KotOR.ResourceTypes.lip,
        location: FileLocationType.OTHER,
      });
    }
    this.tabName = this.file.getFilename();

    // Reset to a clean blank LIP (no keyframes, 1 s default duration).
    this.lip = new KotOR.LIPObject(new Uint8Array(0), () => {
      // LIPObject seeds one keyframe when given an empty buffer; clear it so
      // the editor opens genuinely blank.
      this.lip.keyframes = [];
      this.lip.duration = 1;
    });
    this.lip.file = `${this.file.resref}.lip`;

    this.selected_frame = undefined;
    this.file.unsaved_changes = true;

    this.setDuration(this.lip.duration);
    this.reloadKeyFrames();
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', [this.lip]);

    return this.loadHead(this.current_head);
  }

  loadHead(model_name = DEFAULT_HEAD){
    return new Promise<void>( (resolve, reject) => {
      const resolved = this.resolvePreviewHead(model_name || DEFAULT_HEAD);
      if(this.current_head === resolved && this.head instanceof THREE.Object3D){
        this.processEventListener<TabLIPEditorStateEventListenerTypes>('onHeadChange', []);
        resolve();
        return;
      }
      KotOR.MDLLoader.loader.load(resolved)
      .then((mdl: KotOR.OdysseyModel) => {
        this.current_head = resolved;
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
          this.processEventListener<TabLIPEditorStateEventListenerTypes>('onHeadChange', []);
          resolve();
        }).catch(resolve)
      }).catch(resolve)
    });
  }

  loadSound(sound = 'nm35aabast06217_'){
    return new Promise<void>( (resolve) => {
      const finishLoad = (buffer?: AudioBuffer, error?: any) => {
        this.audio_buffer = buffer;
        this.processEventListener<TabLIPEditorStateEventListenerTypes>('onAudioLoad', [this, buffer, error]);
        resolve();
      };

      KotOR.AudioLoader.LoadStreamWave(sound).then((data: Uint8Array) => {
        this.audio_name = sound;
        try{
          // decodeAudioData requires an ArrayBuffer, not a Uint8Array.
          // Handle non-zero byteOffset views to avoid a detached-buffer error.
          const ab: ArrayBuffer = (
            data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
              ? data.buffer
              : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
          );
          KotOR.AudioEngine.GetAudioEngine().audioCtx.decodeAudioData(
            ab,
            (buffer: AudioBuffer) => finishLoad(buffer),
            (error: any) => finishLoad(undefined, error)
          );
        }catch(error){
          finishLoad(undefined, error);
        }
      }, (error: any) => {
        finishLoad(undefined, error);
      });
    });
  }

  loadSoundFromFile(): Promise<void> {
    return new Promise<void>((resolve) => {
      ForgeFileSystem.OpenFileBuffer({ ext: ['wav', 'mp3'] }).then((data: Uint8Array) => {
        if (!data || data.byteLength === 0) { resolve(); return; }
        const finishLoad = (buffer?: AudioBuffer, error?: any) => {
          this.audio_buffer = buffer;
          this.processEventListener<TabLIPEditorStateEventListenerTypes>('onAudioLoad', [this, buffer, error]);
          resolve();
        };
        try {
          const af = new KotOR.AudioFile(data);
          af.getPlayableByteStream().then((pcm: Uint8Array) => {
            try {
              const ab: ArrayBuffer = (
                pcm.byteOffset === 0 && pcm.byteLength === pcm.buffer.byteLength
                  ? pcm.buffer
                  : pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)
              );
              KotOR.AudioEngine.GetAudioEngine().audioCtx.decodeAudioData(
                ab,
                (buffer: AudioBuffer) => {
                  this.audio_name = '(custom)';
                  finishLoad(buffer);
                },
                (error: any) => finishLoad(undefined, error)
              );
            } catch(error) {
              finishLoad(undefined, error);
            }
          }).catch((error: any) => finishLoad(undefined, error));
        } catch(error) {
          finishLoad(undefined, error);
        }
      }).catch(() => resolve());
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

  selectKeyFrame(keyframe: ILIPKeyFrame){
    if(this.lip.keyframes.indexOf(keyframe) == -1) return;
    this.selected_frame = keyframe;
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', [keyframe]);
  }

  removeKeyFrame(keyframe: ILIPKeyFrame|undefined){
    if(!keyframe) return;
    this.captureUndoSnapshot();
    if(!this.lip.removeKeyFrame(keyframe)) return;
    if(this.file) this.file.unsaved_changes = true;
    if(this.selected_frame === keyframe){
      if(this.lip.keyframes.length){
        this.selectKeyFrame(this.lip.keyframes[0]);
      }else{
        this.selected_frame = undefined;
      }
    }
    this.reloadKeyFrames();
  }

  setDuration(value: number = 0){
    this.lip.duration = value;
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onDurationChange', [value]);
  }

  selectNextKeyFrame(){
    if(!this.lip.keyframes.length) return;
    let index = this.lip.keyframes.indexOf(this.selected_frame as ILIPKeyFrame);
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
    if(!this.lip.keyframes.length) return;
    let index = this.lip.keyframes.indexOf(this.selected_frame as ILIPKeyFrame);
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
    this.captureUndoSnapshot();
    const newFrame = this.lip.addKeyFrame(time, shape);
    this.reloadKeyFrames();
    if(this.file) this.file.unsaved_changes = true;
    return newFrame;
  }

  reloadKeyFrames(){
    this.keyframesSceneGraphNode.setNodes(this.getKeyframesAsSceneGraphNodes());
    this.ui3DRenderer.sceneGraphManager.rebuild();
    this.processEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFramesChange');
  }

  finalizeKeyframeDrag(){
    if(!this.dragging_frame || !this.dragging_frame_snapshot) return;
    if(this.dragging_frame.time !== this.dragging_frame_snapshot.time){
      this.lip.reIndexKeyframes();
      if(this.file) this.file.unsaved_changes = true;
      this.reloadKeyFrames();
    }
  }

  getKeyframesAsSceneGraphNodes(){
    return this.lip.keyframes.map( (frame: ILIPKeyFrame, index: number) => {
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
    this.captureUndoSnapshot();
    const duration = this.lip.keyframes.reduce((a: number, b: ILIPKeyFrame) => Math.max(a, b.time), -Infinity);
    this.setDuration(duration);
  }

  importPHN(): void {
    ForgeFileSystem.OpenFileBuffer({ext: ['phn']}).then( (buffer: Uint8Array ) => {
      const textDecoder = new TextDecoder();
      let data = textDecoder.decode(buffer);
      let eoh = data.indexOf('END OF HEADER');
      if(eoh > -1){
        data = data.slice(eoh + 14);
        let keyframes = data.trim().split('\r\n');

        this.captureUndoSnapshot();
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
            continue;
          }

          this.lip.addKeyFrame(keyframe.time, keyframe.shape);
          this.lip.duration = parseFloat(keyframe_data[1]) * .001;

          last_shape = keyframe.shape;
        }

        this.lip.reIndexKeyframes();
        if(this.lip.keyframes.length){
          this.selectKeyFrame(this.lip.keyframes[0]);
        }else{
          this.selected_frame = undefined;
        }
        this.lip.elapsed = 0;
        this.setDuration(this.lip.duration);
        this.reloadKeyFrames();
        if(this.file) this.file.unsaved_changes = true;
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.lip){
      return this.lip.toExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  destroy(): void {
    super.destroy();
    this.ui3DRenderer.removeEventListener('onBeforeRender', this.animate);
    this.ui3DRenderer.destroy();
  }

}
