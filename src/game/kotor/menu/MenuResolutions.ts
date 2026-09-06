import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { IScreenResolution } from "@/interface/graphics/IScreenResolution";

/**
 * MenuResolutions class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuResolutions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuResolutions extends GameMenu {

  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;
  LB_RESOLUTIONS: GUIListBox;
  LBL_RESOLUTION: GUILabel;

  activeResolution: IScreenResolution;
  supportedResolutions: IScreenResolution[] = [];

  constructor(){
    super();
    this.isOverlayGUI = true;
    this.gui_resref = 'optresolution';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
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
        this.activeResolution = res;
      }

      // optresolution.gui parks the dialog at design-canvas (150,126) ≈ centered on
      // 640×480. KotOR.js centers by panel size at widget (0,0); zero the GFF
      // origin so GetLocalMouseCoords / hit tests match (MenuContainer / InGameConfirm).
      this.tGuiPanel.extent.left = 0;
      this.tGuiPanel.extent.top = 0;

      resolve();
    });
  }

  show() {
    super.show();
    this.supportedResolutions = GameState.ResolutionManager.getSupportedResolutions();
    const current = GameState.ResolutionManager.screenResolution;
    let selectIndex = this.supportedResolutions.findIndex((res) =>
      res === current ||
      (res.isDynamicRes === current.isDynamicRes &&
        res.width === current.width &&
        res.height === current.height)
    );
    if(selectIndex < 0){
      selectIndex = 0;
    }
    this.activeResolution = this.supportedResolutions[selectIndex];
    this.LB_RESOLUTIONS.setItems(this.supportedResolutions, {
      selectIndex,
    });
    this.recalculatePosition();
  }
  
}
