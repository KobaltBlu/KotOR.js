import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel } from "../../../gui";
import * as THREE from "three";
import { CutsceneMode } from "../../../enums/dialog/CutsceneMode";
import { DLGNode } from "../../../resource/DLGNode";
import { ConversationState } from "../../../enums/dialog/ConversationState";
import { EngineMode } from "../../../enums/engine/EngineMode";

const LETTERBOX_HEIGHT = 100;

/**
 * InGameDialog class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameDialog extends GameMenu {

  LBL_MESSAGE: GUILabel;
  LB_REPLIES: GUIListBox;

  //letterbox
  canLetterbox: boolean;
  letterBoxed: boolean;
  topBar: THREE.Mesh;
  bottomBar: THREE.Mesh;

  constructor(){
    super();
    this.gui_resref = 'dialog';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_MESSAGE.setText('');
      this.LBL_MESSAGE.setTextColor(this.LBL_MESSAGE.defaultColor.r, this.LBL_MESSAGE.defaultColor.g, this.LBL_MESSAGE.defaultColor.b);

      this.LB_REPLIES.extent.left = -(GameState.ResolutionManager.getViewportWidth()/2) + this.LB_REPLIES.extent.width/2 + 16;
      this.LB_REPLIES.extent.top = (GameState.ResolutionManager.getViewportHeight()/2) - this.LB_REPLIES.extent.height/2;
      this.LB_REPLIES.calculatePosition();
      this.LB_REPLIES.calculateBox();

      const geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      const material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide });
      this.topBar = new THREE.Mesh( geometry, material );
      this.bottomBar = new THREE.Mesh( geometry, material );

      this.resetLetterBox();

      this.tGuiPanel.widget.add(this.topBar);
      this.tGuiPanel.widget.add(this.bottomBar);
      resolve();
    });
  }

  show(){
    super.show();
    GameState.Mode = EngineMode.DIALOG;
  }

  setReplies(replies: DLGNode[]) {
    for (let i = 0; i < replies.length; i++) {
      let reply = replies[i];
      if(!GameState.CutsceneManager.isContinueDialog(reply)){
        this.LB_REPLIES.addItem(
          this.LB_REPLIES.children.length + 1 + '. ' + reply.getCompiledString(), 
          {
            onClick: (e) => {
              GameState.CutsceneManager.onReplySelect(reply);
            }
          }
        );
      }
    }
    this.LB_REPLIES.updateList();
  }

  setDialogMode(state: ConversationState) {
    if(state == ConversationState.LISTENING_TO_SPEAKER){
      this.LBL_MESSAGE.setText(GameState.CutsceneManager.lastSpokenString);
      this.LB_REPLIES.hide();
      this.LB_REPLIES.clearItems();
      this.updateTextPosition(true);
    }else{
      this.updateTextPosition(false);
      this.LB_REPLIES.show();
      this.LB_REPLIES.updateList();
    }
  }

  update(delta: number = 0) {
    super.update(delta);
    this.updateLetterBox(delta);
  }

  updateLetterBox(delta: number = 0){
    if(!this.canLetterbox || this.letterBoxed) return;

    if (GameState.CutsceneManager.cutsceneMode == CutsceneMode.ANIMATED) {
      this.bottomBar.position.y = -(GameState.ResolutionManager.getViewportHeight() / 2) + LETTERBOX_HEIGHT / 2;
      this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - LETTERBOX_HEIGHT / 2;
      this.letterBoxed = true;
      this.LBL_MESSAGE.show();
      return;
    }
    
    if (this.bottomBar.position.y < -(GameState.ResolutionManager.getViewportHeight() / 2) + LETTERBOX_HEIGHT / 2) {
      this.bottomBar.position.y += 5;
      this.topBar.position.y -= 5;
      this.LBL_MESSAGE.hide();
    } else {
      this.bottomBar.position.y = -(GameState.ResolutionManager.getViewportHeight() / 2) + LETTERBOX_HEIGHT / 2;
      this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - LETTERBOX_HEIGHT / 2;
      this.letterBoxed = true;
      this.LBL_MESSAGE.show();
    }
  }

  updateTextPosition(isListening: boolean = false) {
    if (typeof this.LBL_MESSAGE.text.geometry !== 'undefined') {
      this.LBL_MESSAGE.text.geometry.computeBoundingBox();
      let bb = this.LBL_MESSAGE.text.geometry.boundingBox;
      let height = Math.abs(bb.min.y) + Math.abs(bb.max.y);
      let width = Math.abs(bb.min.x) + Math.abs(bb.max.x);
      if (isListening) {
        this.LBL_MESSAGE.widget.position.y = -GameState.ResolutionManager.getViewportHeight() / 2 + 50;
      } else {
        this.LBL_MESSAGE.widget.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - 50;
      }
      this.LBL_MESSAGE.box = new THREE.Box2(new THREE.Vector2(this.LBL_MESSAGE.widget.position.x - width / 2, this.LBL_MESSAGE.widget.position.y - height / 2), new THREE.Vector2(this.LBL_MESSAGE.widget.position.x + width / 2, this.LBL_MESSAGE.widget.position.y + height / 2));
    }
  }

  resize() {
    this.resetLetterBox();
    this.recalculatePosition();
    this.updateTextPosition();
  }

  recalculatePosition() {
    this.LB_REPLIES.extent.left = -(GameState.ResolutionManager.getViewportWidth() / 2) + this.LB_REPLIES.extent.width / 2 + 16;
    this.LB_REPLIES.extent.top = GameState.ResolutionManager.getViewportHeight() / 2 - this.LB_REPLIES.extent.height / 2;
    this.LB_REPLIES.calculatePosition();
    this.LB_REPLIES.calculateBox();
    this.resetLetterBox();
  }

  resetLetterBox() {
    this.letterBoxed = false;
    this.topBar.scale.x = this.bottomBar.scale.x = GameState.ResolutionManager.getViewportWidth();
    this.topBar.scale.y = this.bottomBar.scale.y = LETTERBOX_HEIGHT;
    if (!this.letterBoxed) {
      this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 + LETTERBOX_HEIGHT / 2;
      this.bottomBar.position.y = -this.topBar.position.y;
    } else {
      this.bottomBar.position.y = -(GameState.ResolutionManager.getViewportHeight() / 2) + LETTERBOX_HEIGHT / 2;
      this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - LETTERBOX_HEIGHT / 2;
    }
  }

  triggerControllerAPress() {
    if(!this.LB_REPLIES.isVisible()) return;
    if (!this.LB_REPLIES.selectedItem) return;
    this.LB_REPLIES.selectedItem.click();
  }

  triggerControllerDUpPress() {
    if(!this.LB_REPLIES.isVisible()) return;
    this.LB_REPLIES.directionalNavigate('up');
  }

  triggerControllerDDownPress() {
    if(!this.LB_REPLIES.isVisible()) return;
    this.LB_REPLIES.directionalNavigate('down');
  }
  
}
