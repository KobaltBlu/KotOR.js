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
        this.close();
      });
      this._button_a = this.BTN_OK;

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
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
    
    this.LB_MESSAGE.updateBounds();
    this.BTN_CANCEL.updateBounds();
    this.BTN_OK.updateBounds();
  }

  ShowTutorialMessage(id = 0, nth = 0) {
    console.log('ShowTutorialMessage', id, nth);
    if (!GameState.TutorialWindowTracker[id]) {
      const row = GameState.TwoDAManager.datatables.get('tutorial').rows[id];
      if(row){
        this.LB_MESSAGE.extent.top = 0;
        let tlkId = TwoDAObject.normalizeValue(row[(GameState.GameKey == GameEngineType.KOTOR ? 'message' : 'message_pc') + nth], 'number', 0);
        if(tlkId > 0){
          this.LB_MESSAGE.clearItems();
          this.LB_MESSAGE.addItem(GameState.TLKManager.GetStringById(tlkId).Value);
          let messageHeight = this.LB_MESSAGE.getNodeHeight(this.LB_MESSAGE.children[0]);
          console.log(messageHeight);
          this.LB_MESSAGE.extent.height = this.LB_MESSAGE.height = messageHeight;
          this.LB_MESSAGE.resizeControl();
          
          this.tGuiPanel.extent.height = this.height = 44 + messageHeight;
          // this.tGuiPanel.extent.left = 0;
          // this.tGuiPanel.extent.top = -this.tGuiPanel.extent.height/2;
          this.tGuiPanel.recalculate();

          this.LB_MESSAGE.extent.top = (-this.tGuiPanel.extent.height) + (this.LB_MESSAGE.extent.height) + 50;// + (this.LB_MESSAGE.extent.height/2) + 28;
          this.LB_MESSAGE.recalculate();

          this.BTN_CANCEL.hide();
          this.BTN_OK.extent.top = (this.tGuiPanel.extent.height) - (this.BTN_OK.extent.height + 10);// + ((this.LB_MESSAGE.extent.height/2) + 28 + (this.BTN_OK.extent.height/2));
          this.tGuiPanel.resizeControl();
          this.LB_MESSAGE.resizeControl();
          
          this.open();
          // GameState.TutorialWindowTracker[id] = 0;
        }
      }
    }
  }

  fromStringRef(strRef: number){
    const tlkString = GameState.TLKManager.GetStringById(strRef);
    if(!tlkString){ return; }
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(tlkString.Value);
    let messageHeight = this.LB_MESSAGE.getNodeHeight(this.LB_MESSAGE.children[0]);
    console.log(messageHeight);
    this.LB_MESSAGE.extent.height = this.LB_MESSAGE.height = messageHeight;
    this.LB_MESSAGE.resizeControl();
    
    this.tGuiPanel.extent.height = this.height = 44 + messageHeight;
    // this.tGuiPanel.extent.left = 0;
    // this.tGuiPanel.extent.top = -this.tGuiPanel.extent.height/2;
    this.tGuiPanel.recalculate();

    this.LB_MESSAGE.extent.top = (-this.tGuiPanel.extent.height) + (this.LB_MESSAGE.extent.height) + 50;// + (this.LB_MESSAGE.extent.height/2) + 28;
    this.LB_MESSAGE.recalculate();

    this.BTN_CANCEL.hide();
    this.BTN_OK.extent.top = (this.tGuiPanel.extent.height) - (this.BTN_OK.extent.height + 10);// + ((this.LB_MESSAGE.extent.height/2) + 28 + (this.BTN_OK.extent.height/2));
    this.tGuiPanel.resizeControl();
    this.LB_MESSAGE.resizeControl();
    
    this.open();
  }
  
}
