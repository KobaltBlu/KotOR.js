import { EngineMode } from "@/enums/engine/EngineMode";
import { GameMenu, commitGuiTransform } from "@/gui";
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
  /** Cancels in-flight playStreamWave callbacks when a newer bark replaces them. */
  private barkAudioGeneration: number = 0;

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
        this.bHasAudio = false;
        this.bAudioPlayed = true;
        this.barkTimer = 0;
      });
      resolve();
    });
  }
  
  bark(entry: DLGNode, screenX: number = -1, screenY: number = -1) {

    const outText = this.gameStringParse(entry.text);
    console.log('bark', entry, outText);

    if (!entry || !outText?.length) {
      return;
    }

    const audioGeneration = ++this.barkAudioGeneration;
    this.resetCurrentEntryLIP();
    this.stopBarkAudio();

    if(entry.dialog){
      entry.initProperties();
    }
    this.currentEntry = entry;

    this.bHasAudio = false;
    this.bAudioPlayed = false;
    this.barkTimer = InGameBark.BARK_TIMER;
    this.show();
    this.LBL_BARKTEXT.setText(entry.text);
    let size = new THREE.Vector3();
    this.LBL_BARKTEXT.text.geometry.boundingBox?.getSize(size);
    this.tGuiPanel.extent.height = Math.ceil(size.y) + 14;
    this.tGuiPanel.resizeControl();
    // TSL ActionStartConversation nBarkX/nBarkY — left/top corner override (−1 = default).
    if(screenX >= 0 && screenY >= 0){
      const halfW = GameState.ResolutionManager.getViewportWidth() / 2;
      const halfH = GameState.ResolutionManager.getViewportHeight() / 2;
      this.tGuiPanel.widget.position.x = -halfW + screenX + this.tGuiPanel.extent.width / 2;
      this.tGuiPanel.widget.position.y = halfH - screenY - this.tGuiPanel.extent.height / 2;
    }else{
      this.tGuiPanel.widget.position.x = -GameState.ResolutionManager.getViewportWidth() / 2 + this.tGuiPanel.extent.width / 2 + 10;
      this.tGuiPanel.widget.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - this.tGuiPanel.extent.height / 2 - 134;
    }
    commitGuiTransform(this.tGuiPanel.widget);
    this.LBL_BARKTEXT.setText(entry.text);

    const baseVo = entry.getVoiceResRef();
    if (!!baseVo?.length) {
      // BarkOneLine: SoundExists bit2 → append rand()%3+1 on a local copy
      const voResRef = ((entry.soundExists & 2) !== 0)
        ? `${baseVo}${((Math.random() * 3) | 0) + 1}`
        : baseVo;
      this.bHasAudio = true;
      this.bAudioPlayed = false;
      console.log('lip', voResRef);
      void entry.loadLIP(voResRef);
      GameState.CutsceneManager.audioEmitter.playStreamWave(voResRef).then((audioNode) => {
        if(audioGeneration !== this.barkAudioGeneration){
          try { audioNode?.stop?.(0); } catch { /* superseded */ }
          return;
        }
        if(!audioNode){
          this.bHasAudio = false;
          this.bAudioPlayed = true;
          return;
        }
        this.audioNode = audioNode;
        this.bHasAudio = true;
        audioNode.onended = () => {
          if(audioGeneration === this.barkAudioGeneration){
            this.bAudioPlayed = true;
          }
        };
      }).catch(() => {
        if(audioGeneration !== this.barkAudioGeneration){ return; }
        this.bHasAudio = false;
        this.bAudioPlayed = true;
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
    this.barkAudioGeneration++;
    this.stopBarkAudio();
    this.resetCurrentEntryLIP();
    this.currentEntry = undefined;
    this.bHasAudio = false;
    this.bAudioPlayed = false;
    this.barkTimer = 0;
  }

  stopBarkAudio(){
    if(!this.audioNode){ return; }
    this.audioNode.onended = undefined;
    try {
      this.audioNode.stop(0);
    } catch {
      // Source may already be stopped.
    }
    this.audioNode = undefined;
  }

  resetCurrentEntryLIP(){
    if(typeof this.currentEntry?.resetLIP === 'function'){
      this.currentEntry.resetLIP();
    }
  }
  
}
