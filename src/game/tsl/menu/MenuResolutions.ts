import { GameState } from "../../../GameState";
import type { GUIButton, GUIListBox, GUILabel } from "../../../gui";
import { IScreenResolution } from "../../../interface/graphics/IScreenResolution";
import { MenuResolutions as K1_MenuResolutions } from "../../kotor/KOTOR";

/**
 * MenuResolutions class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuResolutions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuResolutions extends K1_MenuResolutions {

  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare LB_RESOLUTIONS: GUIListBox;
  declare LBL_RESOLUTION: GUILabel;

  constructor(){
    super();
    this.isOverlayGUI = true;
    this.gui_resref = 'optresolution_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.ResolutionManager.screenResolution = this.activeResolution;
        window.dispatchEvent(new Event('resize'));
        this.close();
      });

      this.LB_RESOLUTIONS.onSelected = (res: IScreenResolution) => {
        console.log('LB_RESOLUTIONS', res);
        this.activeResolution = res;
      }
      resolve();
    });
  }

  show() {
    super.show();
    this.supportedResolutions = GameState.ResolutionManager.getSupportedResolutions();
    this.activeResolution = this.supportedResolutions[0];
    this.LB_RESOLUTIONS.clearItems();

    for(let i = 0; i < this.supportedResolutions.length; i++){
      const res = this.supportedResolutions[i];
      this.LB_RESOLUTIONS.addItem( res );
    }

    this.LB_RESOLUTIONS.setSelectedIndex(this.supportedResolutions.indexOf(this.activeResolution));
    this.tGuiPanel.widget.position.z = 10;
  }
  
}
