import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIControl, GUIListBox, GUILabel } from "@/gui";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import * as THREE from "three";
import { CutsceneMode } from "@/enums/dialog/CutsceneMode";
import { DLGNode } from "@/resource/DLGNode";
import { ConversationState } from "@/enums/dialog/ConversationState";
import { EngineMode } from "@/enums/engine/EngineMode";

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

      this.updateReplyListLayout();
      this.LB_REPLIES.onSelected = (entry: DLGNode, control: any, index: number) => {
        GameState.CutsceneManager.selectReplyAtIndex(index);
      }

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
    GameState.SetEngineMode(EngineMode.DIALOG);
  }

  protected getReplyItemWidth() {
    const borderSize = Math.min(this.LB_REPLIES.getBorderSize(), this.LB_REPLIES.extent.width / 2, this.LB_REPLIES.extent.height / 2);
    const scrollbarWidth = (this.LB_REPLIES.scrollbar && this.LB_REPLIES.maxScroll > 0)
      ? this.LB_REPLIES.scrollbar.extent.width + (this.LB_REPLIES.scrollbar.border.dimension * 2)
      : 0;
    return Math.max(1, this.LB_REPLIES.extent.width - (borderSize * 2) - scrollbarWidth);
  }

  protected reflowReplyItems(controls: GUIControl[] = this.LB_REPLIES.children) {
    const itemWidth = this.getReplyItemWidth();

    for (let i = 0; i < controls.length; i++) {
      const control = controls[i];
      if (!control) {
        continue;
      }

      if(typeof control.userData.replyBaseHeight === 'undefined'){
        control.userData.replyBaseHeight = control.extent.height;
      }

      control.text.alignment = (control.text.alignment & GUIControlAlignment.VerticalMask) | GUIControlAlignment.HorizontalLeft;

      let needsResize = false;
      if (control.extent.width !== itemWidth) {
        control.extent.width = itemWidth;
        needsResize = true;
      }

      control.updateTextGeometry(control.getText());
      const textSize = control.getTextSize();
      const itemHeight = Math.max(control.userData.replyBaseHeight, textSize.y);

      if (control.extent.height !== itemHeight) {
        control.extent.height = itemHeight;
        needsResize = true;
      }

      if (needsResize) {
        control.resizeControl();
      }

      control.updateTextGeometry(control.getText());
      control.updateBounds();
    }

    this.LB_REPLIES.updateList();
  }

  protected updateReplyListLayout() {
    const horizontalMargin = 16;
    const viewportWidth = GameState.ResolutionManager.getViewportWidth();
    const viewportHeight = GameState.ResolutionManager.getViewportHeight();

    this.LB_REPLIES.extent.width = Math.max(1, viewportWidth - (horizontalMargin * 2));
    this.LB_REPLIES.extent.left = ((this.width - viewportWidth) / 2) + horizontalMargin;
    this.LB_REPLIES.extent.top = (viewportHeight / 2) - this.LB_REPLIES.extent.height / 2;
    this.LB_REPLIES.resizeControl();
    this.LB_REPLIES.calculatePosition();
    this.LB_REPLIES.calculateBox();
    this.reflowReplyItems();
    this.reflowReplyItems();
  }

  setReplies(replies: DLGNode[]) {
    this.updateReplyListLayout();
    this.LB_REPLIES.scroll = 0;
    const texts = replies
      .filter(r => !r.isContinueDialog())
      .map((r, i) => (i + 1) + '. ' + r.getCompiledString());
    this.LB_REPLIES.setItems(texts);
    // The first layout pass determines scrollbar visibility; the second uses
    // the final text width so long replies wrap without clipping.
    this.reflowReplyItems();
    this.reflowReplyItems();
  }

  setDialogMode(state: ConversationState) {
    if(state == ConversationState.LISTENING_TO_SPEAKER){
      this.LBL_MESSAGE.setText(GameState.CutsceneManager.lastSpokenString);
      this.LB_REPLIES.hide();
      this.LB_REPLIES.setItems([]);
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
    this.updateReplyListLayout();
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
