import { GameState } from "../../../GameState";
import { GameEngineType } from "../../../enums/engine";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUIButton } from "../../../gui";
import { TwoDAObject } from "../../../resource/TwoDAObject";

/**
 * InGameConfirm class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameConfirm.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameConfirm extends GameMenu {

  LB_MESSAGE: GUIListBox;
  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;

  showCancel: boolean = false;
  showOk: boolean = false;
  messageBoxHeight: number = 0;

  onOk: () => void;
  onCancel: () => void;

  defaultExtent = {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  }

  constructor(){
    super();
    this.gui_resref = 'confirm';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.defaultExtent.width = this.tGuiPanel.extent.width;
      this.defaultExtent.height = this.tGuiPanel.extent.height;
      this.defaultExtent.top = this.tGuiPanel.extent.top;
      this.defaultExtent.left = this.tGuiPanel.extent.left;

      this.BTN_OK.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('BTN_OK clicked', this.onOk);
        if(typeof this.onOk === 'function'){
          this.onOk();
        }
        this.close();
      });
      this._button_a = this.BTN_OK;

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('BTN_CANCEL clicked', this.onCancel);
        if(typeof this.onCancel === 'function'){
          this.onCancel();
        }
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.tGuiPanel.extent.top = 0;
      this.tGuiPanel.extent.left = 0;
      this.tGuiPanel.widget.position.z = 10;
      resolve();
    });
  }

  show() {
    super.show();
    this.recalculatePosition();
    this.LB_MESSAGE.updateList();
  }

  update(delta: number = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;
  }

  ShowTutorialMessage(id = 0, nth = 0) {
    console.log('ShowTutorialMessage', id, nth);
    if(GameState.TutorialWindowTracker[id]){
      return;
    }
    const row = GameState.TwoDAManager.datatables.get('tutorial').rows[id];
    if(!row){
      return;
    }
    
    const strRef = TwoDAObject.normalizeValue(row[(GameState.GameKey == GameEngineType.KOTOR ? 'message' : 'message_pc') + nth], 'number', 0);
    if(strRef <= 0){
      return;
    }

    this.LB_MESSAGE.extent.top = 0;
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(GameState.TLKManager.GetStringById(strRef).Value);
    const node = this.LB_MESSAGE.children[0];
    this.messageBoxHeight = node.textSize.y;
    this.LB_MESSAGE.extent.height = this.LB_MESSAGE.height = node.textSize.y;
    this.LB_MESSAGE.resizeControl();

    this.showCancel = false;
    this.showOk = true;
    this.resizeModal();

    this.onOk = () => {};
    this.onCancel = () => {};
    
    this.open();
  }

  showConfirmDialog(strRef = 0, onOk?: () => void, onCancel?: () => void) {
    console.log('showConfirmDialog', strRef);

    if(strRef <= 0){
      return;
    }

    this.LB_MESSAGE.extent.top = 0;
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(GameState.TLKManager.GetStringById(strRef).Value);
    const node = this.LB_MESSAGE.children[0];
    this.messageBoxHeight = node.textSize.y;
    this.LB_MESSAGE.extent.height = this.LB_MESSAGE.height = node.textSize.y;
    this.LB_MESSAGE.resizeControl();

    this.showCancel = true;//typeof onCancel === 'function';
    this.onCancel = typeof onCancel === 'function' ? onCancel : (() => {});
    this.showOk = typeof onOk === 'function';
    this.onOk = typeof onOk === 'function' ? onOk : (() => {});

    this.resizeModal();
    
    this.open();
  }

  fromStringRef(strRef: number){
    const tlkString = GameState.TLKManager.GetStringById(strRef);
    if(!tlkString){ return; }
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(tlkString.Value);
    const node = this.LB_MESSAGE.children[0];
    this.messageBoxHeight = node.textSize.y;
    this.LB_MESSAGE.extent.height = this.LB_MESSAGE.height = this.messageBoxHeight;
    this.LB_MESSAGE.resizeControl();
    this.showCancel = false;
    this.showOk = true;
    this.resizeModal();

    this.onOk = () => {};
    this.onCancel = () => {};
    
    this.open();
  }

  resizeModal(){
    this.BTN_CANCEL.hide();
    this.BTN_OK.hide();
    
    let buttonHeight = 0;
    if(this.showCancel){
      buttonHeight += 35;
    }
    if(this.showOk){
      buttonHeight += 35;
    }

    this.tGuiPanel.extent.height = this.height = buttonHeight + this.messageBoxHeight + 30;
    this.tGuiPanel.recalculate();

    this.LB_MESSAGE.extent.top = (-this.tGuiPanel.extent.height) + (this.LB_MESSAGE.extent.height) + buttonHeight + 40;// + (this.LB_MESSAGE.extent.height/2) + 28;
    this.LB_MESSAGE.recalculate();

    if(this.showOk){
      this.BTN_OK.show();
      this.BTN_OK.extent.top = (this.tGuiPanel.extent.height) - (this.BTN_OK.extent.height + 10);
      if(this.showCancel){
        this.BTN_OK.extent.top -= (this.BTN_CANCEL.extent.height + 20);
      }
    }

    if(this.showCancel){
      this.BTN_CANCEL.show();
      this.BTN_CANCEL.extent.top = (this.tGuiPanel.extent.height) - (this.BTN_CANCEL.extent.height + 20);
    }
    this.tGuiPanel.resizeControl();
  }
  
}
