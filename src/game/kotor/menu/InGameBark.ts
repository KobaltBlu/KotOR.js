import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUILabel } from "../../../gui";
import * as THREE from "three";
import { ResourceLoader } from "../../../loaders";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { LIPObject } from "../../../resource/LIPObject";
import { GameState } from "../../../GameState";
import { DLGNodeType, ModuleObjectType } from "../../../enums";
import { BitWise } from "../../../utility/BitWise";
import { DLGNode } from "../../../resource/DLGNode";

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
      this.tGuiPanel.widget.position.z = 5;
      resolve();
    });
  }
  
  bark(entry: any) {

    const outText = this.gameStringParse(entry.text);
    console.log('bark', entry, outText);

    if (!entry || !outText?.length) {
      return;
    }

    //reset the last audioNode
    if(this.audioNode){
      this.audioNode.onended = undefined;
    }

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
      LIPObject.Load(entry.getVoiceResRef()).then((lip: LIPObject) => {
        if (BitWise.InstanceOfObject(entry.speaker, ModuleObjectType.ModuleCreature)) {
          entry.speaker.setLIP(lip);
        }
      });
      this.manager.InGameDialog.audioEmitter.playStreamWave(entry.getVoiceResRef()).then((audioNode) => {
        this.audioNode = audioNode;
        this.bHasAudio = true;
        audioNode.onended = () => {
          this.bAudioPlayed = true;
        };
      }).catch((e) => {
        this.bHasAudio = false;
        this.bAudioPlayed = true;
      });
    } else {
      this.bAudioPlayed = true;
      this.bHasAudio = false;
      console.error('VO ERROR', entry);
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
    if(this.audioNode){
      this.audioNode.onended = undefined;
      this.audioNode = undefined;
    }
  }
  
}
