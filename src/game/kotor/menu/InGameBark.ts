import { EngineMode } from "@/enums/engine/EngineMode";
import { GameMenu } from "@/gui";
import type { GUILabel } from "@/gui";
import * as THREE from "three";
import { GameState } from "@/GameState";
import { DLGNodeType } from "@/enums";
import { DLGNode } from "@/resource/DLGNode";

/**
 * InGameBark class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameBark.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameBark extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_BARKTEXT: GUILabel;
  isOverlayGUI = true;

  static BARK_TIMER: number = 3;
  barkTimer: number = 0;
  bHasAudio: boolean = false;
  bAudioPlayed: boolean = false;

  audioNode: AudioBufferSourceNode;
  currentEntry: DLGNode;
  barkPlaybackToken: number = 0;

  constructor(){
    super();
    this.gui_resref = 'barkbubble';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_BARKTEXT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.barkPlaybackToken++;
        this.resetCurrentEntryLIP();
        GameState.CutsceneManager.audioEmitter?.stop();
        this.bHasAudio = false;
        this.bAudioPlayed = true;
        this.barkTimer = 0;
      });
      this.tGuiPanel.widget.position.z = 5;
      resolve();
    });
  }
  
  bark(entry: DLGNode) {

    if (!entry) return;
    const outText = this.gameStringParse(entry.text);
    console.log('bark', entry, outText);

    if (!entry || !outText?.length) {
      return;
    }

    const barkToken = ++this.barkPlaybackToken;
    this.resetCurrentEntryLIP();
    //reset the last audioNode
    if(this.audioNode){
      this.audioNode.onended = undefined;
      try {
        this.audioNode.stop(0);
      } catch {
        // Source may already be stopped.
      }
      this.audioNode = undefined;
    }

    if(entry.dialog){
      entry.initProperties();
    }
    this.currentEntry = entry;
    GameState.CutsceneManager.audioEmitter?.stop();

    this.bHasAudio = false;
    this.bAudioPlayed = false;
    this.barkTimer = InGameBark.BARK_TIMER;
    this.show();
    this.LBL_BARKTEXT.setText(entry.text);
    let size = new THREE.Vector3();
    this.LBL_BARKTEXT.text.geometry.boundingBox?.getSize(size);
    this.tGuiPanel.extent.height = Math.ceil(size.y) + 14;
    this.tGuiPanel.resizeControl();
    this.tGuiPanel.widget.position.x = -GameState.ResolutionManager.getViewportWidth() / 2 + this.tGuiPanel.extent.width / 2 + 10;
    this.tGuiPanel.widget.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - this.tGuiPanel.extent.height / 2 - 134;
    this.LBL_BARKTEXT.setText(entry.text);

    if (!!entry.getVoiceResRef()?.length) {
      this.bHasAudio = true;
      this.bAudioPlayed = false;
      console.log('lip', entry.getVoiceResRef());
      void entry.loadLIP().catch(() => {
        if (this.barkPlaybackToken === barkToken) this.resetCurrentEntryLIP();
      });
      GameState.CutsceneManager.audioEmitter.playStreamWave(entry.getVoiceResRef()).then((audioNode) => {
        if (this.barkPlaybackToken !== barkToken) {
          return;
        }
        if(!audioNode){
          this.bHasAudio = false;
          this.bAudioPlayed = true;
          this.resetCurrentEntryLIP();
          return;
        }
        this.audioNode = audioNode;
        this.bHasAudio = true;
        audioNode.onended = () => {
          if (this.barkPlaybackToken !== barkToken) {
            return;
          }
          this.resetCurrentEntryLIP();
          this.bAudioPlayed = true;
        };
      }).catch((e) => {
        if (this.barkPlaybackToken !== barkToken) {
          return;
        }
        this.bHasAudio = false;
        this.bAudioPlayed = true;
        this.resetCurrentEntryLIP();
      });
    } else {
      this.bAudioPlayed = true;
      this.bHasAudio = false;
    }
  }

  barkFromString(text: string){
    const entry = new DLGNode();
    entry.nodeType = DLGNodeType.ENTRY;
    entry.text = text;
    this.bark(entry);
  }

  barkFromStringRef(strRef: number){
    const tlkString = GameState.TLKManager.GetStringById(strRef);
    if(!tlkString){ return; }
    const entry = new DLGNode();
    entry.nodeType = DLGNodeType.ENTRY;
    entry.text = tlkString.Value;
    this.bark(entry);
  }

  update(delta = 0){
    super.update(delta);
    if(this.bHasAudio){
      if(this.bAudioPlayed){
        this.close();
      }
    }else{
      this.barkTimer -= delta;
      if(this.barkTimer < 0){ this.barkTimer = 0; }
      if(!this.barkTimer){ 
        this.close();
      }else{
        this.show();
      }
    }
  }

  close(){
    super.close();
    this.barkPlaybackToken++;
    this.bHasAudio = false;
    this.bAudioPlayed = false;
    this.barkTimer = 0;
    this.resetCurrentEntryLIP();
    this.currentEntry = undefined;
    if(this.audioNode){
      this.audioNode.onended = undefined;
    }
    GameState.CutsceneManager.audioEmitter?.stop();
    if(this.audioNode){
      this.audioNode = undefined;
    }
  }

  resetCurrentEntryLIP(){
    if(typeof this.currentEntry?.resetLIP === 'function'){
      this.currentEntry.resetLIP();
    }
  }
  
}
