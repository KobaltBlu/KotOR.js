import type { GUIListBox, GUIButton } from "../../../gui";
import { InGameConfirm as K1_InGameConfirm } from "../../kotor/KOTOR";

/**
 * InGameConfirm class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameConfirm.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameConfirm extends K1_InGameConfirm {

  declare LB_MESSAGE: GUIListBox;
  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'confirm_p';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.defaultExtent.width = this.tGuiPanel.extent.width;
      this.defaultExtent.height = this.tGuiPanel.extent.height;
      this.defaultExtent.top = this.tGuiPanel.extent.top;
      this.defaultExtent.left = this.tGuiPanel.extent.left;

      this.BTN_OK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close()
      });

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close()
      });

      this.tGuiPanel.extent.top = 0;
      this.tGuiPanel.extent.left = 0;
      this.tGuiPanel.widget.position.z = 10;
      resolve();
    });
  }

  update(delta: number) {
    super.update(delta);
  }
  
}
